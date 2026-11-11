const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  computeEffectiveTenderStatus,
  normalizeLocationText,
  parseLocationFilter,
  normalizeState
} = require("../constants");

const NORMALIZED_LOC_SQL =
  "TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(COALESCE(location, '')), ',', ' '), '-', ' '), '–', ' '), '—', ' '), '/', ' '), '  ', ' '), '  ', ' '), '  ', ' '))";

function enrichTenderRow(row) {
  let reqDocs = [];
  try {
    reqDocs = JSON.parse(row.required_documents || "[]");
  } catch {
    reqDocs = [];
  }
  const effectiveStatus = computeEffectiveTenderStatus(row.deadline, row.status);
  return {
    ...row,
    tender_code: row.tender_code || `TK-${String(row.id).padStart(4, "0")}`,
    published_date: row.published_date || (row.created_at ? String(row.created_at).slice(0, 10) : ""),
    raw_status: row.status || "Open",
    status: effectiveStatus,
    required_documents: reqDocs
  };
}

// 1. Get Tenders (dynamic search & filter across title, category, state, location, budget, deadline, status)
router.get("/", (req, res) => {
  const { search, category, state, location, department, minBudget, maxBudget, deadline, status } = req.query;

  let query = "SELECT * FROM tenders WHERE 1=1";
  const params = [];

  if (search && search.trim()) {
    query += " AND (name LIKE ? OR description LIKE ? OR department LIKE ? OR location LIKE ? OR state LIKE ? OR COALESCE(tender_code, '') LIKE ?)";
    const val = `%${search.trim()}%`;
    params.push(val, val, val, val, val, val);
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
    const { localityTerms, stateTokens } = parseLocationFilter(location);

    // Every non-state locality segment MUST match the tender's location column (AND logic)
    for (const term of localityTerms) {
      query += ` AND ${NORMALIZED_LOC_SQL} LIKE ?`;
      params.push(`%${term}%`);
    }

    // Any state segment included in location (e.g. "Ratnagiri, Gujarat") must ALSO match via AND logic
    for (const st of stateTokens) {
      query += ` AND (LOWER(TRIM(state)) = LOWER(?) OR ${NORMALIZED_LOC_SQL} LIKE ?)`;
      params.push(st, `%${normalizeLocationText(st)}%`);
    }
  }

  if (department && department.trim()) {
    query += " AND department LIKE ?";
    params.push(`%${department.trim()}%`);
  }

  if (minBudget !== undefined && minBudget !== "") {
    const minVal = parseFloat(minBudget);
    if (!isNaN(minVal)) {
      query += " AND budget >= ?";
      params.push(minVal);
    }
  }

  if (maxBudget !== undefined && maxBudget !== "") {
    const maxVal = parseFloat(maxBudget);
    if (!isNaN(maxVal)) {
      query += " AND budget <= ?";
      params.push(maxVal);
    }
  }

  if (deadline && deadline.trim()) {
    query += " AND deadline <= ?";
    params.push(deadline.trim());
  }

  query += " ORDER BY id DESC";

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    let tenders = (results || []).map(enrichTenderRow);

    // Filter accurately on computed effective status ('Open', 'Closing Soon', 'Closed')
    if (status && typeof status === "string" && status.trim()) {
      const target = status.trim().toLowerCase();
      tenders = tenders.filter((t) => (t.status || "").toLowerCase() === target);
    }

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

    const row = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!row) {
      return res.status(404).json({ message: "Tender not found" });
    }

    return res.json(enrichTenderRow(row));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. AI Summarization Endpoint (Gemini API + factual source-grounded local fallback)
router.post("/:id/summarize", (req, res) => {
  db.query("SELECT * FROM tenders WHERE id = ? LIMIT 1", [req.params.id], async (err, results) => {
    if (err) {
      return res.status(503).json({
        message: "AI summarization is temporarily unavailable. Please try again later."
      });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Tender not found" });
    }

    const tender = enrichTenderRow(results[0]);
    const docList = Array.isArray(tender.required_documents) ? tender.required_documents : [];

    if (!tender.description || !String(tender.description).trim()) {
      return res.status(503).json({
        message: "AI summarization is temporarily unavailable because no source description is present."
      });
    }

    const generateLocalSummary = () => {
      const sentences = String(tender.description)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const summaryPoints = sentences.slice(0, 4).map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));

      const eligText = tender.eligibility && String(tender.eligibility).trim()
        ? String(tender.eligibility).split(/(?<=[.!?])\s+/)[0].trim()
        : "Not specified in tender record.";

      return {
        tenderId: tender.id,
        tenderCode: tender.tender_code,
        tenderName: tender.name,
        budget: tender.budget
          ? `INR ${(tender.budget / 10000000).toFixed(2)} Crore`
          : "Not specified",
        deadline: tender.deadline || "Not specified",
        eligibility: eligText,
        requiredDocuments: docList.slice(0, 5),
        summaryPoints,
        method: "Local Procurement Analyzer"
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(generateLocalSummary());
    }

    const promptText = `
      You are a factual government tender analyst. Summarize ONLY the provided tender fields into JSON.
      Do NOT invent, assume, or add any budget, requirement, deadline, or eligibility details not present in the source fields below.

      Tender Title: ${tender.name}
      Tender ID: ${tender.tender_code}
      Department: ${tender.department}
      Category: ${tender.category}
      State: ${tender.state}
      Location: ${tender.location}
      Estimated Budget (INR): ${tender.budget}
      Submission Deadline: ${tender.deadline}
      Eligibility Criteria: ${tender.eligibility || "Not specified"}
      Required Documents: ${docList.length ? docList.join(", ") : "None listed"}
      Source Description: ${tender.description}

      Respond ONLY with valid JSON matching this schema (no markdown blocks):
      {
        "tenderId": ${tender.id},
        "tenderCode": "${tender.tender_code}",
        "tenderName": "${tender.name.replace(/"/g, '\\"')}",
        "budget": "Formatted budget from source field",
        "deadline": "${tender.deadline}",
        "eligibility": "Factual eligibility summary strictly from source text, or 'Not specified in source details'",
        "requiredDocuments": ["Only documents listed above, if any"],
        "summaryPoints": ["3-4 concise points grounded strictly in the source description above"],
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

      if (!apiResponse.ok) {
        throw new Error(`Gemini API HTTP ${apiResponse.status}`);
      }

      const apiData = await apiResponse.json();
      const generatedText = apiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error("Empty response from Gemini API");
      }

      const cleanJsonStr = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
      const summaryObj = JSON.parse(cleanJsonStr);
      return res.json(summaryObj);
    } catch (apiErr) {
      console.warn("Gemini API unavailable, using source-grounded local fallback:", apiErr.message);
      return res.json(generateLocalSummary());
    }
  });
});

module.exports = router;
