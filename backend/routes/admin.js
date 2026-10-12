const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = "student_secret_key_12345";

// Middleware to check if user is admin or manager
function checkAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Access denied. Please login first." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Session expired. Please login again." });
    }
    const r = (decoded.role || "").toLowerCase();
    if (r !== "admin" && r !== "manager") {
      return res.status(403).json({ message: "Access denied. Admin or Manager privileges required." });
    }
    req.user = decoded;
    next();
  });
}

// 1. Get Operational Stats and Activity Logs
router.get("/stats", checkAdmin, (req, res) => {
  // Query 1: Tenders Count
  db.query("SELECT COUNT(*) as count FROM tenders", [], (err, tendersRes) => {
    if (err) return res.status(500).json({ message: err.message });
    
    // Query 2: Contractors Count
    db.query("SELECT COUNT(*) as count FROM users WHERE LOWER(role) NOT IN ('admin', 'manager')", [], (err, usersRes) => {
      if (err) return res.status(500).json({ message: err.message });
      
      // Query 3: Saved Tenders Count
      db.query("SELECT COUNT(*) as count FROM saved_tenders", [], (err, savedRes) => {
        if (err) return res.status(500).json({ message: err.message });
        
        // Query 4: Total Outlay Budget
        db.query("SELECT SUM(budget) as total, AVG(budget) as avg FROM tenders", [], (err, budgetRes) => {
          if (err) return res.status(500).json({ message: err.message });
          
          // Query 5: Budget per Category
          db.query("SELECT category, COUNT(*) as count, SUM(budget) as budget FROM tenders GROUP BY category", [], (err, catStats) => {
            if (err) return res.status(500).json({ message: err.message });

            // Query 6: Recent activities (logs)
            db.query("SELECT id, name, created_at FROM tenders ORDER BY id DESC LIMIT 3", [], (err, recentTenders) => {
              if (err) return res.status(500).json({ message: err.message });

              db.query("SELECT id, username, name, created_at FROM users ORDER BY id DESC LIMIT 3", [], (err, recentUsers) => {
                if (err) return res.status(500).json({ message: err.message });

                const recentActivity = [];
                recentTenders.forEach(t => {
                  recentActivity.push({
                    type: "tender_created",
                    message: `Tender "${t.name}" was published.`,
                    time: t.created_at
                  });
                });
                recentUsers.forEach(u => {
                  recentActivity.push({
                    type: "user_registered",
                    message: `User "${u.name || u.username}" registered.`,
                    time: u.created_at
                  });
                });

                // Sort activity by time desc
                recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

                return res.json({
                  tendersCount: tendersRes[0].count,
                  usersCount: usersRes[0].count,
                  savedCount: savedRes[0].count,
                  totalBudget: budgetRes[0].total || 0,
                  averageBudget: budgetRes[0].avg || 0,
                  categoryStats: catStats,
                  recentActivity: recentActivity.slice(0, 5)
                });
              });
            });
          });
        });
      });
    });
  });
});

// 2. Get User/Contractor List
router.get("/users", checkAdmin, (req, res) => {
  db.query(
    "SELECT id, username, user_code, name, company, department, email, role, created_at FROM users ORDER BY id ASC",
    [],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      return res.json(results);
    }
  );
});

// 3. Create Tender
router.post("/tenders", checkAdmin, (req, res) => {
  const { name, department, category, budget, location, deadline, eligibility, required_documents, description, source_url } = req.body;

  if (!name || !department || !category || !budget || !location || !deadline || !eligibility || !description) {
    return res.status(400).json({ message: "All tender parameters are required" });
  }

  const docString = Array.isArray(required_documents) 
    ? JSON.stringify(required_documents) 
    : JSON.stringify([]);

  db.query(
    `INSERT INTO tenders (name, department, category, budget, location, deadline, eligibility, required_documents, description, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, department, category, parseFloat(budget), location, deadline, eligibility, docString, description, source_url || "https://eprocure.gov.in/eprocure/app"],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });

      // Create a notification for all users that a new tender was published
      db.query(
        `INSERT INTO notifications (user_id, title, message)
         SELECT id, ?, ? FROM users WHERE role != 'admin'`,
        ["New Tender Alert!", `A new tender "${name}" under the ${category} category has been published.`],
        () => {}
      );

      return res.status(201).json({ id: result.insertId, message: "Tender created successfully" });
    }
  );
});

// 4. Update Tender
router.put("/tenders/:id", checkAdmin, (req, res) => {
  const { name, department, category, budget, location, deadline, eligibility, required_documents, description, source_url } = req.body;

  if (!name || !department || !category || !budget || !location || !deadline || !eligibility || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const docString = Array.isArray(required_documents)
    ? JSON.stringify(required_documents)
    : JSON.stringify([]);

  db.query(
    `UPDATE tenders 
     SET name = ?, department = ?, category = ?, budget = ?, location = ?, deadline = ?, eligibility = ?, required_documents = ?, description = ?, source_url = ?
     WHERE id = ?`,
    [name, department, category, parseFloat(budget), location, deadline, eligibility, docString, description, source_url || "https://eprocure.gov.in/eprocure/app", req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Tender not found" });
      return res.json({ message: "Tender updated successfully" });
    }
  );
});

// 5. Delete Tender
router.delete("/tenders/:id", checkAdmin, (req, res) => {
  db.query("DELETE FROM tenders WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Tender not found" });
    return res.json({ message: "Tender deleted successfully" });
  });
});

// 6. Get All Applications for Manager Review
router.get("/applications", checkAdmin, (req, res) => {
  const query = `
    SELECT 
      a.id,
      a.application_code,
      a.contractor_id,
      a.tender_id,
      a.applied_on,
      a.bid_amount,
      a.application_status,
      a.outcome,
      a.proposal_notes,
      a.missing_documents,
      a.evaluation_notes,
      a.evaluator_id,
      a.evaluated_at,
      a.created_at,
      u.name AS contractor_name,
      u.company AS contractor_company,
      u.user_code AS contractor_code,
      u.email AS contractor_email,
      t.name AS tender_name,
      t.category AS tender_category,
      t.department AS tender_department,
      t.budget AS tender_budget,
      t.deadline AS tender_deadline
    FROM applications a
    JOIN users u ON a.contractor_id = u.id
    JOIN tenders t ON a.tender_id = t.id
    ORDER BY a.applied_on DESC, a.id DESC
  `;

  db.query(query, [], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    const apps = results.map(row => {
      try {
        row.missing_documents = JSON.parse(row.missing_documents || "[]");
      } catch (e) {
        row.missing_documents = row.missing_documents ? [row.missing_documents] : [];
      }
      return row;
    });
    return res.json(apps);
  });
});

// 7. Update Application Evaluation (Manager Feedback & Outcome)
router.put("/applications/:id/evaluate", checkAdmin, (req, res) => {
  const { application_status, outcome, evaluation_notes, missing_documents } = req.body;

  const validStatuses = ["Submitted", "Under Review", "Won", "Not Awarded", "Withdrawn"];
  if (application_status && !validStatuses.includes(application_status)) {
    return res.status(400).json({ message: "Invalid application status." });
  }

  const missingDocsStr = Array.isArray(missing_documents)
    ? JSON.stringify(missing_documents)
    : (typeof missing_documents === "string" && missing_documents.trim() ? JSON.stringify(missing_documents.split(",").map(s => s.trim()).filter(Boolean)) : JSON.stringify([]));

  db.query(
    `UPDATE applications 
     SET application_status = ?, outcome = ?, evaluation_notes = ?, missing_documents = ?, 
         evaluator_id = ?, evaluated_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [
      application_status || "Under Review",
      outcome || "Pending",
      evaluation_notes || null,
      missingDocsStr,
      req.user.id,
      req.params.id
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Application not found" });

      // Notify contractor about evaluation update
      db.query("SELECT contractor_id, application_code FROM applications WHERE id = ?", [req.params.id], (sErr, sRes) => {
        if (!sErr && sRes && sRes.length > 0) {
          db.query(
            `INSERT INTO notifications (user_id, title, message, created_at)
             VALUES (?, 'Application Status Updated', ?, datetime('now'))`,
            [sRes[0].contractor_id, `Your application ${sRes[0].application_code} status has been updated to "${application_status}".`]
          );
        }
      });

      return res.json({ message: "Application evaluation updated successfully." });
    }
  );
});

// Middleware strictly for main website Admin (excludes ordinary managers)
function checkMainAdminOnly(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied. Please login first." });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Session expired. Please login again." });
    const r = (decoded.role || "").toLowerCase();
    if (r !== "admin") {
      return res.status(403).json({ message: "Access denied. Main Administrator privileges required." });
    }
    req.user = decoded;
    next();
  });
}

// Admin Central Helpdesk Queue
router.get("/inquiries", checkMainAdminOnly, (req, res) => {
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

// Admin updates priority/status
router.patch("/inquiries/:id", checkMainAdminOnly, (req, res) => {
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
      const resolvedAt = (newStatus === "Resolved") ? new Date().toISOString().replace("T", " ").substring(0, 19) : null;

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

// Admin posts reply
router.post("/inquiries/:id/reply", checkMainAdminOnly, (req, res) => {
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
