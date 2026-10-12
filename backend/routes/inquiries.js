const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = "student_secret_key_12345";

// Middleware to check if user is logged in
function checkAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. Please login first." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Session expired. Please login again." });
    }
    req.user = decoded;
    next();
  });
}

// Middleware strictly for main website Admin (excludes ordinary managers and contractors)
function checkAdminOnly(req, res, next) {
  checkAuth(req, res, () => {
    const roleLower = (req.user.role || "").toLowerCase();
    if (roleLower !== "admin") {
      return res.status(403).json({
        message: "Access denied. Main Administrator privileges required. Managers and contractors cannot access the central helpdesk queue."
      });
    }
    next();
  });
}

// -------------------------------------------------------------
// SENDER & USER ENDPOINTS (Contractors & Managers)
// -------------------------------------------------------------

// 1. Submit a new Inquiry (Contractors or Managers)
router.post("/", checkAuth, (req, res) => {
  const {
    subject,
    description,
    inquiry_category,
    related_tender_id,
    contact_number,
    organization_name
  } = req.body;

  if (!subject || !subject.trim() || !description || !description.trim() || !inquiry_category) {
    return res.status(400).json({ message: "Subject, classification category, and description are required." });
  }

  // Fetch full verified profile for authenticated user
  db.query(
    "SELECT id, username, email, role, name, company, department FROM users WHERE id = ? LIMIT 1",
    [req.user.id],
    (userErr, userRows) => {
      if (userErr) return res.status(500).json({ message: userErr.message });
      if (!userRows || userRows.length === 0) return res.status(404).json({ message: "User account not found." });

      const user = userRows[0];
      const roleCapitalized = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
      const org = organization_name || user.company || user.department || "Independent";
      const senderName = user.name || user.username;
      const senderEmail = user.email;

      // Generate deterministic unique ticket number: TKT-2026-XXX
      db.query("SELECT COUNT(*) as count FROM inquiries", [], (countErr, countRows) => {
        if (countErr) return res.status(500).json({ message: countErr.message });

        const count = (countRows[0] && countRows[0].count) || 0;
        const nextNum = (count + 1).toString().padStart(3, "0");
        const ticketNumber = `TKT-2026-${nextNum}`;

        const tenderId = related_tender_id ? parseInt(related_tender_id, 10) : null;

        db.query(
          `INSERT INTO inquiries (
            ticket_number, sender_user_id, sender_role, organization_name,
            sender_name, sender_email, contact_number, inquiry_category,
            related_tender_id, subject, description, assigned_to,
            priority, status, created_at, updated_at, demo_record
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'Medium', 'New', datetime('now'), datetime('now'), 0)`,
          [
            ticketNumber, user.id, roleCapitalized, org,
            senderName, senderEmail, contact_number || null, inquiry_category,
            tenderId, subject.trim(), description.trim()
          ],
          (insertErr, insertRes) => {
            if (insertErr) return res.status(500).json({ message: insertErr.message });

            const inquiryId = insertRes.insertId;

            // Insert the initial message into conversation thread
            db.query(
              `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
               VALUES (?, ?, ?, ?, datetime('now'))`,
              [inquiryId, user.id, roleCapitalized, description.trim()],
              (msgErr) => {
                if (msgErr) console.warn("Could not insert initial message:", msgErr.message);

                // Add confirmation notification
                db.query(
                  `INSERT INTO notifications (user_id, title, message)
                   VALUES (?, ?, ?)`,
                  [
                    user.id,
                    `Helpdesk Ticket Registered (${ticketNumber})`,
                    `Your inquiry "${subject.trim()}" has been dispatched to TenderKart Central Admin.`
                  ],
                  () => {}
                );

                return res.status(201).json({
                  success: true,
                  ticket_number: ticketNumber,
                  inquiry_id: inquiryId,
                  message: `Helpdesk inquiry ${ticketNumber} created successfully and assigned to Central Admin.`
                });
              }
            );
          }
        );
      });
    }
  );
});

// 2. Get tickets submitted by current authenticated user (Contractor or Manager)
router.get("/mine", checkAuth, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      i.*,
      t.name AS tender_name,
      t.category AS tender_category,
      (SELECT COUNT(*) FROM inquiry_messages m WHERE m.inquiry_id = i.id) AS message_count,
      (SELECT MAX(created_at) FROM inquiry_messages m WHERE m.inquiry_id = i.id) AS last_activity_at
    FROM inquiries i
    LEFT JOIN tenders t ON i.related_tender_id = t.id
    WHERE i.sender_user_id = ?
    ORDER BY i.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });

    const totalTickets = rows.length;
    let awaitingAdmin = 0;
    let adminReplied = 0;
    let resolved = 0;

    rows.forEach(t => {
      const st = (t.status || "").toLowerCase();
      if (st === "resolved") {
        resolved++;
      } else if (st === "awaiting user response") {
        adminReplied++;
      } else {
        awaitingAdmin++;
      }
    });

    return res.json({
      summary: {
        totalTickets,
        awaitingAdmin,
        adminReplied,
        resolved
      },
      tickets: rows
    });
  });
});

// 3. Get specific ticket with conversation thread
router.get("/:id", checkAuth, (req, res) => {
  const inquiryId = req.params.id;
  const user = req.user;
  const roleLower = (user.role || "").toLowerCase();

  const ticketSql = `
    SELECT 
      i.*,
      t.name AS tender_name,
      t.category AS tender_category,
      t.department AS tender_authority,
      t.location AS tender_location,
      t.deadline AS tender_deadline
    FROM inquiries i
    LEFT JOIN tenders t ON i.related_tender_id = t.id
    WHERE i.id = ? OR i.ticket_number = ?
    LIMIT 1
  `;

  db.query(ticketSql, [inquiryId, inquiryId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Helpdesk ticket not found." });

    const ticket = rows[0];

    // Authorization & isolation check
    if (roleLower !== "admin" && ticket.sender_user_id !== user.id) {
      return res.status(403).json({
        message: "Access denied. You can only view and manage your own helpdesk tickets."
      });
    }

    // Fetch chronological messages
    db.query(
      `SELECT m.*, u.name AS sender_name_cached, u.username AS sender_username
       FROM inquiry_messages m
       LEFT JOIN users u ON m.sender_user_id = u.id
       WHERE m.inquiry_id = ?
       ORDER BY m.created_at ASC`,
      [ticket.id],
      (msgErr, messages) => {
        if (msgErr) return res.status(500).json({ message: msgErr.message });

        return res.json({
          ticket,
          messages: messages || []
        });
      }
    );
  });
});

// 4. Send a follow-up reply message to a ticket
router.post("/:id/messages", checkAuth, (req, res) => {
  const inquiryId = req.params.id;
  const { message_body, new_status, new_priority } = req.body;
  const user = req.user;
  const roleLower = (user.role || "").toLowerCase();

  if (!message_body || !message_body.trim()) {
    return res.status(400).json({ message: "Message body cannot be empty." });
  }

  db.query(
    "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
    [inquiryId, inquiryId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows || rows.length === 0) return res.status(404).json({ message: "Ticket not found." });

      const ticket = rows[0];

      // Security check: Only Admin or the ticket's owner can reply
      if (roleLower !== "admin" && ticket.sender_user_id !== user.id) {
        return res.status(403).json({
          message: "Access denied. You cannot reply to another user's ticket."
        });
      }

      // Determine sender role strictly
      const isSenderAdmin = roleLower === "admin";
      const messageSenderRole = isSenderAdmin ? "Admin" : ticket.sender_role;

      db.query(
        `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [ticket.id, user.id, messageSenderRole, message_body.trim()],
        (msgErr, msgRes) => {
          if (msgErr) return res.status(500).json({ message: msgErr.message });

          // Update ticket status & timestamps
          let updatedStatus = ticket.status;
          let updatedPriority = ticket.priority;
          let resolvedAt = ticket.resolved_at;

          if (isSenderAdmin) {
            if (new_status) updatedStatus = new_status;
            else if (ticket.status === "New") updatedStatus = "In Progress";

            if (new_priority) updatedPriority = new_priority;

            if (updatedStatus === "Resolved") {
              resolvedAt = new Date().toISOString().replace("T", " ").substring(0, 19);
            } else {
              resolvedAt = null;
            }
          } else {
            // User reply: if awaiting user response, flip to In Progress
            if (ticket.status === "Awaiting User Response") {
              updatedStatus = "In Progress";
            } else if (ticket.status === "Resolved") {
              // Reopening ticket
              updatedStatus = "In Progress";
              resolvedAt = null;
            }
          }

          db.query(
            `UPDATE inquiries
             SET status = ?, priority = ?, resolved_at = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [updatedStatus, updatedPriority, resolvedAt, ticket.id],
            (updateErr) => {
              if (updateErr) return res.status(500).json({ message: updateErr.message });

              // Send in-app notification to the other party
              const notifyTargetId = isSenderAdmin ? ticket.sender_user_id : null;
              if (notifyTargetId) {
                db.query(
                  `INSERT INTO notifications (user_id, title, message)
                   VALUES (?, ?, ?)`,
                  [
                    notifyTargetId,
                    `Admin Replied to Ticket ${ticket.ticket_number}`,
                    `Central Admin has responded: "${message_body.trim().slice(0, 80)}..."`
                  ],
                  () => {}
                );
              }

              return res.json({
                success: true,
                message: "Message dispatched successfully.",
                message_id: msgRes.insertId,
                updated_status: updatedStatus,
                updated_priority: updatedPriority
              });
            }
          );
        }
      );
    }
  );
});

// 5. Reopen a resolved ticket
router.patch("/:id/reopen", checkAuth, (req, res) => {
  const inquiryId = req.params.id;
  const user = req.user;
  const roleLower = (user.role || "").toLowerCase();

  db.query(
    "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
    [inquiryId, inquiryId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows || rows.length === 0) return res.status(404).json({ message: "Ticket not found." });

      const ticket = rows[0];
      if (roleLower !== "admin" && ticket.sender_user_id !== user.id) {
        return res.status(403).json({ message: "Access denied." });
      }

      db.query(
        `UPDATE inquiries
         SET status = 'In Progress', resolved_at = NULL, updated_at = datetime('now')
         WHERE id = ?`,
        [ticket.id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: updateErr.message });

          // Post a system note in conversation
          db.query(
            `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [ticket.id, user.id, roleLower === "admin" ? "Admin" : ticket.sender_role, "[Action] Ticket reopened for further assistance."],
            () => {}
          );

          return res.json({ success: true, message: `Ticket ${ticket.ticket_number} has been reopened.` });
        }
      );
    }
  );
});

// -------------------------------------------------------------
// CENTRAL ADMIN QUEUE ENDPOINTS (Role 'admin' ONLY)
// -------------------------------------------------------------

// 6. Get Central Helpdesk Queue (All inquiries from Contractors and Managers)
router.get("/admin/all", checkAdminOnly, (req, res) => {
  const { role, category, status, priority, search } = req.query;

  let baseSql = `
    SELECT 
      i.*,
      t.name AS tender_name,
      t.category AS tender_category,
      (SELECT COUNT(*) FROM inquiry_messages m WHERE m.inquiry_id = i.id) AS message_count,
      (SELECT MAX(created_at) FROM inquiry_messages m WHERE m.inquiry_id = i.id) AS last_activity_at
    FROM inquiries i
    LEFT JOIN tenders t ON i.related_tender_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    baseSql += " AND LOWER(i.sender_role) = LOWER(?)";
    params.push(role);
  }
  if (category) {
    baseSql += " AND i.inquiry_category = ?";
    params.push(category);
  }
  if (status) {
    baseSql += " AND LOWER(i.status) = LOWER(?)";
    params.push(status);
  }
  if (priority) {
    baseSql += " AND LOWER(i.priority) = LOWER(?)";
    params.push(priority);
  }
  if (search) {
    baseSql += " AND (i.ticket_number LIKE ? OR i.sender_name LIKE ? OR i.sender_email LIKE ? OR i.subject LIKE ? OR i.organization_name LIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term);
  }

  baseSql += " ORDER BY i.created_at DESC";

  db.query(baseSql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });

    // Fetch summary breakdown of ALL inquiries in the database
    db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN LOWER(status) = 'new' THEN 1 ELSE 0 END) AS count_new,
        SUM(CASE WHEN LOWER(status) = 'in progress' THEN 1 ELSE 0 END) AS count_in_progress,
        SUM(CASE WHEN LOWER(status) = 'awaiting user response' THEN 1 ELSE 0 END) AS count_awaiting_user,
        SUM(CASE WHEN LOWER(status) = 'resolved' THEN 1 ELSE 0 END) AS count_resolved
       FROM inquiries`,
      [],
      (sumErr, sumRows) => {
        if (sumErr) return res.status(500).json({ message: sumErr.message });

        const s = sumRows[0] || {};
        return res.json({
          summary: {
            totalInquiries: s.total || 0,
            countNew: s.count_new || 0,
            countInProgress: s.count_in_progress || 0,
            countAwaitingUser: s.count_awaiting_user || 0,
            countResolved: s.count_resolved || 0
          },
          inquiries: rows || []
        });
      }
    );
  });
});

// 7. Admin updates priority and/or status of an inquiry
router.patch("/admin/:id", checkAdminOnly, (req, res) => {
  const inquiryId = req.params.id;
  const { status, priority } = req.body;

  db.query(
    "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
    [inquiryId, inquiryId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows || rows.length === 0) return res.status(404).json({ message: "Ticket not found." });

      const ticket = rows[0];
      const newStatus = status || ticket.status;
      const newPriority = priority || ticket.priority;
      let resolvedAt = ticket.resolved_at;

      if (newStatus === "Resolved") {
        resolvedAt = new Date().toISOString().replace("T", " ").substring(0, 19);
      } else {
        resolvedAt = null;
      }

      db.query(
        `UPDATE inquiries 
         SET status = ?, priority = ?, resolved_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [newStatus, newPriority, resolvedAt, ticket.id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: updateErr.message });

          return res.json({
            success: true,
            message: `Ticket ${ticket.ticket_number} updated to status "${newStatus}" and priority "${newPriority}".`,
            ticket: {
              ...ticket,
              status: newStatus,
              priority: newPriority,
              resolved_at: resolvedAt
            }
          });
        }
      );
    }
  );
});

// 8. Admin direct reply to an inquiry
router.post("/admin/:id/reply", checkAdminOnly, (req, res) => {
  const inquiryId = req.params.id;
  const { message_body, status, priority } = req.body;

  if (!message_body || !message_body.trim()) {
    return res.status(400).json({ message: "Admin reply body cannot be empty." });
  }

  db.query(
    "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
    [inquiryId, inquiryId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows || rows.length === 0) return res.status(404).json({ message: "Ticket not found." });

      const ticket = rows[0];
      const newStatus = status || "Awaiting User Response";
      const newPriority = priority || ticket.priority;
      const resolvedAt = (newStatus === "Resolved") ? new Date().toISOString().replace("T", " ").substring(0, 19) : null;

      db.query(
        `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
         VALUES (?, ?, 'Admin', ?, datetime('now'))`,
        [ticket.id, req.user.id, message_body.trim()],
        (msgErr, msgRes) => {
          if (msgErr) return res.status(500).json({ message: msgErr.message });

          db.query(
            `UPDATE inquiries
             SET status = ?, priority = ?, resolved_at = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [newStatus, newPriority, resolvedAt, ticket.id],
            (updateErr) => {
              if (updateErr) return res.status(500).json({ message: updateErr.message });

              // Notify the original contractor / manager
              db.query(
                `INSERT INTO notifications (user_id, title, message)
                 VALUES (?, ?, ?)`,
                [
                  ticket.sender_user_id,
                  `Official Admin Response on Ticket ${ticket.ticket_number}`,
                  `Central Admin: "${message_body.trim().slice(0, 90)}..."`
                ],
                () => {}
              );

              return res.json({
                success: true,
                message: "Admin response saved and dispatched to sender dashboard.",
                message_id: msgRes.insertId,
                status: newStatus,
                priority: newPriority
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
