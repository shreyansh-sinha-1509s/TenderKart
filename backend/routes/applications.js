const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = "student_secret_key_12345";

// Auth checking middleware for authenticated contractors
function checkContractorAuth(req, res, next) {
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

// 1. GET /api/applications/my - Retrieve applications & performance stats for logged-in contractor
router.get("/my", checkContractorAuth, (req, res) => {
  const contractorId = req.user.id;

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
      t.name AS tender_name,
      t.category AS tender_category,
      t.department AS tender_department,
      t.location AS tender_location,
      t.budget AS tender_budget,
      t.deadline AS tender_deadline,
      t.eligibility AS tender_eligibility,
      t.required_documents AS tender_required_docs
    FROM applications a
    JOIN tenders t ON a.tender_id = t.id
    WHERE a.contractor_id = ?
    ORDER BY a.applied_on DESC, a.id DESC
  `;

  db.query(query, [contractorId], (err, results) => {
    if (err) {
      console.error("Error fetching contractor applications:", err);
      return res.status(500).json({ message: "Error fetching applications" });
    }

    const applications = results.map(row => {
      let missingDocs = [];
      let requiredDocs = [];
      try {
        missingDocs = JSON.parse(row.missing_documents || "[]");
      } catch (e) {
        missingDocs = row.missing_documents ? [row.missing_documents] : [];
      }
      try {
        requiredDocs = JSON.parse(row.tender_required_docs || "[]");
      } catch (e) {
        requiredDocs = [];
      }

      return {
        ...row,
        missing_documents: missingDocs,
        tender_required_docs: requiredDocs
      };
    });

    // Compute metrics
    const total = applications.length;
    let won = 0;
    let notAwarded = 0;
    let pending = 0;
    let withdrawn = 0;

    const categoryStatsMap = {};

    applications.forEach(app => {
      const status = (app.application_status || "").trim();
      const outcome = (app.outcome || "").trim();

      if (status === "Won" || outcome === "Won") {
        won++;
      } else if (status === "Not Awarded" || outcome === "Not Awarded") {
        notAwarded++;
      } else if (status === "Withdrawn" || outcome === "Withdrawn") {
        withdrawn++;
      } else {
        pending++;
      }

      // Category breakdown
      const cat = app.tender_category || "Other";
      if (!categoryStatsMap[cat]) {
        categoryStatsMap[cat] = { category: cat, total: 0, won: 0, notAwarded: 0, pending: 0 };
      }
      categoryStatsMap[cat].total++;
      if (status === "Won" || outcome === "Won") {
        categoryStatsMap[cat].won++;
      } else if (status === "Not Awarded" || outcome === "Not Awarded") {
        categoryStatsMap[cat].notAwarded++;
      } else if (status === "Withdrawn" || outcome === "Withdrawn") {
        // withdrawn
      } else {
        categoryStatsMap[cat].pending++;
      }
    });

    // Win rate = Confirmed Wins / (Confirmed Wins + Confirmed Unsuccessful) * 100
    // Exclude pending and withdrawn from denominator.
    const decided = won + notAwarded;
    const winRate = decided > 0 ? parseFloat(((won / decided) * 100).toFixed(1)) : null;
    const winRateDisplay = winRate !== null ? `${winRate}%` : "Not enough completed outcomes to calculate win rate.";
    const categories = Object.values(categoryStatsMap);

    res.json({
      totalApplications: total,
      won,
      notAwarded,
      pending,
      withdrawn,
      decidedApplications: decided,
      winRate,
      winRateDisplay,
      categories,
      categoryStats: categories,
      summary: {
        total,
        won,
        notAwarded,
        pending,
        withdrawn,
        decided,
        winRate,
        winRateDisplay
      },
      applications
    });
  });
});

// 2. GET /api/applications/:id - Detailed analysis view of a single application
router.get("/:id", checkContractorAuth, (req, res) => {
  const applicationId = req.params.id;
  const userId = req.user.id;
  const userRole = (req.user.role || "").toLowerCase();

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
      t.name AS tender_name,
      t.category AS tender_category,
      t.department AS tender_department,
      t.location AS tender_location,
      t.budget AS tender_budget,
      t.deadline AS tender_deadline,
      t.eligibility AS tender_eligibility,
      t.required_documents AS tender_required_docs,
      t.description AS tender_description,
      u.name AS evaluator_name,
      u.department AS evaluator_department
    FROM applications a
    JOIN tenders t ON a.tender_id = t.id
    LEFT JOIN users u ON a.evaluator_id = u.id
    WHERE a.id = ?
  `;

  db.query(query, [applicationId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching application" });
    if (results.length === 0) return res.status(404).json({ message: "Application not found" });

    const app = results[0];

    // Contractor can only view their own application (managers/admins can view all)
    if (userRole !== "admin" && userRole !== "manager" && app.contractor_id !== userId) {
      return res.status(403).json({ message: "Access denied. You can only view your own applications." });
    }

    try {
      app.missing_documents = JSON.parse(app.missing_documents || "[]");
    } catch (e) {
      app.missing_documents = app.missing_documents ? [app.missing_documents] : [];
    }
    try {
      app.tender_required_docs = JSON.parse(app.tender_required_docs || "[]");
    } catch (e) {
      app.tender_required_docs = [];
    }

    // Build educational analysis factors based strictly on recorded database facts
    const insights = buildFactualInsights(app);

    res.json({
      application: app,
      analysis: insights,
      insights
    });
  });
});

// Helper to build factual improvement insights
function buildFactualInsights(app) {
  const findings = [];
  const status = app.application_status;
  const outcome = app.outcome;
  const bid = parseFloat(app.bid_amount);
  const budget = parseFloat(app.tender_budget);

  // 1. Budget comparison
  if (bid > 0 && budget > 0) {
    const diffPct = (((bid - budget) / budget) * 100).toFixed(1);
    if (bid > budget) {
      findings.push({
        factor: "Bid Price vs. Estimated Budget",
        type: "warning",
        observation: `The recorded bid amount (₹${(bid / 10000000).toFixed(2)} Cr) is ${diffPct}% above the estimated tender budget allocation (₹${(budget / 10000000).toFixed(2)} Cr).`,
        whyItMatters: "The difference may deserve review, although the estimated budget is not necessarily the final accepted bid price or a strict eligibility limit.",
        recommendedAction: "Review the tender's financial requirements, quantities, scope of work, and pricing assumptions before finalizing the next bid."
      });
    } else {
      findings.push({
        factor: "Bid Price vs. Estimated Budget",
        type: "positive",
        observation: `The recorded bid amount (₹${(bid / 10000000).toFixed(2)} Cr) is within the sanctioned public outlay (₹${(budget / 10000000).toFixed(2)} Cr, variance: ${diffPct}%).`,
        whyItMatters: "Financial bids strictly aligned with the department's authorized ceiling provide competitive viability during L1 cost-quality scoring.",
        recommendedAction: "Maintain detailed unit-rate analysis and risk contingencies on material price inflation for upcoming bids."
      });
    }
  }

  // 2. Missing documents & checklist
  if (Array.isArray(app.missing_documents) && app.missing_documents.length > 0) {
    findings.push({
      factor: "Document Compliance & Completeness",
      type: "danger",
      observation: `A required document is marked as missing in the evaluation feedback: "${app.missing_documents.join(', ')}".`,
      whyItMatters: "Incomplete documentation may cause an application to fail the preliminary technical compliance review before commercial bids are opened.",
      recommendedAction: "Review the tender's document checklist before submission and verify each required attachment with digital signature."
    });
  } else if (app.tender_required_docs && app.tender_required_docs.length > 0) {
    findings.push({
      factor: "Required Documentation Checklist",
      type: "info",
      observation: `Tender requires ${app.tender_required_docs.length} mandatory compliance certificates (including ${app.tender_required_docs.slice(0, 2).join(', ')}).`,
      whyItMatters: "Rigorous verification of statutory documents (GST, Class-A registrations, solvency letters) is mandatory for government contracts.",
      recommendedAction: "Pre-assemble an updated statutory document folder refreshed quarterly to speed up application filings."
    });
  }

  // 3. Submission timing & deadline
  if (app.applied_on && app.tender_deadline) {
    const applied = new Date(app.applied_on);
    const deadline = new Date(app.tender_deadline);
    const diffDays = Math.ceil((deadline - applied) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      findings.push({
        factor: "Submission Schedule & Timeliness",
        type: "positive",
        observation: `Application was recorded on ${app.applied_on}, ${diffDays === 0 ? 'on the deadline day' : `${diffDays} days before the deadline`} (${app.tender_deadline}).`,
        whyItMatters: "Timely filing avoids e-procurement portal server congestion and ensures bid validity bank guarantees are properly registered.",
        recommendedAction: "Continue planning bid uploads at least 48 to 72 hours ahead of the closing hour."
      });
    } else {
      findings.push({
        factor: "Submission Schedule & Timeliness",
        type: "warning",
        observation: `Application recording date (${app.applied_on}) is post deadline date (${app.tender_deadline}).`,
        whyItMatters: "Tenders submitted after deadline hours are rejected unconditionally by procurement portals.",
        recommendedAction: "Set calendar alerts 7 days prior to tender closing date."
      });
    }
  }

  // 4. Official evaluator feedback
  if (app.evaluation_notes && app.evaluation_notes.trim()) {
    findings.push({
      factor: "Official Evaluator Review Notes",
      type: outcome === "Won" ? "positive" : (outcome === "Not Awarded" ? "danger" : "info"),
      observation: `Procurement authority note: "${app.evaluation_notes.trim()}"`,
      whyItMatters: "Direct feedback from departmental technical review committees provides factual insight into compliance strengths or gaps.",
      recommendedAction: outcome === "Won" 
        ? "Document the successful technical proposal structure as a reusable baseline for similar contracts."
        : "Address the specific committee remarks in pre-bid meetings for subsequent procurement cycles."
    });
  } else if (outcome === "Not Awarded") {
    findings.push({
      factor: "Outcome Assessment",
      type: "neutral",
      observation: "Not enough information to identify the reason for this outcome.",
      whyItMatters: "Contract award decisions consider multiple factors including competitor pricing, financial turnover, and past technical execution track-record.",
      recommendedAction: "Contact procuring authority during the post-evaluation debriefing window to request factual scoring sheets."
    });
  }

  const normalizedFindings = findings.map(f => ({
    ...f,
    why_it_matters: f.whyItMatters || f.why_it_matters,
    whyItMatters: f.whyItMatters || f.why_it_matters,
    recommended_action: f.recommendedAction || f.recommended_action,
    recommendedAction: f.recommendedAction || f.recommended_action
  }));

  return {
    findings: normalizedFindings,
    educationalDisclaimer: "Tender Performance Insights provides educational feedback based strictly on recorded submission facts. Does not represent official procurement arbitration."
  };
}

// 3. POST /api/applications - Track / Record an application for current contractor
router.post("/", checkContractorAuth, (req, res) => {
  const contractorId = req.user.id;
  const { tender_id, bid_amount, applied_on, proposal_notes } = req.body;

  if (!tender_id) {
    return res.status(400).json({ message: "Tender ID is required." });
  }

  const parsedBid = parseFloat(bid_amount);
  if (isNaN(parsedBid) || parsedBid <= 0) {
    return res.status(400).json({ message: "Please provide a valid bid amount in INR." });
  }

  const submissionDate = applied_on && applied_on.trim() 
    ? applied_on.trim() 
    : new Date().toISOString().split("T")[0];

  // 1. Verify tender exists
  db.query("SELECT id, name FROM tenders WHERE id = ? LIMIT 1", [tender_id], (tErr, tResults) => {
    if (tErr) return res.status(500).json({ message: "Database error validating tender" });
    if (tResults.length === 0) return res.status(404).json({ message: "Tender does not exist." });

    // 2. Prevent duplicate application for same contractor and tender
    db.query(
      "SELECT id, application_code, application_status FROM applications WHERE contractor_id = ? AND tender_id = ? LIMIT 1",
      [contractorId, tender_id],
      (dupErr, dupResults) => {
        if (dupErr) return res.status(500).json({ message: "Database error checking duplicates" });
        if (dupResults.length > 0) {
          return res.status(409).json({
            message: `You have already recorded an application (${dupResults[0].application_code}) for this tender with status "${dupResults[0].application_status}".`,
            application: dupResults[0]
          });
        }

        // 3. Determine next application code
        db.query("SELECT COUNT(*) as count FROM applications", [], (cErr, cResults) => {
          const totalCount = (cResults && cResults[0] ? cResults[0].count : 0) + 1;
          const appCode = `APP-${1000 + totalCount}`;

          const insertSql = `
            INSERT INTO applications (
              application_code, contractor_id, tender_id, applied_on, bid_amount, 
              application_status, outcome, proposal_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'Submitted', 'Pending', ?, datetime('now'), datetime('now'))
          `;

          db.query(
            insertSql,
            [appCode, contractorId, tender_id, submissionDate, parsedBid, proposal_notes || null],
            (inErr, inResult) => {
              if (inErr) {
                console.error("Error creating application:", inErr);
                return res.status(500).json({ message: "Failed to record application: " + inErr.message });
              }

              // Also create an in-app notification for the user
              db.query(
                `INSERT INTO notifications (user_id, title, message, created_at)
                 VALUES (?, 'Application Recorded', ?, datetime('now'))`,
                [contractorId, `Application ${appCode} for "${tResults[0].name}" was recorded successfully.`]
              );

              res.status(201).json({
                message: "Application recorded successfully!",
                application: {
                  id: inResult.insertId,
                  application_code: appCode,
                  tender_id,
                  applied_on: submissionDate,
                  bid_amount: parsedBid,
                  application_status: "Submitted",
                  outcome: "Pending"
                }
              });
            }
          );
        });
      }
    );
  });
});

// 4. PUT /api/applications/:id/withdraw - Voluntary withdrawal by contractor
router.put("/:id/withdraw", checkContractorAuth, (req, res) => {
  const applicationId = req.params.id;
  const contractorId = req.user.id;

  db.query(
    "SELECT id, application_status, outcome FROM applications WHERE id = ? AND contractor_id = ? LIMIT 1",
    [applicationId, contractorId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0) return res.status(404).json({ message: "Application not found or unauthorized" });

      const current = results[0];
      if (current.application_status === "Won" || current.application_status === "Not Awarded") {
        return res.status(400).json({ message: "Cannot withdraw an application that has already reached a final decision." });
      }

      db.query(
        `UPDATE applications 
         SET application_status = 'Withdrawn', outcome = 'Withdrawn', updated_at = datetime('now')
         WHERE id = ? AND contractor_id = ?`,
        [applicationId, contractorId],
        (uErr) => {
          if (uErr) return res.status(500).json({ message: "Failed to withdraw application" });
          res.json({ message: "Application withdrawn successfully." });
        }
      );
    }
  );
});

module.exports = router;
