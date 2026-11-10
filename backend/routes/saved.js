const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireContractor } = require("../middleware/auth");

// 1. Get all saved tenders for logged-in contractor
router.get("/", requireContractor, (req, res) => {
  db.query(
    `SELECT t.* FROM tenders t
     JOIN saved_tenders s ON t.id = s.tender_id
     WHERE s.user_id = ?
     ORDER BY t.id DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });

      const parsedResults = results.map((t) => {
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

// 2. Toggle Save/Unsave status (Contractors only)
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
      return res.json({ saved: false, message: "Tender removed from saved list" });
    } else {
      await db.queryAsync(
        "INSERT INTO saved_tenders (user_id, tender_id, created_at) VALUES (?, ?, datetime('now'))",
        [userId, tenderId]
      );

      db.logActivity({
        actor_user_id: userId,
        actor_role: "contractor",
        action_type: "tender_saved",
        entity_type: "tender",
        entity_id: tenderId,
        state: tender.state,
        details: `Saved tender "${tender.name.slice(0, 60)}"`
      });

      return res.json({ saved: true, message: "Tender saved successfully" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
