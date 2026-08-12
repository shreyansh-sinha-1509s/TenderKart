const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = "student_secret_key_12345";

// Middleware to check if user is admin
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
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
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
    
    // Query 2: Users Count
    db.query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'", [], (err, usersRes) => {
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
            // Fetch recent 3 tenders and 3 users to build mock activity list
            db.query("SELECT id, name, created_at FROM tenders ORDER BY id DESC LIMIT 3", [], (err, recentTenders) => {
              if (err) return res.status(500).json({ message: err.message });

              db.query("SELECT id, username, created_at FROM users ORDER BY id DESC LIMIT 3", [], (err, recentUsers) => {
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
                    message: `New contractor "${u.username}" registered.`,
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
    "SELECT id, username, email, role, created_at FROM users ORDER BY id DESC",
    [],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      return res.json(results);
    }
  );
});

// 3. Create Tender
router.post("/tenders", checkAdmin, (req, res) => {
  const { name, department, category, budget, location, deadline, eligibility, required_documents, description } = req.body;

  if (!name || !department || !category || !budget || !location || !deadline || !eligibility || !description) {
    return res.status(400).json({ message: "All tender parameters are required" });
  }

  const docString = Array.isArray(required_documents) 
    ? JSON.stringify(required_documents) 
    : JSON.stringify([]);

  db.query(
    `INSERT INTO tenders (name, department, category, budget, location, deadline, eligibility, required_documents, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, department, category, parseFloat(budget), location, deadline, eligibility, docString, description],
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
  const { name, department, category, budget, location, deadline, eligibility, required_documents, description } = req.body;

  if (!name || !department || !category || !budget || !location || !deadline || !eligibility || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const docString = Array.isArray(required_documents)
    ? JSON.stringify(required_documents)
    : JSON.stringify([]);

  db.query(
    `UPDATE tenders 
     SET name = ?, department = ?, category = ?, budget = ?, location = ?, deadline = ?, eligibility = ?, required_documents = ?, description = ?
     WHERE id = ?`,
    [name, department, category, parseFloat(budget), location, deadline, eligibility, docString, description, req.params.id],
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

module.exports = router;
