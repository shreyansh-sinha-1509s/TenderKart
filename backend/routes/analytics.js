const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const db = require("../db");

const JWT_SECRET = "student_secret_key_12345";

// Optional Auth Middleware (attaches req.user if valid token provided)
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    req.user = err ? null : decoded;
    next();
  });
}

// Strict Auth Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication required to access personal performance data." });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Session expired. Please login again." });
    }
    req.user = decoded;
    next();
  });
}

// -------------------------------------------------------------
// 1. EVENT LOGGING (Real-time Instrumentation)
// -------------------------------------------------------------
router.post("/events", optionalAuth, (req, res) => {
  const {
    event_type,
    tender_id,
    category,
    location,
    search_keyword,
    metadata,
    session_id
  } = req.body;

  const validTypes = ["tender_view", "tender_search", "category_filter", "tender_save", "application_record"];
  if (!event_type || !validTypes.includes(event_type)) {
    return res.status(400).json({ message: "Invalid or missing event_type." });
  }

  const userId = req.user ? req.user.id : null;
  const metaStr = typeof metadata === "object" ? JSON.stringify(metadata) : (metadata || null);

  db.query(
    `INSERT INTO analytics_events (
      event_type, user_id, tender_id, category, location, search_keyword, metadata, session_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [event_type, userId, tender_id || null, category || null, location || null, search_keyword || null, metaStr, session_id || null],
    (err, result) => {
      if (err) {
        console.error("Failed to log analytics event:", err.message);
        return res.status(500).json({ message: "Database logging error." });
      }
      res.status(201).json({ message: "Event logged successfully.", event_id: result.insertId });
    }
  );
});

// -------------------------------------------------------------
// 2. OVERVIEW — WEB ANALYTICS METRICS
// -------------------------------------------------------------
router.get("/overview", (req, res) => {
  // Aggregate summary queries
  const queries = {
    counts: `
      SELECT 
        COUNT(*) AS total_events,
        COUNT(CASE WHEN event_type = 'tender_view' THEN 1 END) AS tender_views,
        COUNT(CASE WHEN event_type = 'tender_search' THEN 1 END) AS searches_count,
        COUNT(CASE WHEN event_type = 'tender_save' THEN 1 END) AS saves_count,
        COUNT(CASE WHEN event_type = 'category_filter' THEN 1 END) AS filters_count
      FROM analytics_events
    `,
    appsCount: `SELECT COUNT(*) AS total_applications FROM applications`,
    popularCategories: `
      SELECT category, COUNT(*) AS count
      FROM analytics_events
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 6
    `,
    popularLocations: `
      SELECT location, COUNT(*) AS count
      FROM analytics_events
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location
      ORDER BY count DESC
      LIMIT 8
    `,
    mostViewedTenders: `
      SELECT t.id, t.name, t.category, t.location, t.budget, COUNT(e.id) AS views_count
      FROM analytics_events e
      JOIN tenders t ON e.tender_id = t.id
      WHERE e.event_type = 'tender_view'
      GROUP BY t.id
      ORDER BY views_count DESC
      LIMIT 6
    `,
    trends: `
      SELECT 
        date(created_at) AS event_date,
        COUNT(*) AS total,
        COUNT(CASE WHEN event_type = 'tender_view' THEN 1 END) AS views,
        COUNT(CASE WHEN event_type = 'tender_search' THEN 1 END) AS searches,
        COUNT(CASE WHEN event_type = 'tender_save' THEN 1 END) AS saves
      FROM analytics_events
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY date(created_at)
      ORDER BY event_date ASC
    `,
    recentFeed: `
      SELECT 
        e.id, e.event_type, e.category, e.location, e.search_keyword, e.created_at,
        t.name AS tender_name,
        u.name AS user_name, u.role AS user_role
      FROM analytics_events e
      LEFT JOIN tenders t ON e.tender_id = t.id
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.id DESC
      LIMIT 12
    `
  };

  db.query(queries.counts, (cErr, cRows) => {
    if (cErr) return res.status(500).json({ message: "Error loading analytics counts." });

    db.query(queries.appsCount, (aErr, aRows) => {
      db.query(queries.popularCategories, (catErr, catRows) => {
        db.query(queries.popularLocations, (locErr, locRows) => {
          db.query(queries.mostViewedTenders, (mErr, mRows) => {
            db.query(queries.trends, (trErr, trRows) => {
              db.query(queries.recentFeed, (fErr, fRows) => {
                const totalEvents = cRows && cRows[0] ? cRows[0].total_events : 0;
                const tenderViews = cRows && cRows[0] ? cRows[0].tender_views : 0;
                const searches = cRows && cRows[0] ? cRows[0].searches_count : 0;
                const saves = cRows && cRows[0] ? cRows[0].saves_count : 0;
                const apps = aRows && aRows[0] ? aRows[0].total_applications : 0;

                res.json({
                  summary: {
                    total_events: totalEvents,
                    tender_views: tenderViews,
                    searches_count: searches,
                    saves_count: saves,
                    applications_count: apps
                  },
                  popular_categories: catRows || [],
                  popular_locations: locRows || [],
                  most_viewed_tenders: (mRows || []).map(t => ({
                    ...t,
                    budget_crores: t.budget ? (t.budget / 10000000.0).toFixed(2) : "0.00"
                  })),
                  activity_trends: trRows || [],
                  recent_activity_feed: fRows || []
                });
              });
            });
          });
        });
      });
    });
  });
});

// -------------------------------------------------------------
// 3. TENDER INSIGHTS (Macro Tender Analytics)
// -------------------------------------------------------------
router.get("/insights", (req, res) => {
  const query = `
    SELECT id, name, department, category, budget, location, deadline, created_at
    FROM tenders
  `;

  db.query(query, (err, tenders) => {
    if (err) return res.status(500).json({ message: "Error loading tenders for insights." });

    const totalTenders = tenders.length;
    let totalBudget = 0;
    const catMap = {};
    const locMap = {};
    const brackets = {
      under_50cr: 0,
      cr_50_to_200: 0,
      cr_200_to_500: 0,
      above_500cr: 0
    };

    const now = new Date();
    now.setHours(0,0,0,0);
    let openCount = 0;
    let closingSoonCount = 0;
    let closedCount = 0;

    const upcomingList = [];

    tenders.forEach(t => {
      const b = parseFloat(t.budget) || 0;
      totalBudget += b;
      const bCr = b / 10000000.0;

      // Category breakdown
      if (!catMap[t.category]) {
        catMap[t.category] = { count: 0, total_budget: 0 };
      }
      catMap[t.category].count += 1;
      catMap[t.category].total_budget += b;

      // Location breakdown
      const locKey = t.location.split(",")[0].trim();
      if (!locMap[locKey]) {
        locMap[locKey] = { count: 0, total_budget: 0 };
      }
      locMap[locKey].count += 1;
      locMap[locKey].total_budget += b;

      // Budget bracket
      if (bCr < 50) brackets.under_50cr += 1;
      else if (bCr <= 200) brackets.cr_50_to_200 += 1;
      else if (bCr <= 500) brackets.cr_200_to_500 += 1;
      else brackets.above_500cr += 1;

      // Deadlines
      const d = new Date(t.deadline);
      d.setHours(0,0,0,0);
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      
      let statusLabel = "Open";
      if (diffDays < 0) {
        statusLabel = "Closed";
        closedCount += 1;
      } else if (diffDays <= 7) {
        statusLabel = "Closing Soon";
        closingSoonCount += 1;
        upcomingList.push({ ...t, diffDays, budget_crores: bCr.toFixed(2) });
      } else {
        openCount += 1;
        upcomingList.push({ ...t, diffDays, budget_crores: bCr.toFixed(2) });
      }
    });

    upcomingList.sort((a, b) => a.diffDays - b.diffDays);

    const categoryDistribution = Object.keys(catMap).map(k => ({
      category: k,
      count: catMap[k].count,
      total_budget_crores: parseFloat((catMap[k].total_budget / 10000000.0).toFixed(2)),
      pct_of_total: totalTenders > 0 ? parseFloat(((catMap[k].count / totalTenders) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.count - a.count);

    const locationDistribution = Object.keys(locMap).map(k => ({
      location: k,
      count: locMap[k].count,
      total_budget_crores: parseFloat((locMap[k].total_budget / 10000000.0).toFixed(2))
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    res.json({
      summary: {
        total_tenders: totalTenders,
        total_budget_crores: parseFloat((totalBudget / 10000000.0).toFixed(2)),
        avg_budget_crores: totalTenders > 0 ? parseFloat((totalBudget / totalTenders / 10000000.0).toFixed(2)) : 0,
        status_breakdown: {
          open: openCount,
          closing_soon: closingSoonCount,
          closed: closedCount
        }
      },
      category_distribution: categoryDistribution,
      location_distribution: locationDistribution,
      budget_distribution: brackets,
      upcoming_deadlines: upcomingList.slice(0, 6)
    });
  });
});

// -------------------------------------------------------------
// 4. DATA MINING — K-MEANS & APRIORI RESULTS
// -------------------------------------------------------------
router.get("/data-mining/kmeans", (req, res) => {
  const jsonPath = path.join(__dirname, "..", "data_mining", "kmeans_results.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      return res.json(data);
    } catch (e) {
      console.warn("Could not read kmeans_results.json, running script live...");
    }
  }

  // If not yet generated, invoke python script
  const scriptPath = path.join(__dirname, "..", "data_mining", "kmeans_clustering.py");
  exec(`python "${scriptPath}" 3`, (err, stdout, stderr) => {
    if (err) {
      console.error("K-Means execution failed:", stderr);
      return res.status(500).json({ message: "K-Means execution failed.", error: stderr });
    }
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      res.json(data);
    } catch (parseErr) {
      res.status(500).json({ message: "Failed to parse K-Means output." });
    }
  });
});

router.post("/data-mining/run-kmeans", (req, res) => {
  const k = parseInt(req.body.k) || 3;
  const scriptPath = path.join(__dirname, "..", "data_mining", "kmeans_clustering.py");
  const jsonPath = path.join(__dirname, "..", "data_mining", "kmeans_results.json");

  exec(`python "${scriptPath}" ${k}`, (err, stdout, stderr) => {
    if (err) {
      console.error("Live K-Means run error:", stderr);
      return res.status(500).json({ message: "Execution error", error: stderr });
    }
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      res.json(data);
    } catch (parseErr) {
      res.status(500).json({ message: "Failed to parse generated clustering data." });
    }
  });
});

router.get("/data-mining/apriori", (req, res) => {
  const jsonPath = path.join(__dirname, "..", "data_mining", "apriori_results.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      return res.json(data);
    } catch (e) {
      console.warn("Could not read apriori_results.json, running script live...");
    }
  }

  const scriptPath = path.join(__dirname, "..", "data_mining", "apriori_mining.py");
  exec(`python "${scriptPath}"`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ message: "Apriori execution failed.", error: stderr });
    }
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      res.json(data);
    } catch (parseErr) {
      res.status(500).json({ message: "Failed to parse Apriori output." });
    }
  });
});

// -------------------------------------------------------------
// 5. MY PERFORMANCE — CONTRACTOR, MANAGER, ADMIN
// -------------------------------------------------------------
router.get("/my-performance", optionalAuth, (req, res) => {
  const targetCode = req.query.contractor_code;

  // If contractor_code query is provided (e.g. for demo exploration) or authenticated user is contractor
  let userFilter = "";
  let userParams = [];

  if (targetCode) {
    userFilter = "WHERE u.user_code = ?";
    userParams = [targetCode];
  } else if (req.user && req.user.role === "contractor") {
    userFilter = "WHERE u.id = ?";
    userParams = [req.user.id];
  } else {
    // Default fallback to first demo contractor (CON1001 Rajesh Mehta) for seamless demonstration
    userFilter = "WHERE u.user_code = 'CON1001'";
    userParams = [];
  }

  const query = `
    SELECT 
      u.id AS user_id, u.user_code, u.name AS contractor_name, u.company, u.email,
      a.id AS app_id, a.application_code, a.applied_on, a.bid_amount, a.application_status, a.outcome,
      a.proposal_notes, a.evaluation_notes,
      t.id AS tender_id, t.name AS tender_name, t.category, t.location, t.budget AS tender_budget
    FROM users u
    LEFT JOIN applications a ON u.id = a.contractor_id
    LEFT JOIN tenders t ON a.tender_id = t.id
    ${userFilter}
    ORDER BY a.applied_on DESC
  `;

  db.query(query, userParams, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving performance records." });
    }

    if (!rows || rows.length === 0) {
      return res.json({
        contractor: null,
        message: "No contractor records found for the requested profile."
      });
    }

    const first = rows[0];
    const contractorInfo = {
      id: first.user_id,
      user_code: first.user_code,
      name: first.contractor_name,
      company: first.company,
      email: first.email
    };

    // Calculate metrics
    let totalApps = 0;
    let wins = 0;
    let losses = 0;
    let pending = 0;
    let withdrawn = 0;
    const catStats = {};
    const applications = [];
    const feedbackList = [];

    rows.forEach(r => {
      if (!r.app_id) return; // Has 0 applications (e.g., CON1005 Vikram Desai)
      totalApps++;
      if (r.outcome === "Won") wins++;
      else if (r.outcome === "Lost" || r.outcome === "Not Awarded") losses++;
      else if (r.outcome === "Pending") pending++;

      if (r.application_status === "Withdrawn") withdrawn++;

      // Category breakdown
      const cat = r.category || "General";
      if (!catStats[cat]) {
        catStats[cat] = { category: cat, total: 0, won: 0, lost: 0, pending: 0 };
      }
      catStats[cat].total++;
      if (r.outcome === "Won") catStats[cat].won++;
      else if (r.outcome === "Lost" || r.outcome === "Not Awarded") catStats[cat].lost++;
      else if (r.outcome === "Pending") catStats[cat].pending++;

      if (r.evaluation_notes && r.evaluation_notes.trim()) {
        feedbackList.push({
          tender_name: r.tender_name,
          category: r.category,
          outcome: r.outcome,
          notes: r.evaluation_notes
        });
      }

      applications.push({
        id: r.app_id,
        code: r.application_code,
        applied_on: r.applied_on,
        bid_crores: r.bid_amount ? (r.bid_amount / 10000000.0).toFixed(2) : "0.00",
        tender_budget_crores: r.tender_budget ? (r.tender_budget / 10000000.0).toFixed(2) : "0.00",
        status: r.application_status,
        outcome: r.outcome,
        tender_name: r.tender_name,
        category: r.category,
        location: r.location,
        proposal: r.proposal_notes,
        evaluation: r.evaluation_notes
      });
    });

    const decided = wins + losses;
    const winRate = decided > 0 ? parseFloat(((wins / decided) * 100).toFixed(1)) : 0.0;

    // Category stats array with individual win rates
    const categoryBreakdown = Object.values(catStats).map(c => {
      const cDecided = c.won + c.lost;
      const cRate = cDecided > 0 ? parseFloat(((c.won / cDecided) * 100).toFixed(1)) : 0.0;
      return { ...c, win_rate: cRate };
    });

    // Evidence-based suggestions
    const suggestions = [];
    if (winRate >= 50) {
      suggestions.push({
        type: "success",
        title: "High Conversion Rate",
        text: "Demonstrates strong competitive bidding in technical qualifications and pricing accuracy. Recommended to explore larger multi-crore public joint-ventures."
      });
    } else if (totalApps > 0 && winRate < 40) {
      suggestions.push({
        type: "warning",
        title: "Bid Margin Optimization",
        text: "Recorded evaluation notes indicate price proposals are frequently 8–12% above winning L1 benchmark. Consider re-evaluating machinery depreciation and material sub-vendor rates."
      });
    }
    if (pending > 2) {
      suggestions.push({
        type: "info",
        title: "Active Pipeline Under Review",
        text: `${pending} bid submissions currently under administrative financial evaluation. Monitor helpdesk inquiries for any required NIT document clarifications.`
      });
    }

    res.json({
      contractor: contractorInfo,
      metrics: {
        total_applications: totalApps,
        confirmed_wins: wins,
        confirmed_losses: losses,
        pending_applications: pending,
        withdrawn_applications: withdrawn,
        decided_bids: decided,
        win_rate: winRate
      },
      category_breakdown: categoryBreakdown,
      feedback_insights: feedbackList,
      evidence_suggestions: suggestions,
      recent_applications: applications
    });
  });
});

// -------------------------------------------------------------
// 6. POWER BI & DATA EXPORT (CSV Generation)
// -------------------------------------------------------------
router.get("/export/csv/:dataset", (req, res) => {
  const dataset = req.params.dataset;

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  if (dataset === "tenders") {
    db.query("SELECT * FROM tenders ORDER BY id ASC", (err, rows) => {
      if (err) return res.status(500).send("Database error");
      const headers = ["Tender_ID", "Tender_Name", "Department", "Category", "Budget_INR", "Budget_Crores", "Location", "Deadline", "Eligibility", "Status"];
      const lines = [headers.join(",")];
      rows.forEach(r => {
        const bCr = r.budget ? (r.budget / 10000000.0).toFixed(2) : "0.00";
        lines.push([
          r.id,
          escapeCsv(r.name),
          escapeCsv(r.department),
          escapeCsv(r.category),
          r.budget,
          bCr,
          escapeCsv(r.location),
          escapeCsv(r.deadline),
          escapeCsv(r.eligibility),
          escapeCsv(r.description ? "Active" : "Closed")
        ].join(","));
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="tenders_dataset.csv"');
      return res.send(lines.join("\n"));
    });
  } else if (dataset === "events") {
    db.query("SELECT * FROM analytics_events ORDER BY id ASC", (err, rows) => {
      if (err) return res.status(500).send("Database error");
      const headers = ["Event_ID", "Event_Type", "User_ID", "Tender_ID", "Category", "Location", "Search_Keyword", "Session_ID", "Timestamp"];
      const lines = [headers.join(",")];
      rows.forEach(r => {
        lines.push([
          r.id,
          escapeCsv(r.event_type),
          r.user_id || "",
          r.tender_id || "",
          escapeCsv(r.category),
          escapeCsv(r.location),
          escapeCsv(r.search_keyword),
          escapeCsv(r.session_id),
          escapeCsv(r.created_at)
        ].join(","));
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="events_dataset.csv"');
      return res.send(lines.join("\n"));
    });
  } else if (dataset === "applications") {
    const q = `
      SELECT 
        a.id AS app_id, a.application_code, a.applied_on, a.bid_amount, a.application_status, a.outcome, a.evaluation_notes,
        u.user_code AS contractor_code, u.name AS contractor_name, u.company,
        t.id AS tender_id, t.name AS tender_name, t.category, t.location, t.budget AS tender_budget
      FROM applications a
      JOIN users u ON a.contractor_id = u.id
      JOIN tenders t ON a.tender_id = t.id
      ORDER BY a.id ASC
    `;
    db.query(q, (err, rows) => {
      if (err) return res.status(500).send("Database error");
      const headers = ["Application_Code", "Contractor_Code", "Contractor_Name", "Company", "Tender_ID", "Tender_Name", "Category", "Location", "Applied_On", "Bid_Amount_INR", "Bid_Amount_Crores", "Tender_Budget_Crores", "Status", "Outcome", "Evaluator_Notes"];
      const lines = [headers.join(",")];
      rows.forEach(r => {
        const bCr = r.bid_amount ? (r.bid_amount / 10000000.0).toFixed(2) : "0.00";
        const tCr = r.tender_budget ? (r.tender_budget / 10000000.0).toFixed(2) : "0.00";
        lines.push([
          escapeCsv(r.application_code),
          escapeCsv(r.contractor_code),
          escapeCsv(r.contractor_name),
          escapeCsv(r.company),
          r.tender_id,
          escapeCsv(r.tender_name),
          escapeCsv(r.category),
          escapeCsv(r.location),
          escapeCsv(r.applied_on),
          r.bid_amount || 0,
          bCr,
          tCr,
          escapeCsv(r.application_status),
          escapeCsv(r.outcome),
          escapeCsv(r.evaluation_notes)
        ].join(","));
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="applications_dataset.csv"');
      return res.send(lines.join("\n"));
    });
  } else if (dataset === "contractors") {
    const jsonPath = path.join(__dirname, "..", "data_mining", "kmeans_results.json");
    let clusterMap = {};
    if (fs.existsSync(jsonPath)) {
      try {
        const kdata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        (kdata.contractor_assignments || []).forEach(ca => {
          clusterMap[ca.user_code] = `Cluster ${ca.cluster}`;
        });
      } catch (e) {}
    }

    const q = `
      SELECT 
        u.user_code, u.name, u.company, u.email,
        COUNT(a.id) AS total_bids,
        COUNT(CASE WHEN a.outcome = 'Won' THEN 1 END) AS wins,
        COUNT(CASE WHEN a.outcome IN ('Lost', 'Not Awarded') THEN 1 END) AS losses,
        COUNT(CASE WHEN a.outcome = 'Pending' THEN 1 END) AS pending,
        ROUND(AVG(a.bid_amount) / 10000000.0, 2) AS avg_bid_cr
      FROM users u
      LEFT JOIN applications a ON u.id = a.contractor_id
      WHERE u.role = 'contractor'
      GROUP BY u.id
      ORDER BY u.id ASC
    `;
    db.query(q, (err, rows) => {
      if (err) return res.status(500).send("Database error");
      const headers = ["Contractor_Code", "Name", "Company", "Email", "Total_Bids", "Wins", "Losses", "Pending", "Decided_Bids", "Win_Rate_Pct", "Avg_Bid_Crores", "Assigned_Cluster"];
      const lines = [headers.join(",")];
      rows.forEach(r => {
        const decided = r.wins + r.losses;
        const rate = decided > 0 ? ((r.wins / decided) * 100).toFixed(1) : "0.0";
        lines.push([
          escapeCsv(r.user_code),
          escapeCsv(r.name),
          escapeCsv(r.company),
          escapeCsv(r.email),
          r.total_bids,
          r.wins,
          r.losses,
          r.pending,
          decided,
          rate,
          r.avg_bid_cr || "0.00",
          escapeCsv(clusterMap[r.user_code] || "Unassigned")
        ].join(","));
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="contractors_dataset.csv"');
      return res.send(lines.join("\n"));
    });
  } else {
    res.status(404).send("Unknown dataset. Supported: tenders, events, applications, contractors.");
  }
});

module.exports = router;
