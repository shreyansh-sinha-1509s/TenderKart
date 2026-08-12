const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = "student_secret_key_12345";

// Auth checking middleware
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

// 1. Get all saved tenders for logged-in user
router.get("/", checkAuth, (req, res) => {
  db.query(
    `SELECT t.* FROM tenders t 
     JOIN saved_tenders s ON t.id = s.tender_id 
     WHERE s.user_id = ? 
     ORDER BY t.id DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      
      const parsedResults = results.map(t => {
        try {
          t.required_documents = JSON.parse(t.required_documents || "[]");
        } catch (e) {
          t.required_documents = [];
        }
        return t;
      });

      return res.json(parsedResults);
    }
  );
});

// 2. Toggle Save/Unsave status
router.post("/:id/save", checkAuth, (req, res) => {
  const tenderId = parseInt(req.params.id);
  const userId = req.user.id;

  db.query(
    "SELECT 1 FROM saved_tenders WHERE user_id = ? AND tender_id = ? LIMIT 1",
    [userId, tenderId],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });

      if (results.length > 0) {
        // Already saved, let's unsave it
        db.query(
          "DELETE FROM saved_tenders WHERE user_id = ? AND tender_id = ?",
          [userId, tenderId],
          (deleteErr) => {
            if (deleteErr) return res.status(500).json({ message: deleteErr.message });
            return res.json({ saved: false, message: "Tender removed from saved list" });
          }
        );
      } else {
        // Not saved, let's save it
        db.query(
          "INSERT INTO saved_tenders (user_id, tender_id) VALUES (?, ?)",
          [userId, tenderId],
          (insertErr) => {
            if (insertErr) return res.status(500).json({ message: insertErr.message });
            return res.json({ saved: true, message: "Tender saved successfully" });
          }
        );
      }
    }
  );
});

module.exports = router;
