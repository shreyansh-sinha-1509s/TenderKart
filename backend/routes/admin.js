const express = require("express");
const router = express.Router();
const db = require("../db");
const { ALLOWED_CATEGORIES, MAX_DEMO_TENDERS, INQUIRY_STATUSES, normalizeState } = require("../constants");
const { requireAdmin } = require("../middleware/auth");

// Strictly Central Admin ONLY across ALL /api/admin endpoints
router.use(requireAdmin);

// 1. Nationwide Admin Analytics & Supervision Overview
router.get(["/stats", "/analytics"], async (req, res) => {
  try {
    const [tendersCountRow, contractorsRow, approvedMgrRow, pendingMgrRow, totalMgrRow, viewsRow, savedRow, budgetRow] =
      await Promise.all([
        db.getAsync("SELECT COUNT(*) AS count FROM tenders"),
        db.getAsync("SELECT COUNT(*) AS count FROM users WHERE LOWER(role) = 'contractor'"),
        db.getAsync("SELECT COUNT(*) AS count FROM users WHERE LOWER(role) = 'manager' AND approval_status = 'Approved' AND is_active = 1"),
        db.getAsync("SELECT COUNT(*) AS count FROM users WHERE LOWER(role) = 'manager' AND approval_status = 'Pending'"),
        db.getAsync("SELECT COUNT(*) AS count FROM users WHERE LOWER(role) = 'manager'"),
        db.getAsync("SELECT COALESCE(SUM(views_count), 0) AS totalViews FROM tenders"),
        db.getAsync("SELECT COUNT(*) AS count FROM saved_tenders"),
        db.getAsync("SELECT COALESCE(SUM(budget), 0) AS total, COALESCE(AVG(budget), 0) AS avg FROM tenders")
      ]);

    // Category breakdown
    const categoryStats = await db.queryAsync(
      `SELECT
        t.category,
        COUNT(DISTINCT t.id) AS count,
        COALESCE(SUM(t.budget), 0) AS budget,
        COALESCE(SUM(t.views_count), 0) AS views,
        (SELECT COUNT(*) FROM applications a JOIN tenders t2 ON a.tender_id = t2.id WHERE t2.category = t.category) AS applications_count,
        (SELECT COUNT(*) FROM saved_tenders s JOIN tenders t3 ON s.tender_id = t3.id WHERE t3.category = t.category) AS saved_count
       FROM tenders t
       GROUP BY t.category
       ORDER BY count DESC, t.category ASC`
    );

    // State-wise tender & contractor activity breakdown
    const stateStats = await db.queryAsync(
      `SELECT
        t.state,
        COUNT(DISTINCT t.id) AS tender_count,
        COALESCE(SUM(t.budget), 0) AS total_budget,
        COALESCE(SUM(t.views_count), 0) AS total_views,
        (SELECT COUNT(*) FROM saved_tenders s JOIN tenders t2 ON s.tender_id = t2.id WHERE LOWER(t2.state) = LOWER(t.state)) AS saved_count,
        (SELECT COUNT(*) FROM applications a JOIN tenders t3 ON a.tender_id = t3.id WHERE LOWER(t3.state) = LOWER(t.state)) AS applications_count,
        (SELECT COUNT(DISTINCT a.contractor_id) FROM applications a JOIN tenders t4 ON a.tender_id = t4.id WHERE LOWER(t4.state) = LOWER(t.state)) AS active_contractors,
        (SELECT COUNT(*) FROM inquiries i WHERE LOWER(i.state) = LOWER(t.state)) AS inquiries_count,
        (SELECT COUNT(*) FROM inquiries i WHERE LOWER(i.state) = LOWER(t.state) AND LOWER(i.status) = 'resolved') AS resolved_inquiries_count,
        (SELECT GROUP_CONCAT(u.name, ', ') FROM users u WHERE LOWER(u.role) = 'manager' AND LOWER(u.office_state) = LOWER(t.state) AND u.approval_status = 'Approved' AND u.is_active = 1) AS approved_manager
       FROM tenders t
       GROUP BY t.state
       ORDER BY tender_count DESC, t.state ASC`
    );

    // Applications summary
    const allApps = await db.queryAsync("SELECT application_status, outcome FROM applications");
    const applicationsSummary = {
      total: allApps.length,
      won: 0,
      notAwarded: 0,
      underReview: 0,
      submitted: 0,
      pending: 0,
      withdrawn: 0
    };
    allApps.forEach((a) => {
      const st = (a.application_status || "").trim();
      const out = (a.outcome || "").trim();
      if (st === "Won" || out === "Won") applicationsSummary.won++;
      else if (["Not Awarded", "Rejected"].includes(st) || ["Not Awarded", "Rejected"].includes(out)) applicationsSummary.notAwarded++;
      else if (st === "Withdrawn" || out === "Withdrawn") applicationsSummary.withdrawn++;
      else {
        applicationsSummary.pending++;
        if (st === "Under Review") applicationsSummary.underReview++;
        else applicationsSummary.submitted++;
      }
    });

    // Inquiries summary
    const allInquiries = await db.queryAsync("SELECT status, assignment_status FROM inquiries");
    const inquiriesSummary = {
      total: allInquiries.length,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      unassigned: 0
    };
    allInquiries.forEach((i) => {
      const st = (i.status || "").toLowerCase();
      if (st === "resolved") inquiriesSummary.resolved++;
      else if (st === "in progress" || st === "awaiting user response") inquiriesSummary.inProgress++;
      else inquiriesSummary.pending++;

      if ((i.assignment_status || "").toLowerCase().includes("unassigned")) {
        inquiriesSummary.unassigned++;
      }
    });

    // Manager-wise performance comparison
    const managerPerformance = await db.queryAsync(
      `SELECT
        u.id,
        u.user_code,
        u.username,
        u.name,
        u.email,
        u.office_state,
        u.approval_status,
        u.is_active,
        u.created_at,
        (SELECT COUNT(*) FROM tenders t WHERE LOWER(t.state) = LOWER(u.office_state)) AS state_tenders_count,
        (SELECT COUNT(*) FROM activity_logs al WHERE al.actor_user_id = u.id AND al.action_type IN ('tender_created', 'tender_updated')) AS tender_updates_count,
        (SELECT COUNT(*) FROM inquiry_messages im WHERE im.sender_user_id = u.id AND LOWER(im.sender_role) = 'manager') AS inquiry_responses_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.assigned_manager_id = u.id) AS assigned_inquiries_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.assigned_manager_id = u.id AND LOWER(i.status) = 'resolved') AS resolved_inquiries_count,
        (SELECT COUNT(*) FROM applications a WHERE a.evaluator_id = u.id) AS evaluated_applications_count
       FROM users u
       WHERE LOWER(u.role) = 'manager'
       ORDER BY u.approval_status ASC, tender_updates_count DESC, inquiry_responses_count DESC, u.id ASC`
    );

    // Recent platform activity logs
    const recentActivity = await db.queryAsync(
      `SELECT al.*, u.name AS actor_name, u.username AS actor_username, u.user_code AS actor_code
       FROM activity_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT 20`
    );

    return res.json({
      tendersCount: tendersCountRow ? tendersCountRow.count : 0,
      maxTenders: MAX_DEMO_TENDERS,
      usersCount: contractorsRow ? contractorsRow.count : 0,
      contractorsCount: contractorsRow ? contractorsRow.count : 0,
      approvedManagersCount: approvedMgrRow ? approvedMgrRow.count : 0,
      pendingManagersCount: pendingMgrRow ? pendingMgrRow.count : 0,
      totalManagersCount: totalMgrRow ? totalMgrRow.count : 0,
      totalViews: viewsRow ? viewsRow.totalViews : 0,
      savedCount: savedRow ? savedRow.count : 0,
      totalBudget: budgetRow ? budgetRow.total : 0,
      averageBudget: budgetRow ? budgetRow.avg : 0,
      applicationsSummary,
      inquiriesSummary,
      categoryStats,
      stateStats,
      managerPerformance,
      recentActivity
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Get all 12 tenders nationwide with monitoring metrics
router.get("/tenders", async (req, res) => {
  try {
    const rows = await db.queryAsync(
      `SELECT t.*,
        u.name AS updated_by_name,
        (SELECT COUNT(*) FROM applications a WHERE a.tender_id = t.id) AS applications_count,
        (SELECT COUNT(*) FROM saved_tenders s WHERE s.tender_id = t.id) AS saved_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.related_tender_id = t.id) AS inquiries_count
       FROM tenders t
       LEFT JOIN users u ON t.updated_by = u.id
       ORDER BY t.id ASC`
    );

    const tenders = rows.map((t) => {
      try {
        t.required_documents = JSON.parse(t.required_documents || "[]");
      } catch (e) {
        t.required_documents = [];
      }
      return t;
    });

    return res.json(tenders);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Enforce 12-tender cap even on Admin tender creation endpoint
router.post("/tenders", async (req, res) => {
  try {
    const countRow = await db.getAsync("SELECT COUNT(*) AS count FROM tenders");
    if (countRow && countRow.count >= MAX_DEMO_TENDERS) {
      return res.status(400).json({
        code: "TENDER_LIMIT_REACHED",
        message: `Tender limit reached: TenderKart demonstration platform strictly maintains ${MAX_DEMO_TENDERS} tenders.`
      });
    }

    const { name, department, category, budget, location, state, deadline, eligibility, required_documents, description, source_url } = req.body;
    const cleanState = normalizeState(state || location || "");
    if (!name || !department || !category || !budget || !location || !cleanState || !deadline || !eligibility || !description) {
      return res.status(400).json({ message: "All tender parameters including state are required." });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
    }

    const docString = Array.isArray(required_documents) ? JSON.stringify(required_documents) : JSON.stringify([]);
    const result = await db.queryAsync(
      `INSERT INTO tenders (name, department, category, budget, location, state, deadline, status, eligibility, required_documents, description, source_url, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?)`,
      [name, department, category, parseFloat(budget), location, cleanState, deadline, eligibility, docString, description, source_url || "https://eprocure.gov.in/eprocure/app", req.user.id, req.user.id]
    );
    return res.status(201).json({ id: result.insertId, message: "Tender created successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Get Registered Users & Contractor/Manager Activity
router.get("/users", async (req, res) => {
  try {
    const users = await db.queryAsync(
      `SELECT
        u.id, u.username, u.user_code, u.name, u.company, u.department, u.office_state,
        u.email, u.role, u.approval_status, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM applications a WHERE a.contractor_id = u.id) AS applications_count,
        (SELECT COUNT(*) FROM applications a WHERE a.contractor_id = u.id AND a.outcome = 'Won') AS won_count,
        (SELECT COUNT(*) FROM saved_tenders s WHERE s.user_id = u.id) AS saved_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.sender_user_id = u.id) AS inquiries_count,
        (SELECT COUNT(*) FROM activity_logs al WHERE al.actor_user_id = u.id AND al.action_type IN ('tender_created', 'tender_updated')) AS tender_updates_count,
        (SELECT COUNT(*) FROM inquiry_messages im WHERE im.sender_user_id = u.id AND LOWER(im.sender_role) = 'manager') AS inquiry_responses_count
       FROM users u
       ORDER BY u.id ASC`
    );
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Get All Managers (Pending, Approved, Rejected, Active, Inactive)
router.get("/managers", async (req, res) => {
  try {
    const managers = await db.queryAsync(
      `SELECT
        u.id, u.username, u.user_code, u.name, u.email, u.department, u.office_state,
        u.approval_status, u.is_active, u.approved_at, u.created_at,
        (SELECT COUNT(*) FROM tenders t WHERE LOWER(t.state) = LOWER(u.office_state)) AS state_tenders_count,
        (SELECT COUNT(*) FROM activity_logs al WHERE al.actor_user_id = u.id AND al.action_type IN ('tender_created', 'tender_updated')) AS tender_updates_count,
        (SELECT COUNT(*) FROM inquiry_messages im WHERE im.sender_user_id = u.id AND LOWER(im.sender_role) = 'manager') AS inquiry_responses_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.assigned_manager_id = u.id) AS assigned_inquiries_count,
        (SELECT COUNT(*) FROM inquiries i WHERE i.assigned_manager_id = u.id AND LOWER(i.status) = 'resolved') AS resolved_inquiries_count
       FROM users u
       WHERE LOWER(u.role) = 'manager'
       ORDER BY
         CASE WHEN u.approval_status = 'Pending' THEN 0 WHEN u.approval_status = 'Approved' THEN 1 ELSE 2 END,
         u.created_at DESC`
    );
    return res.json(managers);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Approve Pending Manager Registration
router.patch("/managers/:id/approve", async (req, res) => {
  try {
    const managerId = parseInt(req.params.id, 10);
    const mgr = await db.getAsync(
      "SELECT id, name, username, role, office_state, approval_status FROM users WHERE id = ? AND LOWER(role) = 'manager' LIMIT 1",
      [managerId]
    );
    if (!mgr) {
      return res.status(404).json({ message: "Manager account not found." });
    }

    await db.queryAsync(
      `UPDATE users
       SET approval_status = 'Approved', is_active = 1, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [req.user.id, managerId]
    );

    // Route any pending unassigned inquiries for this state to the newly approved manager
    let assignedCount = 0;
    if (mgr.office_state) {
      const unassigned = await db.queryAsync(
        `SELECT id, ticket_number FROM inquiries
         WHERE LOWER(state) = LOWER(?) AND assigned_manager_id IS NULL AND assignment_status = 'Unassigned / Pending Admin Assignment'`,
        [mgr.office_state]
      );
      if (unassigned.length > 0) {
        await db.queryAsync(
          `UPDATE inquiries
           SET assigned_manager_id = ?, assignment_status = 'Assigned', assigned_to = ?, updated_at = datetime('now')
           WHERE LOWER(state) = LOWER(?) AND assigned_manager_id IS NULL AND assignment_status = 'Unassigned / Pending Admin Assignment'`,
          [mgr.id, mgr.username, mgr.office_state]
        );
        assignedCount = unassigned.length;
      }
    }

    await db.queryAsync(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [
        mgr.id,
        "Manager Account Approved",
        `Your account for ${mgr.office_state} has been approved by Central Admin. You can now access your State Manager Dashboard.`
      ]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action_type: "manager_approved",
      entity_type: "user",
      entity_id: mgr.id,
      state: mgr.office_state,
      details: `Central Admin approved Manager "${mgr.name}" for ${mgr.office_state}` + (assignedCount ? ` (${assignedCount} pending state inquiries auto-assigned)` : "")
    });

    return res.json({
      success: true,
      assignedInquiriesCount: assignedCount,
      message: `Manager ${mgr.name} (${mgr.office_state}) has been approved.`
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 7. Reject Manager Registration
router.patch("/managers/:id/reject", async (req, res) => {
  try {
    const managerId = parseInt(req.params.id, 10);
    const mgr = await db.getAsync(
      "SELECT id, name, office_state FROM users WHERE id = ? AND LOWER(role) = 'manager' LIMIT 1",
      [managerId]
    );
    if (!mgr) {
      return res.status(404).json({ message: "Manager account not found." });
    }

    await db.queryAsync(
      `UPDATE users
       SET approval_status = 'Rejected', is_active = 0, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [req.user.id, managerId]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action_type: "manager_rejected",
      entity_type: "user",
      entity_id: mgr.id,
      state: mgr.office_state,
      details: `Central Admin rejected Manager registration for "${mgr.name}" (${mgr.office_state})`
    });

    return res.json({ success: true, message: `Manager ${mgr.name} has been rejected.` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. Activate or Deactivate Manager Account
router.patch("/managers/:id/status", async (req, res) => {
  try {
    const managerId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ message: "is_active (true/false or 1/0) is required." });
    }

    const activeFlag = is_active === true || is_active === 1 || is_active === "1" ? 1 : 0;
    const mgr = await db.getAsync(
      "SELECT id, name, office_state, approval_status FROM users WHERE id = ? AND LOWER(role) = 'manager' LIMIT 1",
      [managerId]
    );
    if (!mgr) {
      return res.status(404).json({ message: "Manager account not found." });
    }

    if (mgr.approval_status !== "Approved" && activeFlag === 1) {
      return res.status(400).json({ message: "Only approved managers can be activated. Approve the manager first." });
    }

    await db.queryAsync(
      "UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
      [activeFlag, managerId]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action_type: activeFlag ? "manager_activated" : "manager_deactivated",
      entity_type: "user",
      entity_id: mgr.id,
      state: mgr.office_state,
      details: `Central Admin ${activeFlag ? "activated" : "deactivated"} Manager "${mgr.name}" (${mgr.office_state})`
    });

    return res.json({
      success: true,
      is_active: activeFlag,
      message: `Manager ${mgr.name} has been ${activeFlag ? "activated" : "deactivated"}.`
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 9. Nationwide Applications Monitor (Admin Supervisory View)
router.get("/applications", async (req, res) => {
  try {
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
        t.state AS tender_state,
        t.location AS tender_location,
        t.budget AS tender_budget,
        t.deadline AS tender_deadline,
        ev.name AS evaluator_name
       FROM applications a
       JOIN users u ON a.contractor_id = u.id
       JOIN tenders t ON a.tender_id = t.id
       LEFT JOIN users ev ON a.evaluator_id = ev.id
       ORDER BY a.applied_on DESC, a.id DESC`
    );

    const apps = rows.map((row) => {
      try {
        row.missing_documents = JSON.parse(row.missing_documents || "[]");
      } catch (e) {
        row.missing_documents = [];
      }
      return row;
    });

    return res.json(apps);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 10. Nationwide Inquiries Monitor
router.get("/inquiries", async (req, res) => {
  try {
    const { state, category, status, assignment_status, search } = req.query;

    let baseSql = `
      SELECT
        i.*,
        t.name AS tender_name,
        t.category AS tender_category,
        t.state AS tender_state,
        m.name AS assigned_manager_name,
        m.office_state AS assigned_manager_state,
        (SELECT COUNT(*) FROM inquiry_messages msg WHERE msg.inquiry_id = i.id) AS message_count,
        (SELECT MAX(created_at) FROM inquiry_messages msg WHERE msg.inquiry_id = i.id) AS last_activity_at
      FROM inquiries i
      LEFT JOIN tenders t ON i.related_tender_id = t.id
      LEFT JOIN users m ON i.assigned_manager_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (state) {
      baseSql += " AND LOWER(i.state) = LOWER(?)";
      params.push(state);
    }
    if (category) {
      baseSql += " AND i.inquiry_category = ?";
      params.push(category);
    }
    if (status) {
      baseSql += " AND LOWER(i.status) = LOWER(?)";
      params.push(status);
    }
    if (assignment_status) {
      baseSql += " AND LOWER(i.assignment_status) LIKE LOWER(?)";
      params.push(`%${assignment_status}%`);
    }
    if (search && search.trim()) {
      baseSql += " AND (i.ticket_number LIKE ? OR i.sender_name LIKE ? OR i.sender_email LIKE ? OR i.subject LIKE ? OR i.organization_name LIKE ? OR i.description LIKE ?)";
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    baseSql += " ORDER BY i.created_at DESC, i.id DESC";
    const rows = await db.queryAsync(baseSql, params);

    const allInq = await db.queryAsync("SELECT status, assignment_status FROM inquiries");
    const summary = {
      totalInquiries: allInq.length,
      countPending: 0,
      countInProgress: 0,
      countResolved: 0,
      countUnassigned: 0
    };
    allInq.forEach((r) => {
      const st = (r.status || "").toLowerCase();
      if (st === "resolved") summary.countResolved++;
      else if (st === "in progress" || st === "awaiting user response") summary.countInProgress++;
      else summary.countPending++;

      if ((r.assignment_status || "").toLowerCase().includes("unassigned")) {
        summary.countUnassigned++;
      }
    });

    return res.json({ summary, inquiries: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 11. Admin updates inquiry status/priority
router.patch("/inquiries/:id", async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const { status, priority } = req.body;

    const ticket = await db.getAsync(
      "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
      [inquiryId, inquiryId]
    );
    if (!ticket) return res.status(404).json({ message: "Inquiry not found." });

    const newStatus = status && INQUIRY_STATUSES.includes(status) ? status : ticket.status;
    const newPriority = priority || ticket.priority;
    const resolvedAt = newStatus === "Resolved"
      ? new Date().toISOString().replace("T", " ").substring(0, 19)
      : null;

    await db.queryAsync(
      "UPDATE inquiries SET status = ?, priority = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?",
      [newStatus, newPriority, resolvedAt, ticket.id]
    );

    return res.json({ success: true, status: newStatus, priority: newPriority });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 12. Admin supervisory reply (for unassigned inquiries or oversight)
router.post("/inquiries/:id/reply", async (req, res) => {
  try {
    const inquiryId = req.params.id;
    const { message_body, status, priority } = req.body;

    if (!message_body || !message_body.trim()) {
      return res.status(400).json({ message: "Reply body cannot be empty." });
    }

    const ticket = await db.getAsync(
      "SELECT * FROM inquiries WHERE id = ? OR ticket_number = ? LIMIT 1",
      [inquiryId, inquiryId]
    );
    if (!ticket) return res.status(404).json({ message: "Inquiry not found." });

    const newStatus = status && INQUIRY_STATUSES.includes(status) ? status : "In Progress";
    const newPriority = priority || ticket.priority;
    const resolvedAt = newStatus === "Resolved"
      ? new Date().toISOString().replace("T", " ").substring(0, 19)
      : null;

    const msgRes = await db.queryAsync(
      `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
       VALUES (?, ?, 'Admin', ?, datetime('now'))`,
      [ticket.id, req.user.id, message_body.trim()]
    );

    await db.queryAsync(
      "UPDATE inquiries SET status = ?, priority = ?, resolved_at = ?, updated_at = datetime('now') WHERE id = ?",
      [newStatus, newPriority, resolvedAt, ticket.id]
    );

    await db.queryAsync(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [ticket.sender_user_id, `Central Admin Response (${ticket.ticket_number})`, message_body.trim().slice(0, 100)]
    );

    db.logActivity({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action_type: "inquiry_replied",
      entity_type: "inquiry",
      entity_id: ticket.id,
      state: ticket.state,
      details: `Central Admin replied to ${ticket.ticket_number} (${newStatus})`
    });

    return res.json({ success: true, message_id: msgRes.insertId, status: newStatus });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 13. Full Platform Activity Logs
router.get("/activity", async (req, res) => {
  try {
    const logs = await db.queryAsync(
      `SELECT al.*, u.name AS actor_name, u.username AS actor_username, u.user_code AS actor_code
       FROM activity_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT 100`
    );
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
