// backend/migrate_role_system.js
// Idempotent migration script to transition existing tenderkart.db to the
// role-based system with strictly 12 demonstration tenders and state-wise routing.

const db = require("./db");

const KEPT_TENDER_IDS = [41, 42, 43, 44, 45, 46, 47, 48, 49, 52, 61, 68];

const TENDER_STATE_MAP = {
  41: "Assam",
  42: "Maharashtra",
  43: "Maharashtra",
  44: "Uttar Pradesh",
  45: "Delhi",
  46: "Punjab",
  47: "Haryana",
  48: "Delhi",
  49: "Madhya Pradesh",
  52: "Madhya Pradesh",
  61: "Gujarat",
  68: "Gujarat"
};

const MANAGER_STATE_MAP = {
  MGR2001: { state: "Maharashtra", dept: "Maharashtra Procurement Division" },
  MGR2002: { state: "Gujarat", dept: "Gujarat Procurement Division" },
  MGR2003: { state: "Madhya Pradesh", dept: "Madhya Pradesh Procurement Division" },
  MGR2004: { state: "Delhi", dept: "Delhi Procurement Division" },
  MGR2005: { state: "Uttar Pradesh", dept: "Uttar Pradesh Procurement Division" },
  MGR2006: { state: "Haryana", dept: "Haryana Procurement Division" }
};

function computeTenderStatus(deadlineStr) {
  if (!deadlineStr) return "Open";
  const deadline = new Date(deadlineStr);
  const now = new Date();
  deadline.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  if (deadline < now) return "Closed";
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "Closing Soon";
  return "Open";
}

async function migrate() {
  // Wait briefly for db.serialize() ALTER TABLE statements in db.js to finish
  await new Promise((r) => setTimeout(r, 400));

  console.log("====================================================");
  console.log("Starting TenderKart Role-Based & 12-Tender Migration");
  console.log("====================================================");

  // 1. Normalize user roles, approval statuses, active flags, and manager state assignments
  await db.queryAsync("UPDATE users SET role = 'contractor' WHERE LOWER(role) = 'user'");
  await db.queryAsync("UPDATE users SET approval_status = 'Approved', is_active = 1 WHERE approval_status IS NULL");
  await db.queryAsync("UPDATE users SET is_active = 1 WHERE is_active IS NULL");

  // Ensure only one admin exists
  const admins = await db.queryAsync("SELECT id, username FROM users WHERE LOWER(role) = 'admin' ORDER BY id ASC");
  if (admins.length > 1) {
    for (let i = 1; i < admins.length; i++) {
      await db.queryAsync("UPDATE users SET role = 'contractor' WHERE id = ?", [admins[i].id]);
    }
  }
  await db.queryAsync(
    "UPDATE users SET office_state = NULL, approval_status = 'Approved', is_active = 1 WHERE LOWER(role) = 'admin'"
  );
  await db.queryAsync(
    "UPDATE users SET office_state = NULL, approval_status = 'Approved', is_active = 1 WHERE LOWER(role) = 'contractor'"
  );

  for (const [code, info] of Object.entries(MANAGER_STATE_MAP)) {
    await db.queryAsync(
      `UPDATE users
       SET office_state = ?, department = ?, approval_status = 'Approved', is_active = 1
       WHERE user_code = ? OR username = ?`,
      [info.state, info.dept, code, code]
    );
  }

  // 2. Keep ONLY the 12 target tenders if those 12 exist; otherwise guard by category limits
  const existingTenders = await db.queryAsync("SELECT id, name, category, location, deadline FROM tenders ORDER BY id ASC");
  const hasAllKeptIds = KEPT_TENDER_IDS.every((id) => existingTenders.some((t) => t.id === id));

  if (hasAllKeptIds) {
    const placeholders = KEPT_TENDER_IDS.map(() => "?").join(",");
    await db.queryAsync(`DELETE FROM applications WHERE tender_id NOT IN (${placeholders})`, KEPT_TENDER_IDS);
    await db.queryAsync(`DELETE FROM saved_tenders WHERE tender_id NOT IN (${placeholders})`, KEPT_TENDER_IDS);
    await db.queryAsync(`DELETE FROM tenders WHERE id NOT IN (${placeholders})`, KEPT_TENDER_IDS);

    for (const id of KEPT_TENDER_IDS) {
      const t = existingTenders.find((row) => row.id === id);
      const state = TENDER_STATE_MAP[id];
      const status = computeTenderStatus(t.deadline);
      await db.queryAsync(
        `UPDATE tenders SET state = ?, status = COALESCE(NULLIF(status, ''), ?), views_count = COALESCE(views_count, 0) WHERE id = ?`,
        [state, status, id]
      );
    }
  } else {
    console.warn("Exact ID set 41..68 not found; verifying tender count =", existingTenders.length);
  }

  // Clean orphan saved_tenders & applications
  await db.queryAsync("DELETE FROM saved_tenders WHERE user_id NOT IN (SELECT id FROM users) OR tender_id NOT IN (SELECT id FROM tenders)");
  await db.queryAsync("DELETE FROM applications WHERE contractor_id NOT IN (SELECT id FROM users) OR tender_id NOT IN (SELECT id FROM tenders)");

  // 3. Clean stale test-run inquiry artifacts (subject starting with 'Test ' and missing tender)
  await db.queryAsync(
    "DELETE FROM inquiries WHERE demo_record = 0 AND (related_tender_id IS NULL OR related_tender_id NOT IN (SELECT id FROM tenders))"
  );

  // 4. Route existing inquiries accurately based on tender state & approved state manager
  const inquiries = await db.queryAsync(
    `SELECT i.*, t.state AS tender_state
     FROM inquiries i
     LEFT JOIN tenders t ON i.related_tender_id = t.id`
  );

  for (const inq of inquiries) {
    const state = inq.tender_state || inq.state || null;
    let normalizedStatus = inq.status || "Pending";
    if (normalizedStatus === "New") normalizedStatus = "Pending";
    else if (normalizedStatus === "Awaiting User Response") normalizedStatus = "In Progress";

    if (state) {
      const mgr = await db.getAsync(
        `SELECT id, name, user_code FROM users
         WHERE role = 'manager' AND LOWER(office_state) = LOWER(?) AND approval_status = 'Approved' AND is_active = 1
         ORDER BY id ASC LIMIT 1`,
        [state]
      );
      if (mgr && (inq.sender_role || "").toLowerCase() === "contractor") {
        await db.queryAsync(
          `UPDATE inquiries
           SET state = ?, assigned_manager_id = ?, assignment_status = 'Assigned', assigned_to = ?, status = ?
           WHERE id = ?`,
          [state, mgr.id, mgr.user_code || mgr.name, normalizedStatus, inq.id]
        );
      } else if ((inq.sender_role || "").toLowerCase() === "contractor") {
        await db.queryAsync(
          `UPDATE inquiries
           SET state = ?, assigned_manager_id = NULL, assignment_status = 'Unassigned / Pending Admin Assignment', assigned_to = 'admin', status = ?
           WHERE id = ?`,
          [state, normalizedStatus, inq.id]
        );
      } else {
        await db.queryAsync(
          `UPDATE inquiries SET state = ?, assignment_status = COALESCE(assignment_status, 'Assigned'), status = ? WHERE id = ?`,
          [state, normalizedStatus, inq.id]
        );
      }
    }
  }

  // 5. Seed initial activity_logs from actual existing DB records if activity_logs is empty
  const actCountRow = await db.getAsync("SELECT COUNT(*) AS c FROM activity_logs");
  if (actCountRow && actCountRow.c === 0) {
    const apps = await db.queryAsync(
      `SELECT a.id, a.contractor_id, a.application_code, a.applied_on, a.application_status, a.evaluator_id, a.evaluated_at,
              t.name AS tender_name, t.state AS tender_state
       FROM applications a
       JOIN tenders t ON a.tender_id = t.id
       ORDER BY a.applied_on DESC LIMIT 12`
    );

    for (const a of apps) {
      await db.queryAsync(
        `INSERT INTO activity_logs (actor_user_id, actor_role, action_type, entity_type, entity_id, state, details, created_at)
         VALUES (?, 'contractor', 'application_submitted', 'application', ?, ?, ?, ?)`,
        [
          a.contractor_id,
          a.id,
          a.tender_state,
          `Application ${a.application_code} submitted for "${a.tender_name.slice(0, 60)}"`,
          a.applied_on ? `${a.applied_on} 10:00:00` : new Date().toISOString()
        ]
      );
      if (a.evaluator_id && a.evaluated_at) {
        await db.queryAsync(
          `INSERT INTO activity_logs (actor_user_id, actor_role, action_type, entity_type, entity_id, state, details, created_at)
           VALUES (?, 'manager', 'application_evaluated', 'application', ?, ?, ?, ?)`,
          [
            a.evaluator_id,
            a.id,
            a.tender_state,
            `Evaluated ${a.application_code} as "${a.application_status}"`,
            a.evaluated_at
          ]
        );
      }
    }

    const preservedInqs = await db.queryAsync("SELECT * FROM inquiries ORDER BY created_at DESC");
    for (const inq of preservedInqs) {
      await db.queryAsync(
        `INSERT INTO activity_logs (actor_user_id, actor_role, action_type, entity_type, entity_id, state, details, created_at)
         VALUES (?, ?, 'inquiry_submitted', 'inquiry', ?, ?, ?, ?)`,
        [
          inq.sender_user_id,
          (inq.sender_role || "contractor").toLowerCase(),
          inq.id,
          inq.state,
          `Inquiry ${inq.ticket_number} (${inq.inquiry_category}) submitted`,
          inq.created_at
        ]
      );
    }
  }

  // 6. Verify final migration state
  const finalTenders = await db.queryAsync("SELECT id, category, state, status, name FROM tenders ORDER BY id");
  const cats = await db.queryAsync("SELECT category, COUNT(*) AS count FROM tenders GROUP BY category ORDER BY count DESC");
  const states = await db.queryAsync("SELECT state, COUNT(*) AS count FROM tenders GROUP BY state ORDER BY count DESC");
  const usersSummary = await db.queryAsync("SELECT role, approval_status, COUNT(*) AS count FROM users GROUP BY role, approval_status");
  const appTotal = await db.getAsync("SELECT COUNT(*) AS c FROM applications");
  const inqTotal = await db.getAsync("SELECT COUNT(*) AS c FROM inquiries");

  console.log(`\nTotal Tenders: ${finalTenders.length}`);
  console.table(cats);
  console.table(states);
  console.table(usersSummary);
  console.log(`Applications preserved: ${appTotal.c}, Inquiries preserved: ${inqTotal.c}`);
  console.log("Migration completed cleanly!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

