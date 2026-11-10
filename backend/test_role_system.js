/**
 * Comprehensive verification suite for TenderKart Role-Based System (12 Tenders).
 * Tests all 16 verification rules, role isolation, automatic state inquiry routing,
 * Central Admin analytics, SQLite 12-tender trigger, and HTML endpoints against
 * the real Express application using a backed-up and restored tenderkart.db snapshot.
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

// Snapshot DB before server starts so all test mutations leave repo DB pristine afterward
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
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json, text };
}

async function runTests() {
  const results = [];
  const record = (name, fn) => async () => {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS: ${name}`);
  };

  // Wait briefly for db.serialize() startup checks
  await new Promise((r) => setTimeout(r, 350));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Capture baseline DB counts & set ephemeral runtime passwords on disposable snapshot
    const baselineContractors = await db.getAsync("SELECT COUNT(*) AS c FROM users WHERE LOWER(role) = 'contractor'");
    const baselineApps = await db.getAsync("SELECT COUNT(*) AS c FROM applications");
    const initialContractorsCount = baselineContractors ? baselineContractors.c : 0;
    const initialAppsCount = baselineApps ? baselineApps.c : 0;

    const ephAdminPass = process.env.TEST_ADMIN_PASSWORD || `Adm#${crypto.randomBytes(6).toString("hex")}`;
    const ephMgrPass = process.env.TEST_MANAGER_PASSWORD || `Mgr#${crypto.randomBytes(6).toString("hex")}`;
    const ephConPass = process.env.TEST_CONTRACTOR_PASSWORD || `Con#${crypto.randomBytes(6).toString("hex")}`;

    await db.queryAsync("UPDATE users SET password = ? WHERE username = 'admin'", [bcrypt.hashSync(ephAdminPass, 10)]);
    await db.queryAsync("UPDATE users SET password = ? WHERE username = 'MGR2002'", [bcrypt.hashSync(ephMgrPass, 10)]);
    await db.queryAsync("UPDATE users SET password = ? WHERE username = 'CON1001'", [bcrypt.hashSync(ephConPass, 10)]);

    let adminToken = null;
    let gujMgrToken = null;
    let conToken = null;
    let gujInquiryId = null;

    await record("1. Exactly 12 active tenders exist & HTML pages serve HTTP 200 without demo login shortcuts", async () => {
      const tRes = await api(baseUrl, "GET", "/api/tenders");
      assert.strictEqual(tRes.status, 200);
      assert(Array.isArray(tRes.body), "Expected array from /api/tenders");
      assert.strictEqual(tRes.body.length, 12, `Expected 12 tenders, got ${tRes.body.length}`);

      const pages = [
        "index.html",
        "login.html",
        "register.html",
        "contact.html",
        "tenders.html",
        "tenderDetails.html",
        "dashboard.html",
        "manager.html",
        "admin.html",
      ];
      for (const page of pages) {
        const res = await fetch(`${baseUrl}/${page}`);
        assert.strictEqual(res.status, 200, `${page} did not return 200`);
        const html = await res.text();
        if (page === "login.html") {
          assert(!/contractor101|manager101|admin0|quickLogin|Admin@1001/i.test(html), "login.html still contains demo shortcuts");
        }
      }
    })();

    await record("2 & 3. Exact 6-category distribution (Roads 3, Bridges 3, Water Supply 2, Buildings 2, Metro Projects 1, Smart City 1) & 0 Drainage/Street Lighting", async () => {
      const tRes = await api(baseUrl, "GET", "/api/tenders");
      const counts = {};
      for (const t of tRes.body) {
        counts[t.category] = (counts[t.category] || 0) + 1;
        assert(t.state && t.state.trim().length > 0, `Tender ${t.id} missing state`);
      }
      assert.strictEqual(counts["Roads"], 3);
      assert.strictEqual(counts["Bridges"], 3);
      assert.strictEqual(counts["Water Supply"], 2);
      assert.strictEqual(counts["Buildings"], 2);
      assert.strictEqual(counts["Metro Projects"], 1);
      assert.strictEqual(counts["Smart City"], 1);
      assert.strictEqual(counts["Drainage"] || 0, 0);
      assert.strictEqual(counts["Street Lighting"] || 0, 0);
      assert.strictEqual(Object.keys(counts).length, 6);
    })();

    await record("4. Contractor registration active immediately, duplicate blocked, public Admin registration blocked", async () => {
      const adminReg = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "admin",
          name: "Rogue Admin",
          username: "rogue_admin",
          email: "rogue@test.in",
          password: "Password@123",
          confirmPassword: "Password@123",
        },
      });
      assert.strictEqual(adminReg.status, 403);

      const conReg = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "contractor",
          company: "Apex Infra Builders Pvt Ltd",
          name: "Rohan Contractor",
          email: "rohan.con.test@tenderkart.in",
          username: "rohan_con_test",
          password: "Password@123",
          confirmPassword: "Password@123",
        },
      });
      assert.strictEqual(conReg.status, 201);
      assert.strictEqual(conReg.body.user.role, "contractor");
      assert.strictEqual(conReg.body.user.approval_status, "Approved");
      assert(conReg.body.token, "Active contractor should receive token on register");

      // Duplicate username/email blocked
      const dupReg = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "contractor",
          company: "Other Co",
          name: "Dup User",
          email: "rohan.con.test@tenderkart.in",
          username: "rohan_con_test",
          password: "Password@123",
          confirmPassword: "Password@123",
        },
      });
      assert.strictEqual(dupReg.status, 409);

      // New contractor logs in manually
      const loginRes = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "rohan_con_test", password: "Password@123" },
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.user.role, "contractor");
    })();

    let pendingMgrId = null;
    let rejectMgrId = null;
    let approvedNewMgrToken = null;

    await record("5. Manager registration defaults to Pending Approval and blocks login before approval", async () => {
      const reg1 = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "manager",
          name: "Rajeshwar Officer",
          email: "raj.mgr.test@tenderkart.in",
          username: "mgr_raj_test",
          office_state: "Rajasthan",
          password: "Password@123",
          confirmPassword: "Password@123",
        },
      });
      assert.strictEqual(reg1.status, 201);
      assert.strictEqual(reg1.body.user.role, "manager");
      assert.strictEqual(reg1.body.user.approval_status, "Pending");
      assert.strictEqual(reg1.body.user.office_state, "Rajasthan");
      assert(!reg1.body.token, "Pending manager must NOT receive auth token");
      pendingMgrId = reg1.body.user.id;

      const reg2 = await api(baseUrl, "POST", "/api/users/register", {
        body: {
          accountType: "manager",
          name: "Reject Test Officer",
          email: "reject.mgr.test@tenderkart.in",
          username: "mgr_reject_test",
          office_state: "Bihar",
          password: "Password@123",
          confirmPassword: "Password@123",
        },
      });
      assert.strictEqual(reg2.status, 201);
      rejectMgrId = reg2.body.user.id;

      const blockedLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "mgr_raj_test", password: "Password@123" },
      });
      assert.strictEqual(blockedLogin.status, 403);
      assert.strictEqual(blockedLogin.body.code, "PENDING_APPROVAL");
    })();

    await record("6 & 16a. Central Admin manual login + approves, rejects, deactivates, reactivates manager accounts", async () => {
      const admLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "admin", password: ephAdminPass },
      });
      assert.strictEqual(admLogin.status, 200);
      assert.strictEqual(admLogin.body.user.role, "admin");
      adminToken = admLogin.body.token;

      // Approve Rajasthan manager
      const appRes = await api(baseUrl, "PATCH", `/api/admin/managers/${pendingMgrId}/approve`, {
        token: adminToken,
      });
      assert.strictEqual(appRes.status, 200);
      assert.strictEqual(appRes.body.success, true);

      const mgrListAfterApprove = await api(baseUrl, "GET", "/api/admin/managers", { token: adminToken });
      assert.strictEqual(mgrListAfterApprove.status, 200);
      const mgrsArr = Array.isArray(mgrListAfterApprove.body) ? mgrListAfterApprove.body : mgrListAfterApprove.body.managers || [];
      const approvedMgrRow = mgrsArr.find((m) => m.id === pendingMgrId);
      assert.strictEqual(approvedMgrRow.approval_status, "Approved");

      // Now Rajasthan manager logs in
      const mgrLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "mgr_raj_test", password: "Password@123" },
      });
      assert.strictEqual(mgrLogin.status, 200);
      assert.strictEqual(mgrLogin.body.user.role, "manager");
      assert.strictEqual(mgrLogin.body.user.office_state, "Rajasthan");
      approvedNewMgrToken = mgrLogin.body.token;

      // Deactivate manager -> blocks both new login & existing token
      const deactRes = await api(baseUrl, "PATCH", `/api/admin/managers/${pendingMgrId}/status`, {
        token: adminToken,
        body: { is_active: false },
      });
      assert.strictEqual(deactRes.status, 200);

      const deactLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "mgr_raj_test", password: "Password@123" },
      });
      assert.strictEqual(deactLogin.status, 403);
      assert.strictEqual(deactLogin.body.code, "DEACTIVATED");

      const staleTokenCall = await api(baseUrl, "GET", "/api/manager/dashboard", {
        token: approvedNewMgrToken,
      });
      assert.strictEqual(staleTokenCall.status, 403);

      // Reactivate works
      const reactRes = await api(baseUrl, "PATCH", `/api/admin/managers/${pendingMgrId}/status`, {
        token: adminToken,
        body: { is_active: true },
      });
      assert.strictEqual(reactRes.status, 200);

      // Reject second manager -> blocks login with REJECTED
      const rejRes = await api(baseUrl, "PATCH", `/api/admin/managers/${rejectMgrId}/reject`, {
        token: adminToken,
      });
      assert.strictEqual(rejRes.status, 200);
      const rejLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "mgr_reject_test", password: "Password@123" },
      });
      assert.strictEqual(rejLogin.status, 403);
      assert.strictEqual(rejLogin.body.code, "REJECTED");
    })();

    await record("7 & 16b. Gujarat Manager logs in manually, views/edits only Gujarat tenders, blocked from Maharashtra tenders & state change", async () => {
      const mLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "MGR2002", password: ephMgrPass },
      });
      assert.strictEqual(mLogin.status, 200);
      assert.strictEqual(mLogin.body.user.role, "manager");
      assert.strictEqual(mLogin.body.user.office_state, "Gujarat");
      gujMgrToken = mLogin.body.token;

      const listRes = await api(baseUrl, "GET", "/api/manager/tenders", { token: gujMgrToken });
      assert.strictEqual(listRes.status, 200);
      assert(listRes.body.tenders.length > 0);
      assert(listRes.body.tenders.every((t) => t.state === "Gujarat"), "Manager tenders leaked non-Gujarat tender");

      const gujTender = listRes.body.tenders[0];
      const editOwn = await api(baseUrl, "PUT", `/api/manager/tenders/${gujTender.id}`, {
        token: gujMgrToken,
        body: { budget: gujTender.budget + 100000, status: "Closing Soon" },
      });
      assert.strictEqual(editOwn.status, 200);

      // Attempt to reassign state
      const reassignFail = await api(baseUrl, "PUT", `/api/manager/tenders/${gujTender.id}`, {
        token: gujMgrToken,
        body: { state: "Maharashtra" },
      });
      assert.strictEqual(reassignFail.status, 403);

      // Attempt to edit Maharashtra tender (ID 42)
      const editCrossFail = await api(baseUrl, "PUT", "/api/manager/tenders/42", {
        token: gujMgrToken,
        body: { budget: 9999999 },
      });
      assert.strictEqual(editCrossFail.status, 403);
    })();

    await record("8 & 16c. Contractor manual login searches/filters tenders across all states, views details (+views_count), summarizes & saves", async () => {
      const cLogin = await api(baseUrl, "POST", "/api/users/login", {
        body: { usernameOrEmail: "CON1001", password: ephConPass },
      });
      assert.strictEqual(cLogin.status, 200);
      assert.strictEqual(cLogin.body.user.role, "contractor");
      conToken = cLogin.body.token;

      const gujSearch = await api(baseUrl, "GET", "/api/tenders?state=Gujarat");
      assert.strictEqual(gujSearch.status, 200);
      assert.strictEqual(gujSearch.body.length, 2);

      const mhSearch = await api(baseUrl, "GET", "/api/tenders?state=Maharashtra");
      assert.strictEqual(mhSearch.status, 200);
      assert.strictEqual(mhSearch.body.length, 2);

      const roadsSearch = await api(baseUrl, "GET", "/api/tenders?category=Roads");
      assert.strictEqual(roadsSearch.status, 200);
      assert.strictEqual(roadsSearch.body.length, 3);

      const d1 = await api(baseUrl, "GET", "/api/tenders/61");
      assert.strictEqual(d1.status, 200);
      const viewsAfterFirst = d1.body.views_count;
      const d2 = await api(baseUrl, "GET", "/api/tenders/61");
      assert.strictEqual(d2.body.views_count, viewsAfterFirst + 1);

      const sumRes = await api(baseUrl, "POST", "/api/tenders/61/summarize", { token: conToken });
      assert.strictEqual(sumRes.status, 200);
      assert(Array.isArray(sumRes.body.summaryPoints) && sumRes.body.summaryPoints.length > 0, "AI summary missing summaryPoints");
      assert.strictEqual(sumRes.body.tenderId, 61);

      const saveRes = await api(baseUrl, "POST", "/api/saved/61/save", { token: conToken });
      assert(saveRes.status === 200 || saveRes.status === 201, "Expected saved tender 200/201");
    })();

    await record("9. Inquiry auto-routes Gujarat tender inquiry to Gujarat Manager, unassigned state to Admin, blocks non-contractor form use", async () => {
      // Contractor submits Gujarat inquiry (tender 61)
      const gujInq = await api(baseUrl, "POST", "/api/inquiries", {
        token: conToken,
        body: {
          related_tender_id: 61,
          inquiry_category: "Tender Clarification",
          message: "Please clarify structural steel grade IS 2062 requirement for Bharuch flyover.",
        },
      });
      assert.strictEqual(gujInq.status, 201);
      assert.strictEqual(gujInq.body.state, "Gujarat");
      assert.strictEqual(gujInq.body.assignment_status, "Assigned");
      assert(gujInq.body.assigned_manager_id, "Gujarat inquiry must be auto-assigned to Gujarat manager");
      gujInquiryId = gujInq.body.inquiry_id;

      // Contractor submits Assam inquiry (tender 41, no manager in Assam) -> Unassigned / Pending Admin Assignment
      const assamInq = await api(baseUrl, "POST", "/api/inquiries", {
        token: conToken,
        body: {
          related_tender_id: 41,
          inquiry_category: "Document Related",
          message: "Is geotechnical report annexure uploaded separately for Brahmaputra bridge?",
        },
      });
      assert.strictEqual(assamInq.status, 201);
      assert.strictEqual(assamInq.body.state, "Assam");
      assert.strictEqual(assamInq.body.assignment_status, "Unassigned / Pending Admin Assignment");
      assert.strictEqual(assamInq.body.assigned_manager_id, null);

      // Verify Admin sees unassigned inquiry
      const admInqs = await api(baseUrl, "GET", "/api/admin/inquiries?assignment_status=Unassigned", {
        token: adminToken,
      });
      assert.strictEqual(admInqs.status, 200);
      assert(admInqs.body.inquiries.some((i) => i.id === assamInq.body.inquiry_id), "Admin must see unassigned Assam inquiry");

      // Manager & Admin blocked from contractor inquiry submission form
      const mgrInqFail = await api(baseUrl, "POST", "/api/inquiries", {
        token: gujMgrToken,
        body: { related_tender_id: 61, inquiry_category: "Other", message: "Should be blocked." },
      });
      assert.strictEqual(mgrInqFail.status, 403);

      const admInqFail = await api(baseUrl, "POST", "/api/inquiries", {
        token: adminToken,
        body: { related_tender_id: 61, inquiry_category: "Other", message: "Should be blocked." },
      });
      assert.strictEqual(admInqFail.status, 403);
    })();

    await record("10 & 11. Gujarat Manager receives inquiry, replies & resolves; Contractor sees response in dashboard", async () => {
      const mgrInqs = await api(baseUrl, "GET", "/api/manager/inquiries", { token: gujMgrToken });
      assert.strictEqual(mgrInqs.status, 200);
      const found = mgrInqs.body.inquiries.find((i) => i.id === gujInquiryId);
      assert(found, "Gujarat manager did not receive routed Gujarat inquiry");
      assert(mgrInqs.body.inquiries.every((i) => i.state === "Gujarat"), "Manager inquiries included non-Gujarat item");

      const replyRes = await api(baseUrl, "POST", `/api/manager/inquiries/${gujInquiryId}/reply`, {
        token: gujMgrToken,
        body: {
          message_body: "Confirmed: IS 2062 E350 Grade C structural steel applies to main spans.",
          status: "Resolved",
        },
      });
      assert.strictEqual(replyRes.status, 200);
      assert.strictEqual(replyRes.body.status, "Resolved");

      const conThread = await api(baseUrl, "GET", `/api/inquiries/${gujInquiryId}`, { token: conToken });
      assert.strictEqual(conThread.status, 200);
      assert.strictEqual(conThread.body.ticket.status, "Resolved");
      assert(
        conThread.body.messages.some((m) => (m.sender_role || "").toLowerCase() === "manager" && m.message_body.includes("IS 2062 E350")),
        "Contractor cannot see manager reply in thread"
      );
    })();

    await record("12. Central Admin nationwide analytics accurately reflects real DB records and manager activity", async () => {
      const statsRes = await api(baseUrl, "GET", "/api/admin/stats", { token: adminToken });
      assert.strictEqual(statsRes.status, 200);
      const s = statsRes.body;
      assert.strictEqual(s.tendersCount, 12);
      assert.strictEqual(s.maxTenders, 12);
      assert.strictEqual(s.contractorsCount, initialContractorsCount + 1, "Expected contractorsCount to increase by 1 after test registration");
      assert(s.approvedManagersCount >= 7, "Expected approvedManagersCount >= 7");
      assert(s.totalViews >= 2, "Expected real view counter >= 2");

      const catTotal = s.categoryStats.reduce((sum, c) => sum + c.count, 0);
      assert.strictEqual(catTotal, 12, "Category stats must sum to 12");
      const stateTotal = s.stateStats.reduce((sum, st) => sum + st.tender_count, 0);
      assert.strictEqual(stateTotal, 12, "State stats must sum to 12");
      assert.strictEqual(s.applicationsSummary.total, initialAppsCount, "Applications summary total must match DB baseline");
      assert(s.inquiriesSummary.total >= 7, "Inquiries summary total should include newly routed inquiries");

      const gujMgrPerf = s.managerPerformance.find((m) => m.username === "MGR2002");
      assert(gujMgrPerf, "MGR2002 missing in managerPerformance");
      assert(gujMgrPerf.tender_updates_count >= 1, "MGR2002 tender_updates_count should reflect edit");
      assert(gujMgrPerf.inquiry_responses_count >= 1, "MGR2002 inquiry_responses_count should reflect reply");
      assert(Array.isArray(s.recentActivity) && s.recentActivity.length > 0, "Expected recorded activity logs");
    })();

    await record("13 & 14. Strict cross-state isolation and unauthorized role boundary enforcement", async () => {
      // Find a Maharashtra inquiry & application from existing DB
      const admInqs = await api(baseUrl, "GET", "/api/admin/inquiries", { token: adminToken });
      const mhInq = admInqs.body.inquiries.find((i) => i.state === "Maharashtra");
      if (mhInq) {
        const crossInqRead = await api(baseUrl, "GET", `/api/inquiries/${mhInq.id}`, { token: gujMgrToken });
        assert.strictEqual(crossInqRead.status, 403);
        const crossInqReply = await api(baseUrl, "POST", `/api/manager/inquiries/${mhInq.id}/reply`, {
          token: gujMgrToken,
          body: { message_body: "Cross-state intrusion", status: "In Progress" },
        });
        assert.strictEqual(crossInqReply.status, 403);
      }

      const admApps = await api(baseUrl, "GET", "/api/admin/applications", { token: adminToken });
      const appsList = Array.isArray(admApps.body) ? admApps.body : admApps.body.applications || [];
      const mhApp = appsList.find((a) => a.tender_state === "Maharashtra");
      assert(mhApp, "Expected at least 1 Maharashtra application in demo DB");
      const crossAppRead = await api(baseUrl, "GET", `/api/applications/${mhApp.id}`, { token: gujMgrToken });
      assert.strictEqual(crossAppRead.status, 403);
      const crossAppEval = await api(baseUrl, "PUT", `/api/manager/applications/${mhApp.id}/evaluate`, {
        token: gujMgrToken,
        body: { status: "Under Review", outcome: "Pending", evaluation_notes: "Unauthorized" },
      });
      assert.strictEqual(crossAppEval.status, 403);

      // Role privilege escalation guards
      assert.strictEqual((await api(baseUrl, "GET", "/api/admin/stats", { token: gujMgrToken })).status, 403);
      assert.strictEqual((await api(baseUrl, "GET", "/api/admin/managers", { token: gujMgrToken })).status, 403);
      assert.strictEqual((await api(baseUrl, "GET", "/api/admin/stats", { token: conToken })).status, 403);
      assert.strictEqual((await api(baseUrl, "GET", "/api/manager/dashboard", { token: conToken })).status, 403);
      assert.strictEqual((await api(baseUrl, "GET", "/api/manager/tenders", { token: conToken })).status, 403);
      assert.strictEqual((await api(baseUrl, "GET", "/api/admin/stats")).status, 401);
      assert.strictEqual((await api(baseUrl, "GET", "/api/manager/dashboard")).status, 401);
    })();

    await record("15. 13th tender creation blocked at API level (Manager & Admin) and SQLite trigger level", async () => {
      const payload = {
        name: "13th Tender Unauthorized Expansion",
        department: "Gujarat PWD",
        category: "Roads",
        budget: 120000000,
        location: "Surat, Gujarat",
        state: "Gujarat",
        deadline: "2026-12-31",
        eligibility: "Class-A Contractor",
        description: "Must be rejected due to 12 tender limit.",
      };
      const mgr13 = await api(baseUrl, "POST", "/api/manager/tenders", { token: gujMgrToken, body: payload });
      assert.strictEqual(mgr13.status, 400);
      assert.strictEqual(mgr13.body.code, "TENDER_LIMIT_REACHED");

      const adm13 = await api(baseUrl, "POST", "/api/admin/tenders", { token: adminToken, body: payload });
      assert.strictEqual(adm13.status, 400);
      assert.strictEqual(adm13.body.code, "TENDER_LIMIT_REACHED");

      // Direct SQLite trigger check (supplying all NOT NULL columns so trigger itself rejects 13th row)
      let triggerMsg = "";
      try {
        await new Promise((resolve, reject) => {
          db.rawDb.run(
            `INSERT INTO tenders (name, department, category, budget, location, state, deadline, eligibility, required_documents, description)
             VALUES ('Direct Trigger Test', 'Test Dept', 'Roads', 1000, 'Surat', 'Gujarat', '2026-12-31', 'Class-A', '[]', 'Test')`,
            (err) => (err ? reject(err) : resolve())
          );
        });
      } catch (err) {
        triggerMsg = err.message || "";
      }
      assert(/strictly limited to 12 tenders/i.test(triggerMsg), `Unexpected SQLite trigger result: "${triggerMsg}"`);

      const finalCount = await api(baseUrl, "GET", "/api/tenders");
      assert.strictEqual(finalCount.body.length, 12);
    })();

    console.log(`\nALL ${results.length} ROLE-SYSTEM CHECKS PASSED SUCCESSFULLY.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.rawDb.close(resolve));
    // Restore pristine database snapshot so synthetic test data is not left behind
    fs.copyFileSync(backupPath, dbPath);
    fs.unlinkSync(backupPath);
  }
}

runTests().catch((err) => {
  console.error("TEST SUITE FAILED:", err);
  process.exit(1);
});
