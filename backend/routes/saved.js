const express = require("express");
const router = express.Router();
const db = require("../db");
const { computeEffectiveTenderStatus } = require("../constants");
const { requireContractor } = require("../middleware/auth");

// 1. Get all saved tenders for the logged-in contractor only
router.get("/", requireContractor, (req, res) => {
  db.query(
    `SELECT t.*, s.created_at AS saved_at
     FROM tenders t
     JOIN saved_tenders s ON t.id = s.tender_id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC, t.id DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });

      const parsedResults = (results || []).map((t) => {
        let docs = [];
        try {
          docs = JSON.parse(t.required_documents || "[]");
        } catch {
          docs = [];
        }
        return {
          ...t,
          tender_code: t.tender_code || `TK-${String(t.id).padStart(4, "0")}`,
          status: computeEffectiveTenderStatus(t.deadline, t.status),
          raw_status: t.status || "Open",
          required_documents: docs
        };
      });

      return res.json(parsedResults);
    }
  );
});

// 2. Toggle Save / Remove Bookmark (Contractors only)
router.post("/:id/save", requireContractor, async (req, res) => {
  try {
    const tenderId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(tenderId)) {
      return res.status(400).json({ message: "Invalid tender ID." });
    }

    const tender = await db.getAsync("SELECT id, name, state FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!tender) {
      return res.status(404).json({ message: "Tender not found." });
    }

    const existing = await db.getAsync(
      "SELECT 1 FROM saved_tenders WHERE user_id = ? AND tender_id = ? LIMIT 1",
      [userId, tenderId]
    );

    if (existing) {
      await db.queryAsync(
        "DELETE FROM saved_tenders WHERE user_id = ? AND tender_id = ?",
        [userId, tenderId]
      );
      return res.json({ saved: false, message: "Tender removed from Saved Tenders" });
    } else {
      await db.queryAsync(
        "INSERT INTO saved_tenders (user_id, tender_id, created_at) VALUES (?, ?, datetime('now'))",
        [userId, tenderId]
      );
      return res.json({ saved: true, message: "Tender saved successfully" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
