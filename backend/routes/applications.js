const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateUser, requireContractor } = require("../middleware/auth");
const {
  CONTRACTOR_APPLICATION_STATUSES,
  isValidDateStr,
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
  a.created_at,
  a.updated_at,
  t.tender_code AS tender_code,
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
  if (!isValidDateStr(cleanDate)) {
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
      error: `Invalid application status. Allowed values: ${CONTRACTOR_APPLICATION_STATUSES.join(", ")}.`
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

// 1. GET /api/applications/my - Logged-in contractor's own application history & counts
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

    const applications = (results || []).map((row) => {
      let missingDocs = [];
      let requiredDocs = [];
      try {
        missingDocs = JSON.parse(row.missing_documents || "[]");
      } catch {
        missingDocs = row.missing_documents ? [row.missing_documents] : [];
      }
      try {
        requiredDocs = JSON.parse(row.tender_required_docs || "[]");
      } catch {
        requiredDocs = [];
      }

      return {
        ...row,
        tender_code: row.tender_code || `TK-${String(row.tender_id).padStart(4, "0")}`,
        missing_documents: missingDocs,
        tender_required_docs: requiredDocs
      };
    });

    const stats = summarizeApplications(applications);
    const decided = stats.won + stats.lost;
    const winRate = decided > 0 ? parseFloat(((stats.won / decided) * 100).toFixed(1)) : null;

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
        winRate
      },
      applications
    });
  });
});

// 2. GET /api/applications/:id - View single application (Contractor owner or Central Admin only)
router.get("/:id", authenticateUser, (req, res) => {
  const applicationId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  const query = `
    SELECT
      ${APPLICATION_SELECT_FIELDS},
      t.description AS tender_description
    FROM applications a
    JOIN tenders t ON a.tender_id = t.id
    WHERE a.id = ?
  `;

  db.query(query, [applicationId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching application" });
    if (!results || results.length === 0) return res.status(404).json({ message: "Application not found" });

    const app = results[0];

    if (userRole !== "admin" && app.contractor_id !== userId) {
      return res.status(403).json({ message: "Access denied. You can only view your own applications." });
    }

    app.tender_code = app.tender_code || `TK-${String(app.tender_id).padStart(4, "0")}`;

    try {
      app.missing_documents = JSON.parse(app.missing_documents || "[]");
    } catch {
      app.missing_documents = app.missing_documents ? [app.missing_documents] : [];
    }
    try {
      app.tender_required_docs = JSON.parse(app.tender_required_docs || "[]");
    } catch {
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
  const bid = parseFloat(app.bid_amount);
  const budget = parseFloat(app.tender_budget);

  if (bid > 0 && budget > 0) {
    const diffPct = (((bid - budget) / budget) * 100).toFixed(1);
    if (bid > budget) {
      findings.push({
        factor: "Recorded Bid vs. Estimated Budget",
        type: "financial",
        observation: `Your recorded bid (₹${(bid / 10000000).toFixed(2)} Cr) is ${diffPct}% above the tender estimated budget (₹${(budget / 10000000).toFixed(2)} Cr).`,
        whyItMatters: "Public authorities compare financial quotes against departmental cost estimates during bid evaluation.",
        recommendedAction: "Review scope quantities and rate assumptions against official authority tender conditions."
      });
    } else {
      findings.push({
        factor: "Recorded Bid vs. Estimated Budget",
        type: "financial",
        observation: `Your recorded bid (₹${(bid / 10000000).toFixed(2)} Cr) is within the estimated tender budget (₹${(budget / 10000000).toFixed(2)} Cr, variance: ${diffPct}%).`,
        whyItMatters: "Aligning quoted value with departmental estimates helps remain competitive under L1 / QCBS scoring.",
        recommendedAction: "Track official portal result announcements and update status once the authority publishes the outcome."
      });
    }
  }

  if (app.applied_on && app.tender_deadline) {
    const applied = new Date(app.applied_on);
    const deadline = new Date(app.tender_deadline);
    const diffDays = Math.ceil((deadline.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      findings.push({
        factor: "Submission Schedule",
        type: "positive",
        observation: `Submitted on ${app.applied_on}, ${diffDays === 0 ? "on the deadline date" : `${diffDays} days ahead of the ${app.tender_deadline} deadline`}.`,
        whyItMatters: "Early submission on external portals prevents portal traffic timeouts prior to closing.",
        recommendedAction: "Retain the acknowledgement receipt and reference number safely for authority verification."
      });
    } else {
      findings.push({
        factor: "Submission Schedule",
        type: "warning",
        observation: `Recorded submission date (${app.applied_on}) is after the listed tender deadline (${app.tender_deadline}).`,
        whyItMatters: "Official e-procurement portals generally close submissions strictly at the deadline timestamp.",
        recommendedAction: "Verify whether an official corrigendum extended the closing date on the portal."
      });
    }
  }

  if (Array.isArray(app.tender_required_docs) && app.tender_required_docs.length > 0) {
    findings.push({
      factor: "Document Checklist Reference",
      type: "documentation",
      observation: `This tender lists ${app.tender_required_docs.length} required compliance documents (${app.tender_required_docs.slice(0, 3).join(", ")}).`,
      whyItMatters: "Complete statutory filings (EMD, GST, PAN, solvency, registration) are checked during technical opening.",
      recommendedAction: "Confirm uploaded copies on the official portal match the required document specifications."
    });
  }

  const normalizedFindings = findings.map((f) => ({
    ...f,
    why_it_matters: f.whyItMatters,
    recommended_action: f.recommendedAction
  }));

  return {
    findings: normalizedFindings,
    educationalDisclaimer: "TenderKart records applications submitted through external government portals. Actual bid submission and procurement decisions are handled by the respective government authorities."
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

    const tender = await db.getAsync("SELECT id, tender_code, name, state FROM tenders WHERE id = ? LIMIT 1", [value.tender_id]);
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

    return res.status(201).json({
      message: "Application recorded successfully!",
      application: {
        ...created,
        tender_code: created.tender_code || `TK-${String(created.tender_id).padStart(4, "0")}`
      }
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

    return res.json({
      message: "Application updated successfully!",
      application: {
        ...updated,
        tender_code: updated.tender_code || `TK-${String(updated.tender_id).padStart(4, "0")}`
      }
    });
  } catch (err) {
    console.error("Error updating application:", err);
    return res.status(500).json({ message: "Failed to update application: " + err.message });
  }
});

module.exports = router;
