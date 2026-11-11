const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  ALLOWED_CATEGORIES,
  TENDER_STATUSES,
  getLocalDateStr,
  isValidDateStr,
  isValidHttpUrl,
  computeStatusFromDeadline,
  computeEffectiveTenderStatus,
  normalizeState
} = require("../constants");
const { requireAdmin } = require("../middleware/auth");

// Strictly Central Admin ONLY across ALL /api/admin endpoints
router.use(requireAdmin);

function formatAdminTender(row) {
  let reqDocs = [];
  try {
    reqDocs = JSON.parse(row.required_documents || "[]");
  } catch {
    reqDocs = [];
  }
  const todayStr = getLocalDateStr();
  const effectiveStatus = computeEffectiveTenderStatus(row.deadline, row.status);
  return {
    ...row,
    tender_code: row.tender_code || `TK-${String(row.id).padStart(4, "0")}`,
    published_date: row.published_date || (row.created_at ? String(row.created_at).slice(0, 10) : todayStr),
    raw_status: row.status || "Open",
    status: effectiveStatus,
    deadline_passed: Boolean(row.deadline && row.deadline < todayStr),
    required_documents: reqDocs
  };
}

function validateTenderPayload(body = {}, existing = null) {
  const name = (body.name ?? existing?.name ?? "").trim();
  const rawCode = (body.tender_code ?? existing?.tender_code ?? "").trim();
  const category = (body.category ?? existing?.category ?? "").trim();
  const rawState = (body.state ?? existing?.state ?? "").trim();
  const location = (body.location ?? existing?.location ?? "").trim();
  const department = (body.department ?? existing?.department ?? "").trim();
  const budgetRaw = body.budget !== undefined ? body.budget : existing?.budget;
  const publishedDate = (body.published_date ?? existing?.published_date ?? getLocalDateStr()).trim();
  const deadline = (body.deadline ?? existing?.deadline ?? "").trim();
  const description = (body.description ?? existing?.description ?? "").trim();
  const sourceUrl = (body.source_url ?? existing?.source_url ?? "").trim();
  const statusInput = (body.status ?? existing?.status ?? "").trim();

  if (!name || name.length < 5) {
    return { error: "Tender title must be at least 5 characters long." };
  }
  if (!rawCode) {
    return { error: "Tender ID is required (e.g., TK-0070)." };
  }
  if (rawCode.length > 60) {
    return { error: "Tender ID must be 60 characters or fewer." };
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return { error: `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.` };
  }

  const cleanState = normalizeState(rawState);
  if (!cleanState) {
    return { error: "Please select a valid Indian State or Union Territory." };
  }
  if (!location) {
    return { error: "Location (city / corridor) is required." };
  }
  if (!department) {
    return { error: "Procuring Department is required." };
  }

  const parsedBudget = parseFloat(budgetRaw);
  if (isNaN(parsedBudget) || !isFinite(parsedBudget) || parsedBudget <= 0) {
    return { error: "Estimated budget must be a valid positive number in INR." };
  }

  if (!isValidDateStr(publishedDate)) {
    return { error: "Published date must be a valid date (YYYY-MM-DD)." };
  }
  if (!isValidDateStr(deadline)) {
    return { error: "Submission deadline must be a valid date (YYYY-MM-DD)." };
  }
  if (deadline < publishedDate) {
    return { error: "Submission deadline cannot be earlier than the published date." };
  }

  if (!description || description.length < 15) {
    return { error: "Tender description must be at least 15 characters long." };
  }

  if (!sourceUrl || !isValidHttpUrl(sourceUrl)) {
    return { error: "Official government portal link must be a valid http:// or https:// URL." };
  }

  let finalStatus = statusInput || computeStatusFromDeadline(deadline);
  if (!TENDER_STATUSES.includes(finalStatus)) {
    return { error: `Tender status must be one of: ${TENDER_STATUSES.join(", ")}.` };
  }
  const todayStr = getLocalDateStr();
  if (finalStatus !== "Closed" && deadline < todayStr) {
    return {
      error: `Cannot set status to "${finalStatus}" because the submission deadline (${deadline}) has already passed. Extend the deadline or set status to "Closed".`
    };
  }

  const eligibility = (
    body.eligibility !== undefined && String(body.eligibility).trim()
      ? String(body.eligibility).trim()
      : existing?.eligibility || "Refer to the official government portal notice for detailed eligibility criteria."
  );

  let docsArr = [];
  if (body.required_documents !== undefined) {
    docsArr = Array.isArray(body.required_documents)
      ? body.required_documents.map((d) => String(d).trim()).filter(Boolean)
      : String(body.required_documents)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
  } else if (existing?.required_documents) {
    try {
      docsArr = JSON.parse(existing.required_documents || "[]");
    } catch {
      docsArr = [];
    }
  }

  return {
    value: {
      tender_code: rawCode,
      name,
      category,
      state: cleanState,
      location,
      department,
      budget: parsedBudget,
      published_date: publishedDate,
      deadline,
      status: finalStatus,
      description,
      source_url: sourceUrl,
      eligibility,
      required_documents: JSON.stringify(docsArr)
    }
  };
}

async function buildAdminDashboardSnapshot() {
  const rows = await db.queryAsync("SELECT * FROM tenders ORDER BY id DESC");
  const tenders = (rows || []).map(formatAdminTender);

  const countsMap = new Map();
  for (const t of tenders) {
    countsMap.set(t.category, (countsMap.get(t.category) || 0) + 1);
  }
  const categoryDistribution = ALLOWED_CATEGORIES.map((category) => ({
    category,
    count: countsMap.get(category) || 0
  }));

  return {
    tenders,
    totalTenders: tenders.length,
    categoryDistribution
  };
}

// 1. Admin Dashboard Summary: Total Tenders & Live Category Distribution for Pie Chart
router.get(["/stats", "/analytics"], async (req, res) => {
  try {
    const snapshot = await buildAdminDashboardSnapshot();
    return res.json({
      totalTenders: snapshot.totalTenders,
      categoryDistribution: snapshot.categoryDistribution
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. List & Search/Filter All Tenders for Admin Management Table
router.get("/tenders", async (req, res) => {
  try {
    const { search, category, state, status } = req.query;
    let query = "SELECT * FROM tenders WHERE 1=1";
    const params = [];

    if (search && search.trim()) {
      query += " AND (name LIKE ? OR department LIKE ? OR location LIKE ? OR state LIKE ? OR COALESCE(tender_code, '') LIKE ?)";
      const val = `%${search.trim()}%`;
      params.push(val, val, val, val, val);
    }
    if (category && category.trim()) {
      query += " AND category = ?";
      params.push(category.trim());
    }
    if (state && state.trim()) {
      const cleanState = normalizeState(state.trim()) || state.trim();
      query += " AND LOWER(state) = LOWER(?)";
      params.push(cleanState);
    }

    query += " ORDER BY id DESC";
    const rows = await db.queryAsync(query, params);
    let tenders = (rows || []).map(formatAdminTender);

    if (status && status.trim()) {
      const target = status.trim().toLowerCase();
      tenders = tenders.filter((t) => (t.status || "").toLowerCase() === target);
    }

    return res.json(tenders);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Add New Tender (Unlimited — old 12-tender restriction removed)
router.post("/tenders", async (req, res) => {
  try {
    const { error, value } = validateTenderPayload(req.body, null);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const dupTitle = await db.getAsync(
      "SELECT id FROM tenders WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
      [value.name]
    );
    if (dupTitle) {
      return res.status(409).json({ message: "A tender with this exact title already exists." });
    }

    const dupCode = await db.getAsync(
      "SELECT id FROM tenders WHERE LOWER(TRIM(COALESCE(tender_code, ''))) = LOWER(TRIM(?)) LIMIT 1",
      [value.tender_code]
    );
    if (dupCode) {
      return res.status(409).json({ message: `Tender ID "${value.tender_code}" is already in use.` });
    }

    const result = await db.queryAsync(
      `INSERT INTO tenders (
        tender_code, name, department, category, budget, location, state,
        published_date, deadline, status, eligibility, required_documents,
        description, source_url, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        value.tender_code,
        value.name,
        value.department,
        value.category,
        value.budget,
        value.location,
        value.state,
        value.published_date,
        value.deadline,
        value.status,
        value.eligibility,
        value.required_documents,
        value.description,
        value.source_url,
        req.user.id,
        req.user.id
      ]
    );

    const createdRow = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [result.insertId]);
    const snapshot = await buildAdminDashboardSnapshot();
    return res.status(201).json({
      message: "Tender created successfully",
      tender: formatAdminTender(createdRow),
      tenders: snapshot.tenders,
      totalTenders: snapshot.totalTenders,
      categoryDistribution: snapshot.categoryDistribution
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Edit / Update Existing Tender
router.put("/tenders/:id", async (req, res) => {
  try {
    const tenderId = parseInt(req.params.id, 10);
    if (isNaN(tenderId)) {
      return res.status(400).json({ message: "Invalid tender ID." });
    }

    const existing = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!existing) {
      return res.status(404).json({ message: "Tender not found." });
    }

    const { error, value } = validateTenderPayload(req.body, existing);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const dupTitle = await db.getAsync(
      "SELECT id FROM tenders WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ? LIMIT 1",
      [value.name, tenderId]
    );
    if (dupTitle) {
      return res.status(409).json({ message: "Another tender already uses this title." });
    }

    const dupCode = await db.getAsync(
      "SELECT id FROM tenders WHERE LOWER(TRIM(COALESCE(tender_code, ''))) = LOWER(TRIM(?)) AND id != ? LIMIT 1",
      [value.tender_code, tenderId]
    );
    if (dupCode) {
      return res.status(409).json({ message: `Another tender already uses Tender ID "${value.tender_code}".` });
    }

    await db.queryAsync(
      `UPDATE tenders
       SET tender_code = ?, name = ?, department = ?, category = ?, budget = ?,
           location = ?, state = ?, published_date = ?, deadline = ?, status = ?,
           eligibility = ?, required_documents = ?, description = ?, source_url = ?,
           updated_by = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        value.tender_code,
        value.name,
        value.department,
        value.category,
        value.budget,
        value.location,
        value.state,
        value.published_date,
        value.deadline,
        value.status,
        value.eligibility,
        value.required_documents,
        value.description,
        value.source_url,
        req.user.id,
        tenderId
      ]
    );

    const updatedRow = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    const snapshot = await buildAdminDashboardSnapshot();
    return res.json({
      message: "Tender updated successfully",
      tender: formatAdminTender(updatedRow),
      tenders: snapshot.tenders,
      totalTenders: snapshot.totalTenders,
      categoryDistribution: snapshot.categoryDistribution
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Close or Reopen Tender Status
router.patch("/tenders/:id/status", async (req, res) => {
  try {
    const tenderId = parseInt(req.params.id, 10);
    if (isNaN(tenderId)) {
      return res.status(400).json({ message: "Invalid tender ID." });
    }

    const existing = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!existing) {
      return res.status(404).json({ message: "Tender not found." });
    }

    const action = (req.body.action || "").trim().toLowerCase();
    const requestedStatus = (req.body.status || "").trim();

    if (action === "close" || requestedStatus === "Closed") {
      await db.queryAsync(
        "UPDATE tenders SET status = 'Closed', updated_by = ?, updated_at = datetime('now') WHERE id = ?",
        [req.user.id, tenderId]
      );
      const updated = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
      const snapshot = await buildAdminDashboardSnapshot();
      return res.json({
        message: "Tender closed successfully.",
        tender: formatAdminTender(updated),
        tenders: snapshot.tenders,
        totalTenders: snapshot.totalTenders,
        categoryDistribution: snapshot.categoryDistribution
      });
    }

    if (action === "reopen" || requestedStatus === "Open" || requestedStatus === "Closing Soon") {
      const targetDeadline = (req.body.deadline || existing.deadline || "").trim();
      if (!isValidDateStr(targetDeadline)) {
        return res.status(400).json({ message: "Invalid deadline date (YYYY-MM-DD)." });
      }
      const pubDate = existing.published_date || "2000-01-01";
      if (targetDeadline < pubDate) {
        return res.status(400).json({
          message: `Deadline (${targetDeadline}) cannot be earlier than published date (${pubDate}).`
        });
      }
      const todayStr = getLocalDateStr();
      if (targetDeadline < todayStr) {
        return res.status(400).json({
          code: "DEADLINE_PASSED",
          message: `Cannot reopen tender because its submission deadline (${targetDeadline}) has already passed. Update the deadline to today or a future date to reopen it.`
        });
      }

      const recomputedStatus = computeStatusFromDeadline(targetDeadline);
      await db.queryAsync(
        "UPDATE tenders SET deadline = ?, status = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?",
        [targetDeadline, recomputedStatus, req.user.id, tenderId]
      );
      const updated = await db.getAsync("SELECT * FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
      const snapshot = await buildAdminDashboardSnapshot();
      return res.json({
        message: `Tender reopened with status "${recomputedStatus}".`,
        tender: formatAdminTender(updated),
        tenders: snapshot.tenders,
        totalTenders: snapshot.totalTenders,
        categoryDistribution: snapshot.categoryDistribution
      });
    }

    return res.status(400).json({ message: "Specify action ('close' or 'reopen') or a valid status." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Delete Tender
router.delete("/tenders/:id", async (req, res) => {
  try {
    const tenderId = parseInt(req.params.id, 10);
    if (isNaN(tenderId)) {
      return res.status(400).json({ message: "Invalid tender ID." });
    }

    const existing = await db.getAsync("SELECT id, name FROM tenders WHERE id = ? LIMIT 1", [tenderId]);
    if (!existing) {
      return res.status(404).json({ message: "Tender not found." });
    }

    await db.queryAsync("DELETE FROM tenders WHERE id = ?", [tenderId]);
    const snapshot = await buildAdminDashboardSnapshot();
    return res.json({
      success: true,
      message: `Tender "${existing.name}" removed successfully.`,
      tenders: snapshot.tenders,
      totalTenders: snapshot.totalTenders,
      categoryDistribution: snapshot.categoryDistribution
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// 7. Read-only Applications list (available to Admin if required)
router.get("/applications", async (req, res) => {
  try {
    const rows = await db.queryAsync(
      `SELECT
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
        u.name AS contractor_name,
        u.company AS contractor_company,
        u.user_code AS contractor_code,
        t.tender_code AS tender_code,
        t.name AS tender_name,
        t.category AS tender_category,
        t.state AS tender_state
       FROM applications a
       JOIN users u ON a.contractor_id = u.id
       JOIN tenders t ON a.tender_id = t.id
       ORDER BY a.applied_on DESC, a.id DESC`
    );

    const mapped = (rows || []).map((row) => ({
      ...row,
      tender_code: row.tender_code || `TK-${String(row.tender_id).padStart(4, "0")}`
    }));

    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
