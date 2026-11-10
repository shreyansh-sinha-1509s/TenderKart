const express = require("express");
const router = express.Router();
const db = require("../db");
const { normalizeState } = require("../constants");

// 1. Get Tenders (with dynamic filters including state, category, location, department, budget, deadline)
router.get("/", (req, res) => {
  const { search, category, state, location, department, minBudget, maxBudget, deadline, status } = req.query;

  let query = "SELECT * FROM tenders WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND (name LIKE ? OR description LIKE ? OR department LIKE ? OR location LIKE ? OR state LIKE ?)";
    const val = `%${search.trim()}%`;
    params.push(val, val, val, val, val);
  }

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (state && typeof state === "string" && state.trim().length > 0) {
    const cleanState = normalizeState(state.trim()) || state.trim();
    query += " AND LOWER(state) = LOWER(?)";
    params.push(cleanState);
  }

  if (location && typeof location === "string" && location.trim().length > 0) {
    const rawLoc = location.trim();
    const resolvedState = normalizeState(rawLoc);

    if (resolvedState) {
      query += " AND (location LIKE ? OR location LIKE ? OR LOWER(state) = LOWER(?))";
      params.push(`%${rawLoc}%`, `%${resolvedState}%`, resolvedState);
    } else {
      const tokens = rawLoc.split(/[,/]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length > 1) {
        const orClauses = tokens.map(() => "(location LIKE ? OR state LIKE ?)").join(" OR ");
        query += ` AND (${orClauses})`;
        tokens.forEach((t) => params.push(`%${t}%`, `%${t}%`));
      } else {
        query += " AND (location LIKE ? OR state LIKE ?)";
        params.push(`%${rawLoc}%`, `%${rawLoc}%`);
      }
    }
  }

  if (department) {
    query += " AND department LIKE ?";
    params.push(`%${department.trim()}%`);
  }

  if (minBudget) {
    query += " AND budget >= ?";
    params.push(parseFloat(minBudget));
  }

  if (maxBudget) {
    query += " AND budget <= ?";
    params.push(parseFloat(maxBudget));
  }

  if (deadline) {
    query += " AND deadline <= ?";
    params.push(deadline);
  }

  if (status) {
    query += " AND LOWER(status) = LOWER(?)";
    params.push(status.trim());
  }

  query += " ORDER BY id ASC";

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    const tenders = results.map((t) => {
      try {
        t.required_documents = JSON.parse(t.required_documents || "[]");
      } catch (e) {
        t.required_documents = [];
      }
      return t;
    });

    return res.json(tenders);
  });
});

// 2. Get Tender by ID (tracks genuine tender views unless noTrack=1)
router.get("/:id", async (req, res) => {
  try {
    const tenderId = parseInt(req.params.id, 10);
    if (isNaN(tenderId)) {
      return res.status(400).json({ message: "Invalid tender ID" });
    }

    if (req.query.noTrack !== "1") {
      await db.queryAsync(
        "UPDATE tenders SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?",
        [tenderId]
      );
    }

    const tender = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    try {
      tender.required_documents = JSON.parse(tender.required_documents || "[]");
    } catch (e) {
      tender.required_documents = [];
    }
    return res.json(tender);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. AI Summarization Endpoint
router.post("/:id/summarize", (req, res) => {
  db.query("SELECT * FROM tenders WHERE id = ? LIMIT 1", [req.params.id], async (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Tender not found" });

    const tender = results[0];
    let docList = [];
    try {
      docList = JSON.parse(tender.required_documents || "[]");
    } catch (e) {
      docList = [];
    }

    const generateLocalSummary = () => {
      const sentences = tender.description.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
      const points = sentences.slice(0, 3).map((s) => s + ".");
      if (sentences.length > 3) {
        points.push("Includes detailed materials audits and milestone reviews.");
      }

      return {
        tenderId: tender.id,
        tenderName: tender.name,
        budget: `INR ${(tender.budget / 10000000).toFixed(2)} Crore (approx. $${(tender.budget / 83000000).toFixed(2)}M USD)`,
        deadline: tender.deadline,
        eligibility: tender.eligibility.split(".")[0] + ".",
        requiredDocuments: docList.slice(0, 3),
        summaryPoints: points,
        method: "Local Procurement Analyzer"
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setTimeout(() => {
        return res.json(generateLocalSummary());
      }, 500);
      return;
    }

    const promptText = `
      You are an expert procurement analyst for government tenders. Summarize the following tender details into a clean JSON structure.
      Tender Name: ${tender.name}
      Department: ${tender.department}
      Category: ${tender.category}
      State: ${tender.state}
      Budget: INR ${tender.budget}
      Location: ${tender.location}
      Deadline: ${tender.deadline}
      Eligibility Criteria: ${tender.eligibility}
      Full Description: ${tender.description}
      Required Documents: ${docList.join(", ")}

      Respond ONLY with a valid JSON object matching this schema. Do not include markdown codeblocks or other explanations.
      JSON Schema:
      {
        "tenderId": ${tender.id},
        "tenderName": "${tender.name}",
        "budget": "Formatted budget string (e.g. 'INR 450 Crore')",
        "deadline": "${tender.deadline}",
        "eligibility": "One-sentence executive eligibility summary",
        "requiredDocuments": ["3 key documents from the list"],
        "summaryPoints": ["3-4 clear bullet points summarizing the work scope and main technical requirements of the tender"],
        "method": "Gemini AI Summarizer"
      }
    `;

    try {
      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      const apiData = await apiResponse.json();
      const generatedText = apiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("Empty response from Gemini API");
      }

      const cleanJsonStr = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
      const summaryObj = JSON.parse(cleanJsonStr);
      return res.json(summaryObj);
    } catch (apiErr) {
      console.warn("Gemini API call failed, using local summarizer fallback:", apiErr.message);
      return res.json(generateLocalSummary());
    }
  });
});

module.exports = router;
