// backend/routes/manager.js
// Dedicated State-Wise Manager API with strict state isolation and 12-tender cap enforcement

const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  ALLOWED_CATEGORIES,
  TENDER_STATUSES,
  INQUIRY_STATUSES,
  ALL_APPLICATION_STATUSES,
  mapApplicationOutcome,
  summarizeApplications,
  MAX_DEMO_TENDERS
} = require("../constants");
const { requireManager } = require("../middleware/auth");

// All endpoints require an Approved & Active Manager with a valid assigned office_state
router.use(requireManager);

// 1. GET /api/manager/dashboard - State-specific operational metrics
router.get("/dashboard", async (req, res) => {
  try {
    const state = req.user.office_state;

    const totalPlatformRow = await db.getAsync("SELECT COUNT(*) AS count FROM tenders");
    const stateTenderStats = await db.getAsync(
      `SELECT COUNT(*) AS count, COALESCE(SUM(budget), 0) AS totalBudget, COALESCE(SUM(views_count), 0) AS totalViews
       FROM tenders WHERE LOWER(state) = LOWER(?)`,
      [state]
    );
    const stateSavedRow = await db.getAsync(
      `SELECT COUNT(*) AS count FROM saved_tenders s
       JOIN tenders t ON s.tender_id = t.id
       WHERE LOWER(t.state) = LOWER(?)`,
      [state]
    );
    const appRows = await db.queryAsync(
      `SELECT a.application_status, a.outcome, a.contractor_id
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       WHERE LOWER(t.state) = LOWER(?)`,
      [state]
    );
    const inqRows = await db.queryAsync(
      `SELECT status FROM inquiries WHERE LOWER(state) = LOWER(?) AND assigned_manager_id = ?`,
      [state, req.user.id]
    );
    const recentActivity = await db.queryAsync(
      `SELECT al.*, u.name AS actor_name
       FROM activity_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       WHERE LOWER(al.state) = LOWER(?)
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT 10`,
      [state]
    );

    const appSummary = summarizeApplications(appRows);
    const contractorIds = new Set(appRows.map((a) => a.contractor_id));

    const inqSummary = { total: inqRows.length, pending: 0, inProgress: 0, resolved: 0 };
    inqRows.forEach((i) => {
      const s = (i.status || "").toLowerCase();
      if (s === "resolved") inqSummary.resolved++;
      else if (s === "in progress" || s === "awaiting user response") inqSummary.inProgress++;
      else inqSummary.pending++;
    });

    return res.json({
      assignedState: state,
      manager: {
        id: req.user.id,
        name: req.user.name,
        user_code: req.user.user_code,
        email: req.user.email,
        office_state: state
      },
      platformTendersCount: totalPlatformRow ? totalPlatformRow.count : 0,
      maxPlatformTenders: MAX_DEMO_TENDERS,
      stateTendersCount: stateTenderStats ? stateTenderStats.count : 0,
      stateBudgetTotal: stateTenderStats ? stateTenderStats.totalBudget : 0,
      stateViewsCount: stateTenderStats ? stateTenderStats.totalViews : 0,
      stateSavedCount: stateSavedRow ? stateSavedRow.count : 0,
      activeContractorsCount: contractorIds.size,
      applicationsSummary: appSummary,
      inquiriesSummary: inqSummary,
      recentActivity
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. GET /api/manager/tenders - Tenders belonging ONLY to manager's assigned state
router.get("/tenders", async (req, res) => {
  try {
    const state = req.user.office_state;
    const rows = await db.queryAsync(
      `SELECT t.*,
        (SELECT COUNT(*) FROM applications a WHERE a.tender_id = t.id) AS applications_count,
        (SELECT COUNT(*) FROM saved_tenders s WHERE s.tender_id = t.id) AS saved_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.related_tender_id = t.id) AS inquiries_count
       FROM tenders t
       WHERE LOWER(t.state) = LOWER(?)
       ORDER BY t.id ASC`,
      [state]
    );

    const tenders = rows.map((t) => {
      try {
        t.required_documents = JSON.parse(t.required_documents || "[]");
      } catch (e) {
        t.required_documents = [];
      }
      return t;
    });

    return res.json({ assignedState: state, tenders });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. POST /api/manager/tenders - Add a tender in assigned state (enforces 12-tender platform limit)
router.post("/tenders", async (req, res) => {
  try {
    const state = req.user.office_state;
    const {
      name,
      department,
      category,
      budget,
      location,
      deadline,
      status,
      eligibility,
      required_documents,
      description,
      source_url,
      state: bodyState
    } = req.body;

    // Prevent managers from specifying or changing to another state
    if (bodyState && bodyState.trim().toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({
        message: `Access denied. As the ${state} Manager, you can only create tenders within ${state}.`
      });
    }

    // Strict 12-tender platform limit enforcement
    const countRow = await db.getAsync("SELECT COUNT(*) AS count FROM tenders");
    if (countRow && countRow.count >= MAX_DEMO_TENDERS) {
      return res.status(400).json({
        code: "TENDER_LIMIT_REACHED",
        message: `Cannot create a 13th tender: TenderKart is strictly limited to ${MAX_DEMO_TENDERS} demonstration tenders (${countRow.count}/${MAX_DEMO_TENDERS} active). You may edit existing tenders in ${state} instead.`
      });
    }

    if (!name || !department || !category || !budget || !location || !deadline || !eligibility || !description) {
      return res.status(400).json({ message: "All required tender fields must be completed." });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `Invalid category. Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}.`
      });
    }

    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      return res.status(400).json({ message: "Budget must be a positive number." });
    }

    const dup = await db.getAsync(
      "SELECT id FROM tenders WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
      [name]
    );
    if (dup) {
      return res.status(409).json({ message: "A tender with this exact title already exists. Duplicate tenders are not permitted." });
    }

    const cleanStatus = status && TENDER_STATUSES.includes(status) ? status : "Open";
    const docString = Array.isArray(required_documents)
      ? JSON.stringify(required_documents)
      : JSON.stringify(
          typeof required_documents === "string"
            ? required_documents.split(",").map((d) => d.trim()).filter(Boolean)
            : []
        );

    const locWithState = location.toLowerCase().includes(state.toLowerCase())
      ? location.trim()
      : `${location.trim()}, ${state}`;

    const result = await db.queryAsync(
      `INSERT INTO tenders (name, department, category, budget, location, state, deadline, status, eligibility, required_documents, description, source_url, created_by, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        name.trim(),
        department.trim(),
        category,
        parsedBudget,
        locWithState,
        state,
        deadline,
        cleanStatus,
        eligibility.trim(),
        docString,
        description.trim(),
        source_url || "https://eprocure.gov.in/eprocure/app",
        req.user.id,
        req.user.id
      ]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "manager",
      action_type: "tender_created",
      entity_type: "tender",
      entity_id: result.insertId,
      state,
      details: `${state} Manager (${req.user.name}) created tender "${name.trim().slice(0, 60)}"`
    });

    return res.status(201).json({ id: result.insertId, message: "Tender created successfully in " + state });
  } catch (err) {
    if (err && err.message && err.message.includes("Tender limit reached")) {
      return res.status(400).json({ code: "TENDER_LIMIT_REACHED", message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 4. PUT /api/manager/tenders/:id - Edit tender ONLY if it belongs to manager's assigned state
router.put("/tenders/:id", async (req, res) => {
  try {
    const state = req.user.office_state;
    const tenderId = parseInt(req.params.id, 10);

    const existing = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!existing) {
      return res.status(404).json({ message: "Tender not found." });
    }

    if ((existing.state || "").toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({
        message: `Access denied. As the ${state} Manager, you cannot edit tenders belonging to ${existing.state || "another state"}.`
      });
    }

    const {
      name,
      department,
      category,
      budget,
      location,
      deadline,
      status,
      eligibility,
      required_documents,
      description,
      source_url,
      state: bodyState
    } = req.body;

    if (bodyState && bodyState.trim().toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({
        message: "Managers cannot reassign a tender to another state."
      });
    }

    const finalName = (name || existing.name).trim();
    const finalDept = (department || existing.department).trim();
    const finalCat = category || existing.category;
    const finalBudget = budget !== undefined ? parseFloat(budget) : existing.budget;
    const finalLocation = (location || existing.location).trim();
    const finalDeadline = deadline || existing.deadline;
    const finalStatus = status || existing.status || "Open";
    const finalEligibility = (eligibility || existing.eligibility).trim();
    const finalDescription = (description || existing.description).trim();
    const finalSourceUrl = source_url !== undefined ? source_url : existing.source_url;

    if (!ALLOWED_CATEGORIES.includes(finalCat)) {
      return res.status(400).json({
        message: `Invalid category. Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}.`
      });
    }

    if (!TENDER_STATUSES.includes(finalStatus)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${TENDER_STATUSES.join(", ")}.`
      });
    }

    if (isNaN(finalBudget) || finalBudget <= 0) {
      return res.status(400).json({ message: "Budget must be a positive number." });
    }

    const dup = await db.getAsync(
      "SELECT id FROM tenders WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ? LIMIT 1",
      [finalName, tenderId]
    );
    if (dup) {
      return res.status(409).json({ message: "Another tender already uses this title. Duplicate tender titles are not allowed." });
    }

    let docString = existing.required_documents;
    if (required_documents !== undefined) {
      docString = Array.isArray(required_documents)
        ? JSON.stringify(required_documents)
        : JSON.stringify(
            typeof required_documents === "string"
              ? required_documents.split(",").map((d) => d.trim()).filter(Boolean)
              : []
          );
    }

    await db.queryAsync(
      `UPDATE tenders
       SET name = ?, department = ?, category = ?, budget = ?, location = ?, deadline = ?,
           status = ?, eligibility = ?, required_documents = ?, description = ?, source_url = ?,
           updated_by = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        finalName,
        finalDept,
        finalCat,
        finalBudget,
        finalLocation,
        finalDeadline,
        finalStatus,
        finalEligibility,
        docString,
        finalDescription,
        finalSourceUrl,
        req.user.id,
        tenderId
      ]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "manager",
      action_type: "tender_updated",
      entity_type: "tender",
      entity_id: tenderId,
      state,
      details: `${state} Manager (${req.user.name}) updated tender "${finalName.slice(0, 60)}"`
    });

    return res.json({ message: "Tender updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. GET /api/manager/applications - Applications for tenders in manager's assigned state ONLY
router.get("/applications", async (req, res) => {
  try {
    const state = req.user.office_state;
    const rows = await db.queryAsync(
      `SELECT
        a.*,
        u.name AS contractor_name,
        u.company AS contractor_company,
        u.user_code AS contractor_code,
        u.email AS contractor_email,
        t.name AS tender_name,
        t.category AS tender_category,
        t.department AS tender_department,
        t.location AS tender_location,
        t.state AS tender_state,
        t.budget AS tender_budget,
        t.deadline AS tender_deadline
       FROM applications a
       JOIN users u ON a.contractor_id = u.id
       JOIN tenders t ON a.tender_id = t.id
       WHERE LOWER(t.state) = LOWER(?)
       ORDER BY a.applied_on DESC, a.id DESC`,
      [state]
    );

    const apps = rows.map((r) => {
      try {
        r.missing_documents = JSON.parse(r.missing_documents || "[]");
      } catch (e) {
        r.missing_documents = [];
      }
      return r;
    });

    return res.json({ assignedState: state, applications: apps });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. PUT /api/manager/applications/:id/evaluate - Evaluate application ONLY in manager's assigned state
router.put("/applications/:id/evaluate", async (req, res) => {
  try {
    const state = req.user.office_state;
    const appId = parseInt(req.params.id, 10);
    const {
      application_status,
      status,
      outcome,
      evaluation_notes,
      feedback_notes,
      missing_documents
    } = req.body;

    const appRow = await db.getAsync(
      `SELECT a.*, t.state AS tender_state, t.name AS tender_name
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       WHERE a.id = ? LIMIT 1`,
      [appId]
    );
    if (!appRow) {
      return res.status(404).json({ message: "Application not found." });
    }

    if ((appRow.tender_state || "").toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({
        message: `Access denied. As the ${state} Manager, you cannot evaluate applications for ${appRow.tender_state} tenders.`
      });
    }

    const finalStatus = application_status || status || "Under Review";
    if (!ALL_APPLICATION_STATUSES.includes(finalStatus)) {
      return res.status(400).json({ message: "Invalid application status." });
    }

    const finalOutcome = outcome || mapApplicationOutcome(finalStatus);
    const finalNotes = evaluation_notes !== undefined ? evaluation_notes : (feedback_notes !== undefined ? feedback_notes : appRow.evaluation_notes);

    const missingDocsStr = Array.isArray(missing_documents)
      ? JSON.stringify(missing_documents)
      : (typeof missing_documents === "string" && missing_documents.trim()
          ? JSON.stringify(missing_documents.split(",").map((s) => s.trim()).filter(Boolean))
          : JSON.stringify([]));

    await db.queryAsync(
      `UPDATE applications
       SET application_status = ?, outcome = ?, evaluation_notes = ?, missing_documents = ?,
           evaluator_id = ?, evaluated_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [finalStatus, finalOutcome, finalNotes || null, missingDocsStr, req.user.id, appId]
    );

    await db.queryAsync(
      `INSERT INTO notifications (user_id, title, message, created_at)
       VALUES (?, 'Application Status Updated', ?, datetime('now'))`,
      [appRow.contractor_id, `Your application ${appRow.application_code} for "${appRow.tender_name.slice(0, 50)}" was updated to "${finalStatus}".`]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "manager",
      action_type: "application_evaluated",
      entity_type: "application",
      entity_id: appId,
      state,
      details: `${state} Manager evaluated ${appRow.application_code} as "${finalStatus}"`
    });

    return res.json({ message: "Application evaluation updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 7. GET /api/manager/inquiries - Contractor inquiries routed to this state manager ONLY
router.get("/inquiries", async (req, res) => {
  try {
    const state = req.user.office_state;
    const { status, category, search } = req.query;

    let sql = `
      SELECT
        i.*,
        t.name AS tender_name,
        t.category AS tender_category,
        t.location AS tender_location,
        t.state AS tender_state,
        (SELECT COUNT(*) FROM inquiry_messages m WHERE m.inquiry_id = i.id) AS message_count,
        (SELECT MAX(created_at) FROM inquiry_messages m WHERE m.inquiry_id = i.id) AS last_activity_at
      FROM inquiries i
      LEFT JOIN tenders t ON i.related_tender_id = t.id
      WHERE LOWER(i.state) = LOWER(?) AND i.assigned_manager_id = ?
    `;
    const params = [state, req.user.id];

    if (status) {
      sql += " AND LOWER(i.status) = LOWER(?)";
      params.push(status);
    }
    if (category) {
      sql += " AND i.inquiry_category = ?";
      params.push(category);
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += " AND (i.ticket_number LIKE ? OR i.sender_name LIKE ? OR i.organization_name LIKE ? OR i.description LIKE ? OR t.name LIKE ?)";
      params.push(term, term, term, term, term);
    }

    sql += " ORDER BY i.created_at DESC, i.id DESC";
    const rows = await db.queryAsync(sql, params);

    const allInq = await db.queryAsync(
      "SELECT status FROM inquiries WHERE LOWER(state) = LOWER(?) AND assigned_manager_id = ?",
      [state, req.user.id]
    );
    const summary = { total: allInq.length, pending: 0, inProgress: 0, resolved: 0 };
    allInq.forEach((r) => {
      const st = (r.status || "").toLowerCase();
      if (st === "resolved") summary.resolved++;
      else if (st === "in progress" || st === "awaiting user response") summary.inProgress++;
      else summary.pending++;
    });

    return res.json({ assignedState: state, summary, inquiries: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. POST /api/manager/inquiries/:id/reply - Respond to a state inquiry
router.post("/inquiries/:id/reply", async (req, res) => {
  try {
    const state = req.user.office_state;
    const inquiryId = req.params.id;
    const { message_body, status } = req.body;

    if (!message_body || !message_body.trim()) {
      return res.status(400).json({ message: "Response message cannot be empty." });
    }

    const ticket = await db.getAsync(
      "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
      [inquiryId, inquiryId]
    );
    if (!ticket) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    if (ticket.assigned_manager_id !== req.user.id || (ticket.state || "").toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({
        message: `Access denied. As the ${state} Manager, you cannot respond to inquiries belonging to ${ticket.state || "another state"}.`
      });
    }

    const newStatus = status && INQUIRY_STATUSES.includes(status)
      ? status
      : (ticket.status === "Pending" ? "In Progress" : ticket.status);
    const resolvedAt = newStatus === "Resolved"
      ? new Date().toISOString().replace("T", " ").substring(0, 19)
      : null;

    const msgRes = await db.queryAsync(
      `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
       VALUES (?, ?, 'Manager', ?, datetime('now'))`,
      [ticket.id, req.user.id, message_body.trim()]
    );

    await db.queryAsync(
      "UPDATE inquiries SET status = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?",
      [newStatus, resolvedAt, ticket.id]
    );

    await db.queryAsync(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [
        ticket.sender_user_id,
        `${state} Manager Replied (${ticket.ticket_number})`,
        `${req.user.name}: "${message_body.trim().slice(0, 90)}"`
      ]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "manager",
      action_type: "inquiry_replied",
      entity_type: "inquiry",
      entity_id: ticket.id,
      state,
      details: `${state} Manager responded to inquiry ${ticket.ticket_number} (${newStatus})`
    });

    return res.json({
      success: true,
      message: "Response dispatched to contractor.",
      message_id: msgRes.insertId,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 9. PATCH /api/manager/inquiries/:id - Update inquiry status (Pending / In Progress / Resolved)
router.patch("/inquiries/:id", async (req, res) => {
  try {
    const state = req.user.office_state;
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
      return res.status(404).json({ message: "Inquiry not found." });
    }

    if (ticket.assigned_manager_id !== req.user.id || (ticket.state || "").toLowerCase() !== state.toLowerCase()) {
      return res.status(403).json({
        message: `Access denied. You cannot modify inquiries outside ${state}.`
      });
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
      actor_role: "manager",
      action_type: "inquiry_status_updated",
      entity_type: "inquiry",
      entity_id: ticket.id,
      state,
      details: `${state} Manager changed ${ticket.ticket_number} status to "${status}"`
    });

    return res.json({ success: true, status, message: `Inquiry updated to "${status}".` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 10. GET /api/manager/contractors - Contractor activity scoped strictly to manager's state
router.get("/contractors", async (req, res) => {
  try {
    const state = req.user.office_state;
    const rows = await db.queryAsync(
      `SELECT
        u.id,
        u.user_code,
        u.name,
        u.company,
        u.email,
        (SELECT COUNT(*) FROM applications a JOIN tenders t ON a.tender_id = t.id WHERE a.contractor_id = u.id AND LOWER(t.state) = LOWER(?)) AS state_applications_count,
        (SELECT COUNT(*) FROM applications a JOIN tenders t ON a.tender_id = t.id WHERE a.contractor_id = u.id AND LOWER(t.state) = LOWER(?) AND a.outcome = 'Won') AS state_won_count,
        (SELECT COUNT(*) FROM saved_tenders s JOIN tenders t ON s.tender_id = t.id WHERE s.user_id = u.id AND LOWER(t.state) = LOWER(?)) AS state_saved_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.sender_user_id = u.id AND LOWER(i.state) = LOWER(?) AND i.assigned_manager_id = ?) AS state_inquiries_count
       FROM users u
       WHERE LOWER(u.role) = 'contractor'
         AND (
           EXISTS (SELECT 1 FROM applications a JOIN tenders t ON a.tender_id = t.id WHERE a.contractor_id = u.id AND LOWER(t.state) = LOWER(?))
           OR EXISTS (SELECT 1 FROM saved_tenders s JOIN tenders t ON s.tender_id = t.id WHERE s.user_id = u.id AND LOWER(t.state) = LOWER(?))
           OR EXISTS (SELECT 1 FROM inquiries i WHERE i.sender_user_id = u.id AND LOWER(i.state) = LOWER(?) AND i.assigned_manager_id = ?)
         )
       ORDER BY state_applications_count DESC, state_inquiries_count DESC`,
      [state, state, state, state, req.user.id, state, state, state, req.user.id]
    );

    return res.json({ assignedState: state, contractors: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;

