/**
 * Seed realistic Web Analytics & User Interaction Events for TenderKart
 * Generates events over the past 30 days for:
 * - Tender views
 * - Searches (location & keyword)
 * - Category filters
 * - Watchlist saves
 * - Application records
 */

const db = require("./db");
const rawDb = db.rawDb;

function seedAnalyticsEvents() {
  return new Promise((resolve, reject) => {
    rawDb.get("SELECT COUNT(*) AS count FROM analytics_events", async (err, row) => {
      if (err) {
        console.error("Error checking analytics_events table:", err);
        return resolve();
      }

      if (row && row.count >= 50) {
        console.log(`Analytics events already seeded (${row.count} events in database). Skipping.`);
        return resolve();
      }

      console.log("Seeding realistic web analytics & user interaction events...");

      // Fetch tenders to link events with real tender IDs, categories, and locations
      rawDb.all("SELECT id, name, category, location FROM tenders", (tErr, tenders) => {
        if (tErr || !tenders || tenders.length === 0) {
          console.warn("No tenders available to seed analytics events against.");
          return resolve();
        }

        // Fetch contractors to link user_id
        rawDb.all("SELECT id FROM users WHERE role = 'contractor'", (uErr, users) => {
          const userIds = (users && users.length > 0) ? users.map(u => u.id) : [null];
          
          const sampleSearches = [
            { loc: "Mumbai, Maharashtra", kw: "coastal road" },
            { loc: "Mira-Bhayandar, Maharashtra", kw: "water pipeline" },
            { loc: "Pune, Maharashtra", kw: "ring road" },
            { loc: "Bengaluru, Karnataka", kw: "metro phase 2" },
            { loc: "New Delhi, Delhi", kw: "administrative complex" },
            { loc: "Bhopal, Madhya Pradesh", kw: "smart city ICCC" },
            { loc: "Nagpur, Maharashtra", kw: "elevated corridor" },
            { loc: "Ahmedabad, Gujarat", kw: "flyover" },
            { loc: "Surat, Gujarat", kw: "water treatment" },
            { loc: "Indore, Madhya Pradesh", kw: "metro viaduct" },
            { loc: "Kolkata, West Bengal", kw: "bridge" },
            { loc: "Prayagraj, Uttar Pradesh", kw: "ghat development" }
          ];

          const categories = [
            "Roads", "Bridges", "Water Supply", "Buildings", "Smart City", "Metro Projects"
          ];

          const events = [];

          // 1. Generate ~110 Tender View events over last 30 days
          for (let i = 0; i < 110; i++) {
            const tender = tenders[Math.floor(Math.random() * tenders.length)];
            const daysAgo = Math.floor(Math.random() * 28);
            const hoursAgo = Math.floor(Math.random() * 24);
            const uid = Math.random() > 0.3 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
            
            events.push({
              event_type: "tender_view",
              user_id: uid,
              tender_id: tender.id,
              category: tender.category,
              location: tender.location,
              search_keyword: null,
              metadata: JSON.stringify({ page: "tenderDetails.html", referrer: "tenders.html" }),
              session_id: `sess_${1000 + (i % 25)}`,
              daysAgo,
              hoursAgo
            });
          }

          // 2. Generate ~55 Search events
          for (let i = 0; i < 55; i++) {
            const s = sampleSearches[Math.floor(Math.random() * sampleSearches.length)];
            const daysAgo = Math.floor(Math.random() * 28);
            const hoursAgo = Math.floor(Math.random() * 24);
            const uid = Math.random() > 0.4 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
            
            events.push({
              event_type: "tender_search",
              user_id: uid,
              tender_id: null,
              category: null,
              location: s.loc,
              search_keyword: s.kw,
              metadata: JSON.stringify({ page: "tenders.html", hits: Math.floor(Math.random() * 6) + 1 }),
              session_id: `sess_${1000 + (i % 25)}`,
              daysAgo,
              hoursAgo
            });
          }

          // 3. Generate ~35 Category Filter events
          for (let i = 0; i < 35; i++) {
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const daysAgo = Math.floor(Math.random() * 28);
            const hoursAgo = Math.floor(Math.random() * 24);
            const uid = Math.random() > 0.5 ? userIds[Math.floor(Math.random() * userIds.length)] : null;

            events.push({
              event_type: "category_filter",
              user_id: uid,
              tender_id: null,
              category: cat,
              location: null,
              search_keyword: null,
              metadata: JSON.stringify({ source: "quick_chip" }),
              session_id: `sess_${1000 + (i % 25)}`,
              daysAgo,
              hoursAgo
            });
          }

          // 4. Generate ~25 Watchlist Save events
          for (let i = 0; i < 25; i++) {
            const tender = tenders[Math.floor(Math.random() * tenders.length)];
            const daysAgo = Math.floor(Math.random() * 25);
            const uid = userIds[Math.floor(Math.random() * userIds.length)];

            events.push({
              event_type: "tender_save",
              user_id: uid,
              tender_id: tender.id,
              category: tender.category,
              location: tender.location,
              search_keyword: null,
              metadata: JSON.stringify({ action: "bookmark" }),
              session_id: `sess_${1000 + (i % 25)}`,
              daysAgo,
              hoursAgo: 12
            });
          }

          // Batch insert events
          const stmt = rawDb.prepare(`
            INSERT INTO analytics_events (
              event_type, user_id, tender_id, category, location, search_keyword, metadata, session_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days', '-' || ? || ' hours'))
          `);

          rawDb.serialize(() => {
            rawDb.run("BEGIN TRANSACTION");
            let inserted = 0;
            events.forEach((ev) => {
              stmt.run(
                ev.event_type,
                ev.user_id,
                ev.tender_id,
                ev.category,
                ev.location,
                ev.search_keyword,
                ev.metadata,
                ev.session_id,
                ev.daysAgo,
                ev.hoursAgo,
                (err) => {
                  if (!err) inserted++;
                }
              );
            });
            stmt.finalize();
            rawDb.run("COMMIT", () => {
              console.log(`Successfully seeded ${inserted} realistic analytics events.`);
              resolve();
            });
          });

        });
      });
    });
  });
}

if (require.main === module) {
  seedAnalyticsEvents().then(() => {
    console.log("Analytics events seed completed.");
    process.exit(0);
  });
}

module.exports = { seedAnalyticsEvents };
