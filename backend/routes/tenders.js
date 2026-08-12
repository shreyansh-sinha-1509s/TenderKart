const express = require("express");
const router = express.Router();
const db = require("../db");

// 1. Get Tenders (with dynamic filters)
router.get("/", (req, res) => {
  const { search, category, location, department, minBudget, maxBudget, deadline } = req.query;

  let query = "SELECT * FROM tenders WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND (name LIKE ? OR description LIKE ? OR department LIKE ? OR location LIKE ?)";
    const val = `%${search}%`;
    params.push(val, val, val, val);
  }

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (location) {
    query += " AND location LIKE ?";
    params.push(`%${location}%`);
  }

  if (department) {
    query += " AND department LIKE ?";
    params.push(`%${department}%`);
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

  query += " ORDER BY id DESC";

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    
    // Parse required_documents back to JavaScript array
    const tenders = results.map(t => {
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

// 2. Get Tender by ID
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM tenders WHERE id = ? LIMIT 1", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Tender not found" });

    const tender = results[0];
    try {
      tender.required_documents = JSON.parse(tender.required_documents || "[]");
    } catch (e) {
      tender.required_documents = [];
    }
    return res.json(tender);
  });
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

    // Local summary generator (fallback if no API key is available)
    const generateLocalSummary = () => {
      const sentences = tender.description.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
      const points = sentences.slice(0, 3).map(s => s + ".");
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
        method: "Mock AI Summarization Fallback"
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Simulate network lag and return local mock summary
      setTimeout(() => {
        return res.json(generateLocalSummary());
      }, 700);
      return;
    }

    // Call actual Gemini API if key is present
    const promptText = `
      You are an expert procurement analyst for government tenders. Summarize the following tender details into a clean JSON structure.
      Tender Name: ${tender.name}
      Department: ${tender.department}
      Category: ${tender.category}
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
