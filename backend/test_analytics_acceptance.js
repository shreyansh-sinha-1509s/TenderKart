/**
 * Automated Acceptance Test Suite for Analytics & Intelligence Module
 * Tests:
 * 1. Web Analytics Overview & event aggregates
 * 2. Tender Insights distributions & deadlines
 * 3. K-Means clustering algorithm output & cluster centroids
 * 4. Apriori Association Rules mining
 * 5. Contractor Performance metrics & win rate formula
 * 6. Power BI CSV Data Exports
 * 7. Real-time Event logging
 */

const http = require("http");
const app = require("./server");

let server;
const PORT = 5099;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      "Content-Type": "application/json"
    };
    if (payload) {
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: "localhost",
      port: PORT,
      path: path,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("========================================================");
  console.log("🧪 TESTING UNIFIED ANALYTICS & INTELLIGENCE MODULE");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  try {
    // Test 1: Web Analytics Overview
    console.log("[Test 1] Testing Web Analytics Overview (/api/analytics/overview)...");
    const overviewRes = await request("GET", "/api/analytics/overview");
    assert(overviewRes.status === 200, "Overview endpoint returns HTTP 200");
    assert(overviewRes.body.summary && overviewRes.body.summary.total_events >= 50, `Total recorded events >= 50 (actual: ${overviewRes.body.summary?.total_events})`);
    assert(overviewRes.body.popular_categories && overviewRes.body.popular_categories.length > 0, "Popular categories returned");
    assert(overviewRes.body.popular_locations && overviewRes.body.popular_locations.length > 0, "Popular locations returned");
    assert(overviewRes.body.activity_trends && overviewRes.body.activity_trends.length > 0, "Activity trends returned");

    // Test 2: Tender Insights
    console.log("\n[Test 2] Testing Tender Insights (/api/analytics/insights)...");
    const insightsRes = await request("GET", "/api/analytics/insights");
    assert(insightsRes.status === 200, "Insights endpoint returns HTTP 200");
    assert(insightsRes.body.summary && insightsRes.body.summary.total_tenders >= 30, `Total tenders >= 30 (actual: ${insightsRes.body.summary?.total_tenders})`);
    assert(insightsRes.body.category_distribution && insightsRes.body.category_distribution.length >= 5, "Category distribution contains major infrastructure verticals");
    assert(insightsRes.body.budget_distribution && insightsRes.body.budget_distribution.under_50cr !== undefined, "Budget brackets calculated");
    assert(insightsRes.body.upcoming_deadlines && insightsRes.body.upcoming_deadlines.length > 0, "Upcoming tender deadlines returned");

    // Test 3: K-Means Clustering
    console.log("\n[Test 3] Testing Data Mining K-Means (/api/analytics/data-mining/kmeans)...");
    const kmeansRes = await request("GET", "/api/analytics/data-mining/kmeans");
    assert(kmeansRes.status === 200, "K-Means endpoint returns HTTP 200");
    assert(kmeansRes.body.algorithm === "K-Means Clustering", "Algorithm identified as K-Means Clustering");
    assert(kmeansRes.body.cluster_summaries && kmeansRes.body.cluster_summaries.length === 3, `K=3 clusters generated (actual: ${kmeansRes.body.cluster_summaries?.length})`);
    assert(kmeansRes.body.contractor_assignments && kmeansRes.body.contractor_assignments.length >= 10, `All demo contractors assigned to clusters (count: ${kmeansRes.body.contractor_assignments?.length})`);

    // Test 4: Apriori Association Rules
    console.log("\n[Test 4] Testing Apriori Association Rules (/api/analytics/data-mining/apriori)...");
    const aprioriRes = await request("GET", "/api/analytics/data-mining/apriori");
    assert(aprioriRes.status === 200, "Apriori endpoint returns HTTP 200");
    assert(aprioriRes.body.rules && aprioriRes.body.rules.length > 0, `Association rules generated (actual: ${aprioriRes.body.rules?.length})`);
    assert(aprioriRes.body.rules[0].lift > 1.0, `Top association rule has Lift > 1.0 (actual: ${aprioriRes.body.rules[0]?.lift})`);

    // Test 5: My Performance & Win Rate Calculation
    console.log("\n[Test 5] Testing My Performance (/api/analytics/my-performance)...");
    const perfRes = await request("GET", "/api/analytics/my-performance?contractor_code=CON1001");
    assert(perfRes.status === 200, "Performance endpoint returns HTTP 200");
    assert(perfRes.body.contractor && perfRes.body.contractor.user_code === "CON1001", "Returned profile for CON1001 Rajesh Mehta");
    // Verify Win Rate Formula: Wins / (Wins + Losses) * 100
    const m = perfRes.body.metrics;
    const expectedRate = m.decided_bids > 0 ? parseFloat(((m.confirmed_wins / m.decided_bids) * 100).toFixed(1)) : 0.0;
    assert(m.win_rate === expectedRate, `Win rate strictly matches decided outcomes formula: ${m.win_rate}% vs expected ${expectedRate}%`);
    assert(perfRes.body.category_breakdown && perfRes.body.category_breakdown.length > 0, "Category-wise performance breakdown present");
    assert(perfRes.body.evidence_suggestions && perfRes.body.evidence_suggestions.length > 0, "Evidence-based suggestions generated");

    // Test 6: Real-time Event Logging
    console.log("\n[Test 6] Testing Event Logging (/api/analytics/events)...");
    const logRes = await request("POST", "/api/analytics/events", {
      event_type: "tender_view",
      tender_id: 1,
      category: "Roads",
      location: "Mumbai, Maharashtra",
      session_id: "test_session_999"
    });
    assert(logRes.status === 201, "Event logged with HTTP 201 Created");
    assert(logRes.body.event_id > 0, "Returned valid auto-increment event_id");

    // Test 7: Power BI CSV Exports
    console.log("\n[Test 7] Testing Power BI CSV Data Exports (/api/analytics/export/csv/*)...");
    const tendersCsv = await request("GET", "/api/analytics/export/csv/tenders");
    assert(tendersCsv.status === 200, "Tenders CSV export returns HTTP 200");
    assert(typeof tendersCsv.body === "string" && tendersCsv.body.includes("Tender_ID,Tender_Name"), "Tenders CSV contains proper headers");

    const eventsCsv = await request("GET", "/api/analytics/export/csv/events");
    assert(eventsCsv.status === 200, "Events CSV export returns HTTP 200");
    assert(typeof eventsCsv.body === "string" && eventsCsv.body.includes("Event_ID,Event_Type"), "Events CSV contains proper headers");

    const appsCsv = await request("GET", "/api/analytics/export/csv/applications");
    assert(appsCsv.status === 200, "Applications CSV export returns HTTP 200");
    assert(typeof appsCsv.body === "string" && appsCsv.body.includes("Application_Code,Contractor_Code"), "Applications CSV contains proper headers");

    const contractorsCsv = await request("GET", "/api/analytics/export/csv/contractors");
    assert(contractorsCsv.status === 200, "Contractors CSV export returns HTTP 200");
    assert(typeof contractorsCsv.body === "string" && contractorsCsv.body.includes("Contractor_Code,Name,Company"), "Contractors CSV contains proper headers");

    console.log("\n========================================================");
    console.log(`🎯 RESULT: ${passed} / ${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
    console.log("========================================================\n");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    server.close();
  }
}

server = app.listen(PORT, () => {
  runTests();
});
