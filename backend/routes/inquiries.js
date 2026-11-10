const express = require("express");
const router = express.Router();
const db = require("../db");
const { INQUIRY_CATEGORIES, INQUIRY_STATUSES } = require("../constants");
const { authenticateUser, requireContractor, requireManagerOrAdmin } = require("../middleware/auth");

function normalizeStatusBucket(statusStr) {
  const s = (statusStr || "").trim().toLowerCase();
  if (s === "resolved") return "resolved";
  if (s === "in progress" || s === "awaiting user response") return "inProgress";
  return "pending";
}

// 1. Submit a new Tender Inquiry (Contractors ONLY, with automatic State-Based Routing)
router.post("/", requireContractor, async (req, res) => {
  try {
    const {
      related_tender_id,
      inquiry_category,
      message,
      description,
      subject
    } = req.body;

    const tenderId = parseInt(related_tender_id, 10);
    const cleanCategory = (inquiry_category || "").trim();
    const cleanMessage = (message || description || "").trim();

    if (!tenderId || isNaN(tenderId)) {
      return res.status(400).json({ message: "Please select a related tender from the list." });
    }

    if (!cleanCategory || !INQUIRY_CATEGORIES.includes(cleanCategory)) {
      return res.status(400).json({
        message: `Invalid inquiry category. Must be one of: ${INQUIRY_CATEGORIES.join(", ")}.`
      });
    }

    if (!cleanMessage) {
      return res.status(400).json({ message: "Inquiry message cannot be empty." });
    }

    // Fetch selected tender and its state from DB
    const tender = await db.getAsync(
      "SELECT id, name, state, category, location FROM tenders WHERE id = ? LIMIT 1",
      [tenderId]
    );
    if (!tender) {
      return res.status(404).json({ message: "Selected tender does not exist in the active catalog." });
    }

    const tenderState = (tender.state || "").trim();

    // Auto-fetch authenticated contractor's details directly from DB
    const contractor = req.user;
    const senderName = contractor.name || contractor.username;
    const senderEmail = contractor.email;
    const orgName = contractor.company || "Independent Contractor";

    // Find approved & active manager assigned to that state
    const approvedManager = tenderState
      ? await db.getAsync(
          `SELECT id, name, username, user_code, email, office_state
           FROM users
           WHERE LOWER(role) = 'manager'
             AND LOWER(office_state) = LOWER(?)
             AND approval_status = 'Approved'
             AND is_active = 1
           ORDER BY id ASC LIMIT 1`,
          [tenderState]
        )
      : null;

    const assignedManagerId = approvedManager ? approvedManager.id : null;
    const assignmentStatus = approvedManager ? "Assigned" : "Unassigned / Pending Admin Assignment";
    const assignedTo = approvedManager ? (approvedManager.user_code || approvedManager.name) : "admin";

    // Generate deterministic unique ticket number using MAX(id)
    const maxRow = await db.getAsync("SELECT MAX(id) AS maxId FROM inquiries");
    const nextNum = ((maxRow && maxRow.maxId ? maxRow.maxId : 0) + 1).toString().padStart(3, "0");
    const ticketNumber = `TKT-2026-${nextNum}`;

    const finalSubject = (subject && subject.trim())
      ? subject.trim()
      : `${cleanCategory} — ${tender.name.slice(0, 75)}`;

    const insertRes = await db.queryAsync(
      `INSERT INTO inquiries (
        ticket_number, sender_user_id, sender_role, organization_name,
        sender_name, sender_email, contact_number, inquiry_category,
        related_tender_id, state, assigned_manager_id, assignment_status,
        subject, description, assigned_to, priority, status,
        created_at, updated_at, demo_record
      ) VALUES (?, ?, 'Contractor', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'Medium', 'Pending', datetime('now'), datetime('now'), 0)`,
      [
        ticketNumber,
        contractor.id,
        orgName,
        senderName,
        senderEmail,
        cleanCategory,
        tender.id,
        tenderState,
        assignedManagerId,
        assignmentStatus,
        finalSubject,
        cleanMessage,
        assignedTo
      ]
    );

    const inquiryId = insertRes.insertId;

    await db.queryAsync(
      `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
       VALUES (?, ?, 'Contractor', ?, datetime('now'))`,
      [inquiryId, contractor.id, cleanMessage]
    );

    // Notify contractor
    await db.queryAsync(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [
        contractor.id,
        `Inquiry Registered (${ticketNumber})`,
        approvedManager
          ? `Your inquiry on "${tender.name.slice(0, 50)}" (${tenderState}) was routed to ${approvedManager.name} (${tenderState} Manager).`
          : `Your inquiry on "${tender.name.slice(0, 50)}" (${tenderState || "N/A"}) was logged as Unassigned / Pending Admin Assignment.`
      ]
    );

    // Notify assigned state manager OR Central Admin if unassigned
    if (approvedManager) {
      await db.queryAsync(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [
          approvedManager.id,
          `New ${tenderState} Inquiry (${ticketNumber})`,
          `${senderName} (${orgName}) submitted a ${cleanCategory} inquiry for "${tender.name.slice(0, 55)}".`
        ]
      );
    } else {
      const adminUser = await db.getAsync("SELECT id FROM users WHERE LOWER(role) = 'admin' LIMIT 1");
      if (adminUser) {
        await db.queryAsync(
          "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
          [
            adminUser.id,
            `Unassigned Inquiry (${ticketNumber})`,
            `No approved manager exists for ${tenderState || "unknown state"}. Inquiry from ${senderName} requires Central Admin review.`
          ]
        );
      }
    }

    db.logActivity({
      actor_user_id: contractor.id,
      actor_role: "contractor",
      action_type: "inquiry_submitted",
      entity_type: "inquiry",
      entity_id: inquiryId,
      state: tenderState,
      details: approvedManager
        ? `Inquiry ${ticketNumber} (${cleanCategory}) routed to ${tenderState} Manager (${approvedManager.name})`
        : `Inquiry ${ticketNumber} (${cleanCategory}) logged as Unassigned / Pending Admin Assignment (${tenderState})`
    });

    return res.status(201).json({
      success: true,
      ticket_number: ticketNumber,
      inquiry_id: inquiryId,
      state: tenderState,
      assignment_status: assignmentStatus,
      assigned_manager_id: assignedManagerId,
      assigned_manager_name: approvedManager ? approvedManager.name : null,
      status: "Pending",
      message: approvedManager
        ? `Inquiry ${ticketNumber} submitted and automatically routed to the ${tenderState} Manager (${approvedManager.name}).`
        : `Inquiry ${ticketNumber} submitted and stored as Unassigned / Pending Admin Assignment (no approved manager for ${tenderState}).`
    });
  } catch (err) {
    console.error("Inquiry creation error:", err);
    return res.status(500).json({ message: err.message || "Failed to submit inquiry." });
  }
});

// 2. Get inquiries submitted by current authenticated contractor
router.get("/mine", requireContractor, async (req, res) => {
  try {
    const rows = await db.queryAsync(
      `SELECT
        i.*,
        t.name AS tender_name,
        t.category AS tender_category,
        t.state AS tender_state,
        m.name AS assigned_manager_name,
        m.office_state AS assigned_manager_state,
        (SELECT COUNT(*) FROM inquiry_messages msg WHERE msg.inquiry_id = i.id) AS message_count,
        (SELECT MAX(created_at) FROM inquiry_messages msg WHERE msg.inquiry_id = i.id) AS last_activity_at,
        (SELECT message_body FROM inquiry_messages msg WHERE msg.inquiry_id = i.id AND LOWER(msg.sender_role) IN ('manager', 'admin') ORDER BY msg.id DESC LIMIT 1) AS latest_response
       FROM inquiries i
       LEFT JOIN tenders t ON i.related_tender_id = t.id
       LEFT JOIN users m ON i.assigned_manager_id = m.id
       WHERE i.sender_user_id = ?
       ORDER BY i.created_at DESC, i.id DESC`,
      [req.user.id]
    );

    let pending = 0;
    let inProgress = 0;
    let resolved = 0;
    rows.forEach((r) => {
      const b = normalizeStatusBucket(r.status);
      if (b === "resolved") resolved++;
      else if (b === "inProgress") inProgress++;
      else pending++;
    });

    return res.json({
      summary: {
        totalTickets: rows.length,
        pending,
        inProgress,
        resolved,
        awaitingAdmin: pending,
        adminReplied: inProgress
      },
      tickets: rows
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Get specific inquiry with conversation thread (Strict role & state isolation)
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const user = req.user;

    const ticket = await db.getAsync(
      `SELECT
        i.*,
        t.name AS tender_name,
        t.category AS tender_category,
        t.department AS tender_authority,
        t.location AS tender_location,
        t.state AS tender_state,
        t.deadline AS tender_deadline,
        m.name AS assigned_manager_name,
        m.office_state AS assigned_manager_state
       FROM inquiries i
       LEFT JOIN tenders t ON i.related_tender_id = t.id
       LEFT JOIN users m ON i.assigned_manager_id = m.id
       WHERE i.id = ? OR i.ticket_number = ?
       LIMIT 1`,
      [inquiryId, inquiryId]
    );

    if (!ticket) {
      return res.status(404).json({ message: "Inquiry ticket not found." });
    }

    if (user.role === "contractor" && ticket.sender_user_id !== user.id) {
      return res.status(403).json({ message: "Access denied. You can only view your own inquiries." });
    }

    if (user.role === "manager") {
      const sameManager = ticket.assigned_manager_id === user.id;
      const sameState = (ticket.state || "").toLowerCase() === (user.office_state || "").toLowerCase();
      if (!sameManager || !sameState) {
        return res.status(403).json({
          message: "Access denied. You can only access inquiries assigned to your state."
        });
      }
    }

    const messages = await db.queryAsync(
      `SELECT m.*, u.name AS sender_name_cached, u.username AS sender_username, u.office_state AS sender_office_state
       FROM inquiry_messages m
       LEFT JOIN users u ON m.sender_user_id = u.id
       WHERE m.inquiry_id = ?
       ORDER BY m.created_at ASC, m.id ASC`,
      [ticket.id]
    );

    return res.json({ ticket, messages: messages || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Send a reply/follow-up message on an inquiry thread
router.post("/:id/messages", authenticateUser, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const { message_body, new_status, status } = req.body;
    const user = req.user;

    if (!message_body || !message_body.trim()) {
      return res.status(400).json({ message: "Message body cannot be empty." });
    }

    const ticket = await db.getAsync(
      "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
      [inquiryId, inquiryId]
    );
    if (!ticket) {
      return res.status(404).json({ message: "Inquiry ticket not found." });
    }

    if (user.role === "contractor" && ticket.sender_user_id !== user.id) {
      return res.status(403).json({ message: "Access denied. You cannot reply to another contractor's inquiry." });
    }

    if (user.role === "manager") {
      const sameManager = ticket.assigned_manager_id === user.id;
      const sameState = (ticket.state || "").toLowerCase() === (user.office_state || "").toLowerCase();
      if (!sameManager || !sameState) {
        return res.status(403).json({
          message: "Access denied. You cannot reply to inquiries outside your assigned state."
        });
      }
    }

    const messageSenderRole =
      user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "Contractor";

    const msgRes = await db.queryAsync(
      `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [ticket.id, user.id, messageSenderRole, message_body.trim()]
    );

    let updatedStatus = ticket.status;
    let resolvedAt = ticket.resolved_at;
    const requestedStatus = new_status || status;

    if (user.role === "manager" || user.role === "admin") {
      if (requestedStatus && INQUIRY_STATUSES.includes(requestedStatus)) {
        updatedStatus = requestedStatus;
      } else if (normalizeStatusBucket(ticket.status) === "pending") {
        updatedStatus = "In Progress";
      }
      resolvedAt = updatedStatus === "Resolved"
        ? new Date().toISOString().replace("T", " ").substring(0, 19)
        : null;
    } else {
      if (ticket.status === "Resolved") {
        updatedStatus = "In Progress";
        resolvedAt = null;
      }
    }

    await db.queryAsync(
      `UPDATE inquiries SET status = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [updatedStatus, resolvedAt, ticket.id]
    );

    if (user.role === "manager" || user.role === "admin") {
      await db.queryAsync(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [
          ticket.sender_user_id,
          `${user.role === "manager" ? `${user.office_state} Manager` : "Central Admin"} Responded (${ticket.ticket_number})`,
          `${user.name}: "${message_body.trim().slice(0, 90)}"`
        ]
      );

      db.logActivity({
        actor_user_id: user.id,
        actor_role: user.role,
        action_type: "inquiry_replied",
        entity_type: "inquiry",
        entity_id: ticket.id,
        state: ticket.state,
        details: `${user.role === "manager" ? `${user.office_state} Manager` : "Admin"} responded to ${ticket.ticket_number} (Status: ${updatedStatus})`
      });
    } else if (ticket.assigned_manager_id) {
      await db.queryAsync(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [
          ticket.assigned_manager_id,
          `Contractor Follow-Up (${ticket.ticket_number})`,
          `${user.name} replied on ${ticket.ticket_number}: "${message_body.trim().slice(0, 80)}"`
        ]
      );
    }

    return res.json({
      success: true,
      message: "Message sent successfully.",
      message_id: msgRes.insertId,
      updated_status: updatedStatus
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Update status on inquiry (Assigned State Manager or Central Admin)
router.patch("/:id/status", requireManagerOrAdmin, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const { status } = req.body;

    if (!status || !INQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${INQUIRY_STATUSES.join(", ")}.` });
    }

    const ticket = await db.getAsync(
      "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
      [inquiryId, inquiryId]
    );
    if (!ticket) {
      return res.status(404).json({ message: "Inquiry ticket not found." });
    }

    if (req.user.role === "manager") {
      const sameManager = ticket.assigned_manager_id === req.user.id;
      const sameState = (ticket.state || "").toLowerCase() === (req.user.office_state || "").toLowerCase();
      if (!sameManager || !sameState) {
        return res.status(403).json({
          message: "Access denied. You cannot modify inquiries outside your assigned state."
        });
      }
    }

    const resolvedAt = status === "Resolved"
      ? new Date().toISOString().replace("T", " ").substring(0, 19)
      : null;

    await db.queryAsync(
      "UPDATE inquiries SET status = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?",
      [status, resolvedAt, ticket.id]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      action_type: "inquiry_status_updated",
      entity_type: "inquiry",
      entity_id: ticket.id,
      state: ticket.state,
      details: `Inquiry ${ticket.ticket_number} status updated to "${status}"`
    });

    return res.json({ success: true, status, message: `Inquiry status updated to "${status}".` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Reopen a resolved inquiry (Owner contractor, assigned manager, or Admin)
router.patch("/:id/reopen", authenticateUser, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const user = req.user;

    const ticket = await db.getAsync(
      "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
      [inquiryId, inquiryId]
    );
    if (!ticket) {
      return res.status(404).json({ message: "Inquiry ticket not found." });
    }

    if (user.role === "contractor" && ticket.sender_user_id !== user.id) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (
      user.role === "manager" &&
      (ticket.assigned_manager_id !== user.id || (ticket.state || "").toLowerCase() !== (user.office_state || "").toLowerCase())
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    await db.queryAsync(
      "UPDATE inquiries SET status = 'In Progress', resolved_at = NULL, updated_at = datetime('now') WHERE id = ?",
      [ticket.id]
    );

    const roleLabel = user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "Contractor";
    await db.queryAsync(
      `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [ticket.id, user.id, roleLabel, "[Action] Inquiry reopened for further assistance."]
    );

    return res.json({ success: true, message: `Inquiry ${ticket.ticket_number} has been reopened.` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
