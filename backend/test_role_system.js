/**
 * Automated Verification Suite for TenderKart Final Two-Role Architecture
 * Validates Central Admin & Contractor roles, tender CRUD + Close/Reopen,
 * live Pie Chart stats, Contractor browsing/bookmarks/AI summary/applications,
 * removal of Manager/Inquiry/Notification features, DB foreign-key integrity, and HTML routes.
 */

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "tenderkart.db");
const backupPath = path.join(os.tmpdir(), `tenderkart_backup_${Date.now()}.db`);

if (!fs.existsSync(dbPath)) {
  console.error("Database file not found:", dbPath);
  process.exit(1);
}

// Snapshot DB before server starts so test mutations leave repo DB unchanged
fs.copyFileSync(dbPath, backupPath);

const app = require("./server");
const db = require("./db");

async function api(baseUrl, method, endpoint, { token = null, body = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual"
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json, text, headers: res.headers };
}

function addDaysStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function runTests() {
  const results = [];
  const record = async (name, fn) => {
    await fn();
    results.push(name);
    console.log(`PASS: ${name}`);
  };

  await new Promise((r) => setTimeout(r, 400));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await record("1 & 2. Exactly 1 Admin, 5 Contractors, 0 Managers, clean tables & no 12-tender trigger", async () => {
      const roles = await db.queryAsync(
        "SELECT LOWER(role) AS role, COUNT(*) AS cnt FROM users GROUP BY LOWER(role)"
      );
      const roleMap = Object.fromEntries(roles.map((r) => [r.role, r.cnt]));
      assert.strictEqual(roleMap.admin, 1, "Expected exactly 1 admin");
      assert.strictEqual(roleMap.contractor, 5, "Expected exactly 5 contractors");
      assert.strictEqual(roleMap.manager || 0, 0, "Expected 0 managers");

      const tables = await db.queryAsync(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tableNames = new Set(tables.map((t) => t.name));
      assert(!tableNames.has("inquiries"), "inquiries table must not exist");
      assert(!tableNames.has("inquiry_messages"), "inquiry_messages table must not exist");
      assert(!tableNames.has("notifications"), "notifications table must not exist");

      const triggers = await db.queryAsync("SELECT name FROM sqlite_master WHERE type='trigger'");
      assert(!triggers.some((t) => t.name === "enforce_max_12_tenders"), "enforce_max_12_tenders trigger must be removed");

      await assert.rejects(
        () =>
          db.queryAsync(
            "INSERT INTO users (username, email, password, role) VALUES ('rogue_mgr', 'mgr@test.in', 'hash', 'manager')"
          ),
        /CHECK constraint failed/i
      );
    });

    // Set ephemeral test passwords on snapshot so existing hashes never break test portability
    const ephAdminPass = `Adm#${crypto.randomBytes(6).toString("hex")}`;
    await db.queryAsync("UPDATE users SET password = ? WHERE LOWER(role) = 'admin'", [
      bcrypt.hashSync(ephAdminPass, 10)
    ]);

    const contractorUsers = await db.queryAsync(
      "SELECT id, username, email, user_code FROM users WHERE LOWER(role) = 'contractor' ORDER BY id ASC"
    );
    assert.strictEqual(contractorUsers.length, 5);
    const ephConPass = `Con#${crypto.randomBytes(6).toString("hex")}`;
    await db.queryAsync("UPDATE users SET password = ? WHERE LOWER(role) = 'contractor'", [
      bcrypt.hashSync(ephConPass, 10)
    ]);

    let adminToken = null;
    const contractorTokens = {};

    await record("3 & 4. Admin login and all 5 Contractor logins succeed", async () => {
      const admRes = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "admin", password: ephAdminPass }
      });
      assert.strictEqual(admRes.status, 200);
      assert.strictEqual(admRes.body.user.role, "admin");
      adminToken = admRes.body.token;

      for (const cu of contractorUsers) {
        const uLogin = await api(baseUrl, "POST", "/api/users/login", {
          body: { usernameOrEmail: cu.username, password: ephConPass }
        });
        assert.strictEqual(uLogin.status, 200, `Login failed for ${cu.username}`);
        assert.strictEqual(uLogin.body.user.role, "contractor");
        assert(uLogin.body.token);
        contractorTokens[cu.username] = uLogin.body.token;

        const eLogin = await api(baseUrl, "POST", "/api/users/login", {
          body: { usernameOrEmail: cu.email, password: ephConPass }
        });
        assert.strictEqual(eLogin.status, 200, `Email login failed for ${cu.email}`);
      }
    });

    let registeredConToken = null;
    await record("5 & 6. Public Contractor registration works; Admin & Manager registration blocked", async () => {
      const blockAdmin = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "admin",
          company: "Bad Co",
          name: "Rogue Admin",
          username: "rogue_admin",
          email: "rogue@test.in",
          password: "Password@123",
          confirmPassword: "Password@123"
        }
      });
      assert.strictEqual(blockAdmin.status, 403);

      const blockMgr = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "manager",
          name: "Rogue Mgr",
          username: "rogue_mgr",
          email: "roguemgr@test.in",
          password: "Password@123",
          confirmPassword: "Password@123"
        }
      });
      assert.strictEqual(blockMgr.status, 400);

      const conReg = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "contractor",
          company: "Apex Infra Pvt Ltd",
          name: "Rohan Sharma",
          username: "rohan_con_test",
          email: "rohan.con.test@tenderkart.in",
          password: "Password@123",
          confirmPassword: "Password@123"
        }
      });
      assert.strictEqual(conReg.status, 201);
      assert.strictEqual(conReg.body.user.role, "contractor");
      assert(conReg.body.token);
      registeredConToken = conReg.body.token;
    });

    await record("11. Initial Pie Chart stats match exact 12 tenders & 6 categories", async () => {
      const statsRes = await api(baseUrl, "GET", "/api/admin/stats", { token: adminToken });
      assert.strictEqual(statsRes.status, 200);
      assert.strictEqual(statsRes.body.totalTenders, 12);
      const map = Object.fromEntries(
        statsRes.body.categoryDistribution.map((c) => [c.category, c.count])
      );
      assert.deepStrictEqual(map, {
        Roads: 3,
        Bridges: 3,
        "Water Supply": 2,
        Buildings: 2,
        "Metro Projects": 1,
        "Smart City": 1
      });
    });

    let createdTenderId = null;
    await record("7, 8, 9, 10 & 12. Admin Add (with validation), Edit, Close, Reopen, Remove & Pie Chart live update", async () => {
      const badUrl = await api(baseUrl, "POST", "/api/admin/tenders", {
        token: adminToken,
        body: {
          name: "Invalid URL Test Tender",
          tender_code: "TK-BAD1",
          category: "Roads",
          state: "Maharashtra",
          location: "Pune",
          department: "MSRDC",
          budget: 100000000,
          published_date: addDaysStr(-1),
          deadline: addDaysStr(20),
          source_url: "not-a-valid-url",
          description: "Valid long enough tender description text."
        }
      });
      assert.strictEqual(badUrl.status, 400);

      const addRes = await api(baseUrl, "POST", "/api/admin/tenders", {
        token: adminToken,
        body: {
          name: "Bengaluru Peripheral Ring Road Package 1",
          tender_code: "TK-0901",
          category: "Roads",
          state: "Karnataka",
          location: "Bengaluru, Karnataka",
          department: "Bangalore Development Authority",
          budget: 5200000000,
          published_date: addDaysStr(0),
          deadline: addDaysStr(25),
          status: "Open",
          source_url: "https://eproc.karnataka.gov.in",
          description: "Construction of six-lane peripheral ring road corridor around Bengaluru metropolitan area."
        }
      });
      assert.strictEqual(addRes.status, 201);
      createdTenderId = addRes.body.tender.id;
      assert.strictEqual(addRes.body.tender.status, "Open");

      // Pie chart now shows 13 total tenders and 4 Roads
      const statsAfterAdd = await api(baseUrl, "GET", "/api/admin/stats", { token: adminToken });
      assert.strictEqual(statsAfterAdd.body.totalTenders, 13);
      assert.strictEqual(
        statsAfterAdd.body.categoryDistribution.find((c) => c.category === "Roads").count,
        4
      );

      // Edit category to Smart City -> Pie chart reflects Roads=3, Smart City=2
      const editRes = await api(baseUrl, "PUT", `/api/admin/tenders/${createdTenderId}`, {
        token: adminToken,
        body: {
          name: "Bengaluru Smart Corridor Package 1 (Updated)",
          category: "Smart City"
        }
      });
      assert.strictEqual(editRes.status, 200);
      assert.strictEqual(editRes.body.tender.category, "Smart City");

      const statsAfterEdit = await api(baseUrl, "GET", "/api/admin/stats", { token: adminToken });
      assert.strictEqual(
        statsAfterEdit.body.categoryDistribution.find((c) => c.category === "Smart City").count,
        2
      );

      // Close tender
      const closeRes = await api(baseUrl, "PATCH", `/api/admin/tenders/${createdTenderId}/status`, {
        token: adminToken,
        body: { action: "close" }
      });
      assert.strictEqual(closeRes.status, 200);
      assert.strictEqual(closeRes.body.tender.status, "Closed");

      // Reopen tender with Closing Soon deadline (within 3 days)
      const reopenRes = await api(baseUrl, "PATCH", `/api/admin/tenders/${createdTenderId}/status`, {
        token: adminToken,
        body: { action: "reopen", deadline: addDaysStr(3) }
      });
      assert.strictEqual(reopenRes.status, 200);
      assert.strictEqual(reopenRes.body.tender.status, "Closing Soon");

      // Reopen expired tender (id=41) without new future deadline is rejected cleanly
      const expiredReopenFail = await api(baseUrl, "PATCH", "/api/admin/tenders/41/status", {
        token: adminToken,
        body: { action: "reopen" }
      });
      assert.strictEqual(expiredReopenFail.status, 400);

      // Delete created tender -> returns to 12 tenders, Smart City=1
      const delRes = await api(baseUrl, "DELETE", `/api/admin/tenders/${createdTenderId}`, {
        token: adminToken
      });
      assert.strictEqual(delRes.status, 200);

      const statsAfterDel = await api(baseUrl, "GET", "/api/admin/stats", { token: adminToken });
      assert.strictEqual(statsAfterDel.body.totalTenders, 12);
      assert.strictEqual(
        statsAfterDel.body.categoryDistribution.find((c) => c.category === "Smart City").count,
        1
      );
    });

    const con1Token = contractorTokens.CON1001;
    await record("13, 14, 15, 16 & 22. Browse/filter, Saved isolation, AI summary & Contractor blocked from Admin APIs", async () => {
      const openRes = await api(baseUrl, "GET", "/api/tenders?status=Open");
      assert.strictEqual(openRes.status, 200);
      assert(openRes.body.length > 0);
      assert(openRes.body.every((t) => t.status === "Open"));

      const closedRes = await api(baseUrl, "GET", "/api/tenders?status=Closed");
      assert.strictEqual(closedRes.status, 200);
      assert(closedRes.body.every((t) => t.status === "Closed"));

      const mhRes = await api(baseUrl, "GET", "/api/tenders?state=Maharashtra");
      assert.strictEqual(mhRes.status, 200);
      assert.strictEqual(mhRes.body.length, 2);

      // Strict State + Location AND filtering tests
      const t1a = await api(baseUrl, "GET", "/api/tenders?state=Maharashtra&location=Ratnagiri");
      assert.strictEqual(t1a.status, 200);
      assert.strictEqual(t1a.body.length, 1);
      assert.strictEqual(t1a.body[0].id, 43);

      const t1b = await api(baseUrl, "GET", `/api/tenders?state=Maharashtra&location=${encodeURIComponent("  ratnagiri , maharashtra ")}`);
      assert.strictEqual(t1b.status, 200);
      assert.strictEqual(t1b.body.length, 1);
      assert.strictEqual(t1b.body[0].id, 43);

      const t2 = await api(baseUrl, "GET", "/api/tenders?state=Maharashtra&location=Pune");
      assert.strictEqual(t2.status, 200);
      assert.strictEqual(t2.body.length, 0);

      const t3 = await api(baseUrl, "GET", "/api/tenders?state=Maharashtra&location=Thane");
      assert.strictEqual(t3.status, 200);
      assert.strictEqual(t3.body.length, 1);
      assert.strictEqual(t3.body[0].id, 42);

      const t4 = await api(baseUrl, "GET", "/api/tenders?state=Gujarat&location=Ratnagiri");
      assert.strictEqual(t4.status, 200);
      assert.strictEqual(t4.body.length, 0);

      const t5 = await api(baseUrl, "GET", "/api/tenders?location=Ratnagiri");
      assert.strictEqual(t5.status, 200);
      assert.strictEqual(t5.body.length, 1);
      assert.strictEqual(t5.body[0].id, 43);

      // Contractor save/unsave & isolation
      const saveRes = await api(baseUrl, "POST", "/api/saved/43/save", { token: con1Token });
      assert.strictEqual(saveRes.status, 200);
      assert.strictEqual(saveRes.body.saved, true);

      const con1Saved = await api(baseUrl, "GET", "/api/saved", { token: con1Token });
      assert.strictEqual(con1Saved.status, 200);
      assert(con1Saved.body.some((t) => t.id === 43));

      const con2Saved = await api(baseUrl, "GET", "/api/saved", { token: registeredConToken });
      assert.strictEqual(con2Saved.status, 200);
      assert.strictEqual(con2Saved.body.length, 0, "Contractor 2 must not see Contractor 1 saved tenders");

      const unsaveRes = await api(baseUrl, "POST", "/api/saved/43/save", { token: con1Token });
      assert.strictEqual(unsaveRes.status, 200);
      assert.strictEqual(unsaveRes.body.saved, false);

      // AI summary grounded in source
      const aiRes = await api(baseUrl, "POST", "/api/tenders/43/summarize");
      assert.strictEqual(aiRes.status, 200);
      assert(Array.isArray(aiRes.body.summaryPoints) && aiRes.body.summaryPoints.length > 0);
      assert(!aiRes.body.summaryPoints.some((p) => p.includes("Includes detailed materials audits")));

      // Contractor blocked from Admin APIs
      assert.strictEqual((await api(baseUrl, "GET", "/api/admin/stats", { token: con1Token })).status, 403);
      assert.strictEqual(
        (await api(baseUrl, "POST", "/api/admin/tenders", { token: con1Token, body: {} })).status,
        403
      );
      assert.strictEqual(
        (await api(baseUrl, "DELETE", "/api/admin/tenders/43", { token: con1Token })).status,
        403
      );
    });

    await record("17, 18, 19 & 20. Applications create/update/ownership isolation & Admin applications monitor", async () => {
      const createApp = await api(baseUrl, "POST", "/api/applications", {
        token: registeredConToken,
        body: {
          tender_id: 43,
          applied_on: addDaysStr(0),
          portal_name: "MahaTenders (mahatenders.gov.in)",
          reference_number: "MH-2026-DEMO-771",
          application_status: "Submitted",
          bid_amount: 6750000000,
          proposal_notes: "Initial test submission"
        }
      });
      assert.strictEqual(createApp.status, 201);
      const newAppId = createApp.body.application.id;

      // Update status to Under Review
      const updApp = await api(baseUrl, "PUT", `/api/applications/${newAppId}`, {
        token: registeredConToken,
        body: {
          tender_id: 43,
          applied_on: addDaysStr(0),
          portal_name: "MahaTenders (mahatenders.gov.in)",
          reference_number: "MH-2026-DEMO-771",
          application_status: "Under Review",
          bid_amount: 6750000000,
          proposal_notes: "Moved to technical scrutiny"
        }
      });
      assert.strictEqual(updApp.status, 200);
      assert.strictEqual(updApp.body.application.application_status, "Under Review");

      const myApps = await api(baseUrl, "GET", "/api/applications/my", { token: registeredConToken });
      assert.strictEqual(myApps.status, 200);
      assert.strictEqual(myApps.body.totalApplications, 1);
      assert.strictEqual(myApps.body.underReview, 1);

      // Ownership isolation: CON1001 cannot view or edit new contractor's application
      assert.strictEqual(
        (await api(baseUrl, "GET", `/api/applications/${newAppId}`, { token: con1Token })).status,
        403
      );
      assert.strictEqual(
        (await api(baseUrl, "PUT", `/api/applications/${newAppId}`, { token: con1Token, body: {} })).status,
        403
      );

      // Admin can inspect applications
      const admApps = await api(baseUrl, "GET", "/api/admin/applications", { token: adminToken });
      assert.strictEqual(admApps.status, 200);
      assert(admApps.body.some((a) => a.id === newAppId));
    });

    await record("21, 23 & 24. Removed endpoints return 404, obsolete pages redirect, active pages return 200 & FK check passes", async () => {
      const deadEndpoints = [
        "/api/inquiries/mine",
        "/api/manager/dashboard",
        "/api/users/notifications",
        "/api/admin/managers",
        "/api/admin/inquiries"
      ];
      for (const ep of deadEndpoints) {
        const res = await api(baseUrl, "GET", ep, { token: adminToken });
        assert.strictEqual(res.status, 404, `Expected 404 for removed endpoint ${ep}, got ${res.status}`);
      }

      const activePages = [
        "index.html",
        "about-tenderkart.html",
        "login.html",
        "register.html",
        "tenders.html",
        "tenderDetails.html",
        "saved.html",
        "dashboard.html",
        "admin.html",
        "about.html"
      ];
      for (const page of activePages) {
        const res = await fetch(`${baseUrl}/${page}`, { redirect: "manual" });
        assert.strictEqual(res.status, 200, `${page} did not return 200`);
      }

      for (const deadPage of ["contact.html", "manager.html", "analytics.html", "applications.html"]) {
        const res = await fetch(`${baseUrl}/${deadPage}`, { redirect: "manual" });
        assert.strictEqual(res.status, 301, `${deadPage} expected 301 redirect, got ${res.status}`);
      }

      const fkViolations = await db.queryAsync("PRAGMA foreign_key_check");
      assert.strictEqual(fkViolations.length, 0, "Foreign key violations detected");
    });

    console.log(`\nALL ${results.length} TWO-ROLE ARCHITECTURE CHECKS PASSED SUCCESSFULLY.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.rawDb.close(resolve));
    fs.copyFileSync(backupPath, dbPath);
    try {
      fs.unlinkSync(backupPath);
    } catch {}
  }
}

runTests().catch((err) => {
  console.error("\nTEST FAILURE:", err);
  process.exit(1);
});
