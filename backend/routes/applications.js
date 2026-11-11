const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateUser, requireContractor } = require("../middleware/auth");
const {
  CONTRACTOR_APPLICATION_STATUSES,
  mapApplicationOutcome,
  summarizeApplications
} = require("../constants");

const APPLICATION_SELECT_FIELDS = `
  a.id,
  a.application_code,
  a.contractor_id,
  a.tender_id,
  a.applied_on,
  a.bid_amount,
  a.portal_name,
  a.reference_number,
  a.application_status,
  a.outcome,
  a.proposal_notes,
  a.missing_documents,
  a.evaluation_notes,
  a.evaluator_id,
  a.evaluated_at,
  a.created_at,
  a.updated_at,
  t.name AS tender_name,
  t.category AS tender_category,
  t.department AS tender_department,
  t.location AS tender_location,
  t.state AS tender_state,
  t.budget AS tender_budget,
  t.deadline AS tender_deadline,
  t.eligibility AS tender_eligibility,
  t.required_documents AS tender_required_docs,
  t.source_url AS tender_source_url
`;

function validateApplicationFields(body, { isEdit = false } = {}) {
  const {
    tender_id,
    applied_on,
    portal_name,
    reference_number,
    application_status,
    status,
    bid_amount,
    proposal_notes,
    notes
  } = body || {};

  const parsedTenderId = tender_id !== undefined && tender_id !== null && String(tender_id).trim() !== ""
    ? parseInt(tender_id, 10)
    : null;
  if (!isEdit && (!parsedTenderId || isNaN(parsedTenderId))) {
    return { error: "Please select a valid tender." };
  }
  if (parsedTenderId !== null && (isNaN(parsedTenderId) || parsedTenderId <= 0)) {
    return { error: "Selected tender ID is invalid." };
  }

  const cleanDate = (applied_on || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || isNaN(Date.parse(cleanDate))) {
    return { error: "Please provide a valid application submission date (YYYY-MM-DD)." };
  }

  const cleanPortal = (portal_name || "").trim();
  if (!cleanPortal) {
    return { error: "Official Portal Name is required." };
  }
  if (cleanPortal.length > 160) {
    return { error: "Official Portal Name must be 160 characters or fewer." };
  }

  const cleanRef = (reference_number || "").trim();
  if (!cleanRef) {
    return { error: "Application / Bid Reference Number is required." };
  }
  if (cleanRef.length > 120) {
    return { error: "Reference Number must be 120 characters or fewer." };
  }

  const rawStatus = (application_status || status || "Submitted").trim();
  if (!CONTRACTOR_APPLICATION_STATUSES.includes(rawStatus)) {
    return {
      error: `Invalid submission status. Allowed values: ${CONTRACTOR_APPLICATION_STATUSES.join(", ")}.`
    };
  }

  let parsedBid = null;
  if (bid_amount !== undefined && bid_amount !== null && String(bid_amount).trim() !== "") {
    parsedBid = parseFloat(bid_amount);
    if (isNaN(parsedBid) || parsedBid <= 0) {
      return { error: "Bid Amount Quoted must be a positive number in INR." };
    }
  }

  const rawNotes = proposal_notes !== undefined ? proposal_notes : notes;
  const cleanNotes = rawNotes && String(rawNotes).trim() ? String(rawNotes).trim() : null;

  return {
    value: {
      tender_id: parsedTenderId,
      applied_on: cleanDate,
      portal_name: cleanPortal,
      reference_number: cleanRef,
      application_status: rawStatus,
      outcome: mapApplicationOutcome(rawStatus),
      bid_amount: parsedBid,
      proposal_notes: cleanNotes
    }
  };
}

// 1. GET /api/applications/my - Retrieve applications & performance stats for logged-in contractor
router.get("/my", requireContractor, (req, res) => {
  const contractorId = req.user.id;

  const query = `
    SELECT
      ${APPLICATION_SELECT_FIELDS}
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

    const applications = results.map((row) => {
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

    const stats = summarizeApplications(applications);
    const categoryStatsMap = {};

    applications.forEach((app) => {
      const status = (app.application_status || "").trim();
      const outcome = (app.outcome || "").trim();
      const cat = app.tender_category || "Other";
      if (!categoryStatsMap[cat]) {
        categoryStatsMap[cat] = { category: cat, total: 0, won: 0, notAwarded: 0, pending: 0 };
      }
      categoryStatsMap[cat].total++;
      if (status === "Won" || outcome === "Won") {
        categoryStatsMap[cat].won++;
      } else if (["Lost", "Not Awarded", "Rejected"].includes(status) || ["Lost", "Not Awarded", "Rejected"].includes(outcome)) {
        categoryStatsMap[cat].notAwarded++;
      } else if (status !== "Withdrawn" && outcome !== "Withdrawn") {
        categoryStatsMap[cat].pending++;
      }
    });

    const decided = stats.won + stats.lost;
    const winRate = decided > 0 ? parseFloat(((stats.won / decided) * 100).toFixed(1)) : null;
    const winRateDisplay = winRate !== null ? `${winRate}%` : "Not enough completed outcomes to calculate win rate.";
    const categories = Object.values(categoryStatsMap);

    res.json({
      totalApplications: stats.total,
      submitted: stats.submitted,
      underReview: stats.underReview,
      won: stats.won,
      lost: stats.lost,
      notAwarded: stats.notAwarded,
      pending: stats.pending,
      withdrawn: stats.withdrawn,
      decidedApplications: decided,
      winRate,
      winRateDisplay,
      categories,
      categoryStats: categories,
      summary: {
        total: stats.total,
        submitted: stats.submitted,
        underReview: stats.underReview,
        won: stats.won,
        lost: stats.lost,
        notAwarded: stats.notAwarded,
        pending: stats.pending,
        withdrawn: stats.withdrawn,
        decided,
        winRate,
        winRateDisplay
      },
      applications
    });
  });
});

// 2. GET /api/applications/:id - Detailed analysis view of a single application
// Enforces contractor ownership OR manager state restriction OR Central Admin supervision
router.get("/:id", authenticateUser, (req, res) => {
  const applicationId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  const query = `
    SELECT
      ${APPLICATION_SELECT_FIELDS},
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

    if (userRole === "contractor" && app.contractor_id !== userId) {
      return res.status(403).json({ message: "Access denied. You can only view your own applications." });
    }
    if (
      userRole === "manager" &&
      (app.tender_state || "").toLowerCase() !== (req.user.office_state || "").toLowerCase()
    ) {
      return res.status(403).json({
        message: "Access denied. You can only view applications for tenders in your assigned state."
      });
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

    const insights = buildFactualInsights(app);

    res.json({
      application: app,
      analysis: insights,
      insights
    });
  });
});

function buildFactualInsights(app) {
  const findings = [];
  const outcome = app.outcome;
  const bid = parseFloat(app.bid_amount);
  const budget = parseFloat(app.tender_budget);

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

  if (Array.isArray(app.missing_documents) && app.missing_documents.length > 0) {
    findings.push({
      factor: "Document Compliance & Completeness",
      type: "danger",
      observation: `A required document is marked as missing in the evaluation feedback: "${app.missing_documents.join(", ")}".`,
      whyItMatters: "Incomplete documentation may cause an application to fail the preliminary technical compliance review before commercial bids are opened.",
      recommendedAction: "Review the tender's document checklist before submission and verify each required attachment with digital signature."
    });
  } else if (app.tender_required_docs && app.tender_required_docs.length > 0) {
    findings.push({
      factor: "Required Documentation Checklist",
      type: "info",
      observation: `Tender requires ${app.tender_required_docs.length} mandatory compliance certificates (including ${app.tender_required_docs.slice(0, 2).join(", ")}).`,
      whyItMatters: "Rigorous verification of statutory documents (GST, Class-A registrations, solvency letters) is mandatory for government contracts.",
      recommendedAction: "Pre-assemble an updated statutory document folder refreshed quarterly to speed up application filings."
    });
  }

  if (app.applied_on && app.tender_deadline) {
    const applied = new Date(app.applied_on);
    const deadline = new Date(app.tender_deadline);
    const diffDays = Math.ceil((deadline.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      findings.push({
        factor: "Submission Schedule & Timeliness",
        type: "positive",
        observation: `Application was recorded on ${app.applied_on}, ${diffDays === 0 ? "on the deadline day" : `${diffDays} days before the deadline`} (${app.tender_deadline}).`,
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

  if (app.evaluation_notes && app.evaluation_notes.trim()) {
    findings.push({
      factor: "Official Evaluator Review Notes",
      type: outcome === "Won" ? "positive" : (["Lost", "Not Awarded", "Rejected"].includes(outcome) ? "danger" : "info"),
      observation: `Procurement authority note: "${app.evaluation_notes.trim()}"`,
      whyItMatters: "Direct feedback from departmental technical review committees provides factual insight into compliance strengths or gaps.",
      recommendedAction: outcome === "Won"
        ? "Document the successful technical proposal structure as a reusable baseline for similar contracts."
        : "Address the specific committee remarks in pre-bid meetings for subsequent procurement cycles."
    });
  } else if (["Lost", "Not Awarded", "Rejected"].includes(outcome)) {
    findings.push({
      factor: "Outcome Assessment",
      type: "neutral",
      observation: "Not enough information to identify the reason for this outcome.",
      whyItMatters: "Contract award decisions consider multiple factors including competitor pricing, financial turnover, and past technical execution track-record.",
      recommendedAction: "Contact procuring authority during the post-evaluation debriefing window to request factual scoring sheets."
    });
  }

  const normalizedFindings = findings.map((f) => ({
    ...f,
    why_it_matters: f.whyItMatters,
    recommended_action: f.recommendedAction
  }));

  return {
    findings: normalizedFindings,
    educationalDisclaimer: "Tender Performance Insights provides educational feedback based strictly on recorded submission facts. Does not represent official procurement arbitration."
  };
}

// 3. POST /api/applications - Record an application (Contractors only)
router.post("/", requireContractor, async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { error, value } = validateApplicationFields(req.body, { isEdit: false });
    if (error) {
      return res.status(400).json({ message: error });
    }

    const tender = await db.getAsync("SELECT id, name, state FROM tenders WHERE id = ? LIMIT 1", [value.tender_id]);
    if (!tender) {
      return res.status(404).json({ message: "Selected tender does not exist." });
    }

    const dup = await db.getAsync(
      "SELECT id, application_code, application_status FROM applications WHERE contractor_id = ? AND tender_id = ? LIMIT 1",
      [contractorId, value.tender_id]
    );
    if (dup) {
      return res.status(409).json({
        message: `You have already recorded an application (${dup.application_code}) for this tender with status "${dup.application_status}". You can edit it from My Applications.`,
        application: dup
      });
    }

    const maxRow = await db.getAsync("SELECT MAX(id) AS maxId FROM applications");
    const appCode = `APP-${1001 + (maxRow && maxRow.maxId ? maxRow.maxId : 0)}`;

    const inResult = await db.queryAsync(
      `INSERT INTO applications (
        application_code, contractor_id, tender_id, applied_on, bid_amount,
        portal_name, reference_number, application_status, outcome, proposal_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        appCode,
        contractorId,
        value.tender_id,
        value.applied_on,
        value.bid_amount,
        value.portal_name,
        value.reference_number,
        value.application_status,
        value.outcome,
        value.proposal_notes
      ]
    );

    const created = await db.getAsync(
      `SELECT ${APPLICATION_SELECT_FIELDS}
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       WHERE a.id = ? LIMIT 1`,
      [inResult.insertId]
    );

    await db.queryAsync(
      `INSERT INTO notifications (user_id, title, message, created_at)
       VALUES (?, 'Application Recorded', ?, datetime('now'))`,
      [contractorId, `Application ${appCode} (${value.reference_number}) for "${tender.name}" was recorded as ${value.application_status}.`]
    );

    // Notify assigned state manager if approved & active
    if (tender.state) {
      const stateManager = await db.getAsync(
        "SELECT id FROM users WHERE role = 'manager' AND LOWER(office_state) = LOWER(?) AND approval_status = 'Approved' AND is_active = 1 LIMIT 1",
        [tender.state]
      );
      if (stateManager) {
        await db.queryAsync(
          `INSERT INTO notifications (user_id, title, message, created_at)
           VALUES (?, 'New State Bid Application', ?, datetime('now'))`,
          [stateManager.id, `${req.user.company || req.user.name} recorded ${appCode} (Ref: ${value.reference_number}) for "${tender.name}" (${tender.state}).`]
        );
      }
    }

    db.logActivity({
      actor_user_id: contractorId,
      actor_role: "contractor",
      action_type: "application_submitted",
      entity_type: "application",
      entity_id: inResult.insertId,
      state: tender.state,
      details: `Application ${appCode} (${value.portal_name}, Ref: ${value.reference_number}) recorded as ${value.application_status} for "${tender.name.slice(0, 60)}"`
    });

    return res.status(201).json({
      message: "Application recorded successfully!",
      application: created
    });
  } catch (err) {
    console.error("Error creating application:", err);
    return res.status(500).json({ message: "Failed to record application: " + err.message });
  }
});

// 4. PUT /api/applications/:id - Edit contractor's own recorded application
router.put("/:id", requireContractor, async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const contractorId = req.user.id;

    if (isNaN(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID." });
    }

    const existing = await db.getAsync(
      `SELECT a.*, t.state AS tender_state, t.name AS tender_name
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       WHERE a.id = ? LIMIT 1`,
      [applicationId]
    );
    if (!existing) {
      return res.status(404).json({ message: "Application not found." });
    }
    if (existing.contractor_id !== contractorId) {
      return res.status(403).json({ message: "Access denied. You can only edit your own applications." });
    }

    const { error, value } = validateApplicationFields(req.body, { isEdit: true });
    if (error) {
      return res.status(400).json({ message: error });
    }

    const targetTenderId = value.tender_id || existing.tender_id;
    const targetTender = await db.getAsync("SELECT id, name, state FROM tenders WHERE id = ? LIMIT 1", [targetTenderId]);
    if (!targetTender) {
      return res.status(404).json({ message: "Selected tender does not exist." });
    }

    if (targetTenderId !== existing.tender_id) {
      const dup = await db.getAsync(
        "SELECT id, application_code FROM applications WHERE contractor_id = ? AND tender_id = ? AND id != ? LIMIT 1",
        [contractorId, targetTenderId, applicationId]
      );
      if (dup) {
        return res.status(409).json({
          message: `You already have another application (${dup.application_code}) recorded for the selected tender.`
        });
      }
    }

    await db.queryAsync(
      `UPDATE applications
       SET tender_id = ?, applied_on = ?, portal_name = ?, reference_number = ?,
           application_status = ?, outcome = ?, bid_amount = ?, proposal_notes = ?,
           updated_at = datetime('now')
       WHERE id = ? AND contractor_id = ?`,
      [
        targetTenderId,
        value.applied_on,
        value.portal_name,
        value.reference_number,
        value.application_status,
        value.outcome,
        value.bid_amount,
        value.proposal_notes,
        applicationId,
        contractorId
      ]
    );

    const updated = await db.getAsync(
      `SELECT ${APPLICATION_SELECT_FIELDS}
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       WHERE a.id = ? LIMIT 1`,
      [applicationId]
    );

    db.logActivity({
      actor_user_id: contractorId,
      actor_role: "contractor",
      action_type: "application_updated",
      entity_type: "application",
      entity_id: applicationId,
      state: targetTender.state,
      details: `Application ${existing.application_code} updated (${value.application_status}, Ref: ${value.reference_number})`
    });

    return res.json({
      message: "Application updated successfully!",
      application: updated
    });
  } catch (err) {
    console.error("Error updating application:", err);
    return res.status(500).json({ message: "Failed to update application: " + err.message });
  }
});

// 5. PUT /api/applications/:id/withdraw - Voluntary withdrawal by contractor
router.put("/:id/withdraw", requireContractor, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const contractorId = req.user.id;

    const current = await db.getAsync(
      `SELECT a.id, a.contractor_id, a.application_code, a.application_status, a.outcome, t.state
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       WHERE a.id = ? LIMIT 1`,
      [applicationId]
    );

    if (!current) {
      return res.status(404).json({ message: "Application not found." });
    }
    if (current.contractor_id !== contractorId) {
      return res.status(403).json({ message: "Access denied. You can only withdraw your own applications." });
    }

    if (["Won", "Lost", "Not Awarded", "Rejected"].includes(current.application_status)) {
      return res.status(400).json({ message: "Cannot withdraw an application that has already reached a final outcome." });
    }

    await db.queryAsync(
      `UPDATE applications
       SET application_status = 'Withdrawn', outcome = 'Withdrawn', updated_at = datetime('now')
       WHERE id = ? AND contractor_id = ?`,
      [applicationId, contractorId]
    );

    db.logActivity({
      actor_user_id: contractorId,
      actor_role: "contractor",
      action_type: "application_withdrawn",
      entity_type: "application",
      entity_id: current.id,
      state: current.state,
      details: `Application ${current.application_code} withdrawn by contractor.`
    });

    return res.json({ message: "Application withdrawn successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to withdraw application" });
  }
});

module.exports = router;
