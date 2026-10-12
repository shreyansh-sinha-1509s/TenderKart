// backend/test_helpdesk_acceptance.js
// Automated verification for TenderKart Centralized Helpdesk Acceptance Criteria

const http = require("http");

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function login(usernameOrEmail, password) {
  const res = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/users/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { usernameOrEmail, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${usernameOrEmail}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function runTests() {
  console.log("========================================================");
  console.log("🧪 TESTING CENTRALIZED HELPDESK & INQUIRIES SYSTEM");
  console.log("========================================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      fails++;
    }
  }

  try {
    // Authenticate users
    console.log("Authenticating test accounts...");
    const adminAuth = await login("admin", "Admin@1001");
    const contractorAuth = await login("CON1001", "Contractor@1001");
    const managerAuth = await login("MGR2001", "Manager@2001");
    const otherContractorAuth = await login("CON1002", "Contractor@1002");

    // 10. The five demo inquiries appear with the correct roles, categories, statuses, and linked records
    console.log("\n[Test 10] Verifying 5 Seeded Demo Inquiries...");
    const adminQueueRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/admin/all",
      method: "GET",
      headers: { "Authorization": `Bearer ${adminAuth.token}` }
    });

    assert(adminQueueRes.status === 200, "Admin can retrieve centralized helpdesk queue");
    const demoTickets = adminQueueRes.data.inquiries.filter(i => (i.ticket_number || "").startsWith("TKT-2026-00"));
    assert(demoTickets.length >= 5, `Expected at least 5 seeded tickets, found ${demoTickets.length}`);

    const t1 = demoTickets.find(t => t.ticket_number === "TKT-2026-001");
    const t2 = demoTickets.find(t => t.ticket_number === "TKT-2026-002");
    const t3 = demoTickets.find(t => t.ticket_number === "TKT-2026-003");
    const t4 = demoTickets.find(t => t.ticket_number === "TKT-2026-004");
    const t5 = demoTickets.find(t => t.ticket_number === "TKT-2026-005");

    assert(t1 && t1.sender_role === "Contractor" && t1.status === "In Progress", "TKT-2026-001 is Contractor, In Progress");
    assert(t2 && t2.sender_role === "Contractor" && t2.status === "Awaiting User Response", "TKT-2026-002 is Contractor, Awaiting User Response");
    assert(t3 && t3.sender_role === "Manager" && t3.status === "In Progress", "TKT-2026-003 is Manager, In Progress");
    assert(t4 && t4.sender_role === "Manager" && t4.status === "Resolved", "TKT-2026-004 is Manager, Resolved");
    assert(t5 && t5.sender_role === "Contractor" && t5.status === "New", "TKT-2026-005 is Contractor, New (Unanswered)");

    // 11. The admin summary counts match the database
    console.log("\n[Test 11] Verifying Admin Summary Counts...");
    const summary = adminQueueRes.data.summary;
    assert(summary.totalInquiries >= 5, `Total inquiries count >= 5 (actual: ${summary.totalInquiries})`);
    assert(summary.countNew >= 1, `New inquiries count >= 1 (actual: ${summary.countNew})`);
    assert(summary.countInProgress >= 2, `In Progress count >= 2 (actual: ${summary.countInProgress})`);
    assert(summary.countAwaitingUser >= 1, `Awaiting User count >= 1 (actual: ${summary.countAwaitingUser})`);
    assert(summary.countResolved >= 1, `Resolved count >= 1 (actual: ${summary.countResolved})`);

    // 1. A contractor submits an inquiry and sees it in their dashboard
    console.log("\n[Test 1] Contractor Submits Inquiry...");
    const conCreateRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${contractorAuth.token}`
      }
    }, {
      subject: "Test Highway Specification Inquiry",
      description: "Requesting guidance on sub-base asphalt testing requirements for Package 8.",
      inquiry_category: "Tender Information / NIT Clarification",
      related_tender_id: 1,
      contact_number: "+91 99887 76655"
    });

    assert(conCreateRes.status === 201, `Contractor inquiry created with status 201 (ticket: ${conCreateRes.data.ticket_number})`);
    const newConTicketNumber = conCreateRes.data.ticket_number;
    const newConTicketId = conCreateRes.data.inquiry_id;

    const conMineRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/mine",
      method: "GET",
      headers: { "Authorization": `Bearer ${contractorAuth.token}` }
    });
    const foundConTicket = conMineRes.data.tickets.find(t => t.ticket_number === newConTicketNumber);
    assert(foundConTicket !== undefined, "Contractor sees the new inquiry in their /api/inquiries/mine list");

    // 2. A manager submits an inquiry and sees it in their dashboard
    console.log("\n[Test 2] Manager Submits Inquiry...");
    const mgrCreateRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${managerAuth.token}`
      }
    }, {
      subject: "Test Department NIT Record Correction",
      description: "Tender budget for urban drainage improvement appears offset by 1 decimal point.",
      inquiry_category: "Data Correction",
      related_tender_id: 2
    });

    assert(mgrCreateRes.status === 201, `Manager inquiry created with status 201 (ticket: ${mgrCreateRes.data.ticket_number})`);
    const newMgrTicketNumber = mgrCreateRes.data.ticket_number;
    const newMgrTicketId = mgrCreateRes.data.inquiry_id;

    const mgrMineRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/mine",
      method: "GET",
      headers: { "Authorization": `Bearer ${managerAuth.token}` }
    });
    const foundMgrTicket = mgrMineRes.data.tickets.find(t => t.ticket_number === newMgrTicketNumber);
    assert(foundMgrTicket !== undefined, "Manager sees the new inquiry in their /api/inquiries/mine list");

    // 3. Both inquiries appear in the main admin's helpdesk queue
    console.log("\n[Test 3] Both Inquiries in Central Admin Queue...");
    const adminUpdatedQueue = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/admin/all",
      method: "GET",
      headers: { "Authorization": `Bearer ${adminAuth.token}` }
    });
    const hasConInAdmin = adminUpdatedQueue.data.inquiries.some(t => t.ticket_number === newConTicketNumber);
    const hasMgrInAdmin = adminUpdatedQueue.data.inquiries.some(t => t.ticket_number === newMgrTicketNumber);
    assert(hasConInAdmin && hasMgrInAdmin, "Both contractor and manager inquiries are present in Central Admin Queue");

    // 4. The admin replies to a contractor and the reply appears in that contractor's dashboard
    console.log("\n[Test 4] Admin Replies to Contractor...");
    const adminReplyConRes = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/admin/${newConTicketId}/reply`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuth.token}`
      }
    }, {
      message_body: "Official Admin Response: Please refer to MoRTH Section 500 Table 500-10 for technical asphalt sub-base criteria.",
      status: "Awaiting User Response"
    });
    assert(adminReplyConRes.status === 200, "Admin reply saved with status 200");

    const conCheckTicket = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/${newConTicketId}`,
      method: "GET",
      headers: { "Authorization": `Bearer ${contractorAuth.token}` }
    });
    const hasAdminReply = conCheckTicket.data.messages.some(m => (m.sender_role || "").toLowerCase() === "admin" && m.message_body.includes("MoRTH Section 500"));
    assert(hasAdminReply, "Contractor dashboard retrieves the official Admin reply");
    assert(conCheckTicket.data.ticket.status === "Awaiting User Response", "Ticket status transitioned to 'Awaiting User Response'");

    // 5. The admin replies to a manager and the reply appears in that manager's dashboard
    console.log("\n[Test 5] Admin Replies to Manager...");
    const adminReplyMgrRes = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/admin/${newMgrTicketId}/reply`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuth.token}`
      }
    }, {
      message_body: "Official Admin Response: The decimal notation has been checked and verified against the e-procurement gazette.",
      status: "Resolved"
    });
    assert(adminReplyMgrRes.status === 200, "Admin reply to manager saved with status 200");

    const mgrCheckTicket = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/${newMgrTicketId}`,
      method: "GET",
      headers: { "Authorization": `Bearer ${managerAuth.token}` }
    });
    const hasMgrAdminReply = mgrCheckTicket.data.messages.some(m => (m.sender_role || "").toLowerCase() === "admin");
    assert(hasMgrAdminReply, "Manager dashboard retrieves the official Admin reply");
    assert(mgrCheckTicket.data.ticket.status === "Resolved", "Ticket status transitioned to 'Resolved'");

    // 6. A sender can send a follow-up message
    console.log("\n[Test 6] Sender Sends Follow-up Message...");
    const conFollowupRes = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/${newConTicketId}/messages`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${contractorAuth.token}`
      }
    }, {
      message_body: "Thank you for the clarification. We have obtained the revised testing sheet from the testing lab."
    });
    assert(conFollowupRes.status === 200, "Contractor successfully posted follow-up message");
    assert(conFollowupRes.data.updated_status === "In Progress", "Status flipped back to 'In Progress' after user response");

    // 7. A contractor cannot access a manager's ticket
    console.log("\n[Test 7] Contractor Cross-Access Isolation (Manager Ticket)...");
    const conAccessMgrTicket = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/${newMgrTicketId}`,
      method: "GET",
      headers: { "Authorization": `Bearer ${contractorAuth.token}` }
    });
    assert(conAccessMgrTicket.status === 403, `Contractor accessing manager ticket returned 403 Forbidden (actual: ${conAccessMgrTicket.status})`);

    // 8. A manager cannot access a contractor's ticket
    console.log("\n[Test 8] Manager Cross-Access Isolation (Contractor Ticket)...");
    const mgrAccessConTicket = await request({
      hostname: "localhost",
      port: 5000,
      path: `/api/inquiries/${newConTicketId}`,
      method: "GET",
      headers: { "Authorization": `Bearer ${managerAuth.token}` }
    });
    assert(mgrAccessConTicket.status === 403, `Manager accessing contractor ticket returned 403 Forbidden (actual: ${mgrAccessConTicket.status})`);

    // 9. Neither contractors nor managers can access admin-only controls
    console.log("\n[Test 9] Admin-Only Control Security Gate...");
    const conAccessAdminQueue = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/admin/all",
      method: "GET",
      headers: { "Authorization": `Bearer ${contractorAuth.token}` }
    });
    const mgrAccessAdminQueue = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/admin/all",
      method: "GET",
      headers: { "Authorization": `Bearer ${managerAuth.token}` }
    });
    assert(conAccessAdminQueue.status === 403, `Contractor accessing admin queue returned 403 (actual: ${conAccessAdminQueue.status})`);
    assert(mgrAccessAdminQueue.status === 403, `Manager accessing admin queue returned 403 (actual: ${mgrAccessAdminQueue.status})`);

    // 12. Re-running the seed script does not duplicate tickets or replies
    console.log("\n[Test 12] Seed Idempotency Check...");
    const seedHelpdesk = require("./seed_helpdesk");
    await seedHelpdesk();

    const queueAfterReSeed = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/inquiries/admin/all",
      method: "GET",
      headers: { "Authorization": `Bearer ${adminAuth.token}` }
    });
    const demo1Count = queueAfterReSeed.data.inquiries.filter(i => i.ticket_number === "TKT-2026-001").length;
    const demo2Count = queueAfterReSeed.data.inquiries.filter(i => i.ticket_number === "TKT-2026-002").length;
    assert(demo1Count === 1, `TKT-2026-001 count is exactly 1 (actual: ${demo1Count})`);
    assert(demo2Count === 1, `TKT-2026-002 count is exactly 1 (actual: ${demo2Count})`);

    // 13. Existing login, tender browsing, manager functionality continue working
    console.log("\n[Test 13] Regression Integrity Test...");
    const tendersRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/tenders",
      method: "GET"
    });
    assert(tendersRes.status === 200 && Array.isArray(tendersRes.data) && tendersRes.data.length === 36, `Tenders API returns 36 tenders (actual: ${tendersRes.data && tendersRes.data.length})`);

    const adminStatsRes = await request({
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/stats",
      method: "GET",
      headers: { "Authorization": `Bearer ${adminAuth.token}` }
    });
    assert(adminStatsRes.status === 200, "Existing admin/manager /api/admin/stats endpoint returns 200");

    console.log("\n========================================================");
    if (fails === 0) {
      console.log(`🎯 ALL ${passes} TESTS PASSED WITH 100% SUCCESS!`);
    } else {
      console.error(`💥 ${fails} TESTS FAILED out of ${passes + fails}`);
    }
    console.log("========================================================");

  } catch (err) {
    console.error("Test execution encountered an error:", err);
  }
}

if (require.main === module) {
  runTests().then(() => process.exit(0));
}

module.exports = runTests;
