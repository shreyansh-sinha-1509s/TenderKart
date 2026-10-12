const db = require("./db");
const bcrypt = require("bcryptjs");

console.log("Seeding / updating database with 11 realistic contractor and manager accounts...");

const usersToSeed = [
  // ==========================================
  // 1. 5 CONTRACTOR USERS
  // ==========================================
  {
    username: "CON1001",
    user_code: "CON1001",
    name: "Rajesh Mehta",
    company: "Mehta Infrastructure Works",
    department: null,
    email: "rajesh.mehta@demo.tenderkart.in",
    passwordRaw: "Contractor@1001",
    role: "contractor",
    created_at: "2026-08-05 10:30:00"
  },
  {
    username: "CON1002",
    user_code: "CON1002",
    name: "Amit Kulkarni",
    company: "Kulkarni Civil Projects",
    department: null,
    email: "amit.kulkarni@demo.tenderkart.in",
    passwordRaw: "Contractor@1002",
    role: "contractor",
    created_at: "2026-08-18 14:15:00"
  },
  {
    username: "CON1003",
    user_code: "CON1003",
    name: "Suresh Patil",
    company: "Patil Road & Bridge Contractors",
    department: null,
    email: "suresh.patil@demo.tenderkart.in",
    passwordRaw: "Contractor@1003",
    role: "contractor",
    created_at: "2026-09-03 09:45:00"
  },
  {
    username: "CON1004",
    user_code: "CON1004",
    name: "Neeraj Sharma",
    company: "Sharma Urban Construction",
    department: null,
    email: "neeraj.sharma@demo.tenderkart.in",
    passwordRaw: "Contractor@1004",
    role: "contractor",
    created_at: "2026-09-21 16:20:00"
  },
  {
    username: "CON1005",
    user_code: "CON1005",
    name: "Vikram Desai",
    company: "Desai Infrastructure Solutions",
    department: null,
    email: "vikram.desai@demo.tenderkart.in",
    passwordRaw: "Contractor@1005",
    role: "contractor",
    created_at: "2026-10-07 11:10:00"
  },

  // ==========================================
  // 2. 6 MANAGER USERS
  // ==========================================
  {
    username: "MGR2001",
    user_code: "MGR2001",
    name: "Anil Joshi",
    company: null,
    department: "Public Works Department",
    email: "anil.joshi@demo.tenderkart.in",
    passwordRaw: "Manager@2001",
    role: "manager",
    created_at: "2026-08-11 08:30:00"
  },
  {
    username: "MGR2002",
    user_code: "MGR2002",
    name: "Priya Nair",
    company: null,
    department: "Urban Development Department",
    email: "priya.nair@demo.tenderkart.in",
    passwordRaw: "Manager@2002",
    role: "manager",
    created_at: "2026-08-29 12:00:00"
  },
  {
    username: "MGR2003",
    user_code: "MGR2003",
    name: "Rohan Shah",
    company: null,
    department: "Municipal Infrastructure",
    email: "rohan.shah@demo.tenderkart.in",
    passwordRaw: "Manager@2003",
    role: "manager",
    created_at: "2026-09-14 15:45:00"
  },
  {
    username: "MGR2004",
    user_code: "MGR2004",
    name: "Kavita Rao",
    company: null,
    department: "Water Supply Department",
    email: "kavita.rao@demo.tenderkart.in",
    passwordRaw: "Manager@2004",
    role: "manager",
    created_at: "2026-09-26 10:15:00"
  },
  {
    username: "MGR2005",
    user_code: "MGR2005",
    name: "Manoj Verma",
    company: null,
    department: "Metro Infrastructure",
    email: "manoj.verma@demo.tenderkart.in",
    passwordRaw: "Manager@2005",
    role: "manager",
    created_at: "2026-10-09 14:00:00"
  },
  {
    username: "MGR2006",
    user_code: "MGR2006",
    name: "Sneha Iyer",
    company: null,
    department: "Smart City Development",
    email: "sneha.iyer@demo.tenderkart.in",
    passwordRaw: "Manager@2006",
    role: "manager",
    created_at: "2026-10-24 17:30:00"
  }
];

// Cleanly clear existing demo users and re-insert the 11 realistic accounts
db.query("DELETE FROM users", [], (err) => {
  if (err) console.error("Error clearing old users:", err);

  let inserted = 0;
  usersToSeed.forEach((u) => {
    const hashedPassword = bcrypt.hashSync(u.passwordRaw, 10);
    db.query(
      `INSERT INTO users (username, user_code, name, company, department, email, password, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.user_code, u.name, u.company, u.department, u.email, hashedPassword, u.role, u.created_at],
      (insertErr) => {
        if (insertErr) {
          console.error(`Error inserting user ${u.username}:`, insertErr.message);
        }
        inserted++;
        if (inserted === usersToSeed.length) {
          console.log(`✅ Successfully seeded all ${usersToSeed.length} accounts (5 Contractors + 6 Managers)!`);
          
          // Seed realistic applications
          db.query("SELECT id, user_code FROM users", [], (uErr, userRows) => {
            db.query("SELECT id, name FROM tenders", [], (tErr, tenderRows) => {
              const uMap = {};
              userRows.forEach(u => { if (u.user_code) uMap[u.user_code] = u.id; });
              const findT = (q) => tenderRows.find(t => t.name.toLowerCase().includes(q.toLowerCase())) || tenderRows[0];

              const tJabalpur = findT("Jabalpur");
              const tBrahmaputra = findT("Brahmaputra");
              const tDelhiKatra = findT("Delhi-Amritsar-Katra");
              const tMumbaiGoa = findT("Mumbai-Goa");
              const tThane = findT("Thane");
              const tChandrawal = findT("Chandrawal");
              const tJalJeevan = findT("Jal Jeevan");
              const tUltadanga = findT("Ultadanga");
              const tSecretariat = findT("Secretariat");

              const mgr1 = uMap["MGR2001"] || null;
              const mgr4 = uMap["MGR2004"] || mgr1;

              const apps = [
                { code: "APP-1001", uCode: "CON1001", tId: tJabalpur.id, date: "2026-08-14", bid: 8840000000, status: "Won", outcome: "Won", proposal: "Comprehensive EPC execution plan with in-house hot-mix plants and soil-testing labs.", missing: "[]", notes: "Qualified on all technical criteria. Financial bid was highly competitive (0.9% under estimate) with full plant machinery ownership certified.", evalId: mgr1, evalDate: "2026-09-28 11:30:00" },
                { code: "APP-1002", uCode: "CON1001", tId: tBrahmaputra.id, date: "2026-08-20", bid: 26800000000, status: "Not Awarded", outcome: "Not Awarded", proposal: "Joint-venture consortium submission with specialized deep river caisson subcontractors.", missing: JSON.stringify(["Hydraulic Rig & Marine Barge Ownership Documents"]), notes: "Bid amount exceeded the sanctioned budget outlay by 8.0%. Critical marine barge and heavy hydraulic piling rig ownership certificate was missing from Technical Envelope B.", evalId: mgr1, evalDate: "2026-09-22 14:15:00" },
                { code: "APP-1003", uCode: "CON1001", tId: tDelhiKatra.id, date: "2026-09-10", bid: 14100000000, status: "Under Review", outcome: "Pending", proposal: "Slip-form concrete paving methodology with automated laser leveling and high-capacity batching plants.", missing: "[]", notes: "Technical bids opened; compliance verification currently underway with regional NHAI office.", evalId: mgr1, evalDate: "2026-10-02 16:00:00" },
                { code: "APP-1004", uCode: "CON1001", tId: tMumbaiGoa.id, date: "2026-09-25", bid: 6720000000, status: "Submitted", outcome: "Pending", proposal: "Specialized rock nailing and ghat slope stabilization engineering proposal.", missing: "[]", notes: null, evalId: null, evalDate: null },
                { code: "APP-1005", uCode: "CON1001", tId: tThane.id, date: "2026-08-25", bid: 12400000000, status: "Withdrawn", outcome: "Withdrawn", proposal: "Voluntary withdrawal due to resource allocation prioritization toward NH-44 execution.", missing: "[]", notes: "Contractor requested formal withdrawal prior to financial bid opening.", evalId: mgr1, evalDate: "2026-09-05 10:00:00" },
                { code: "APP-1006", uCode: "CON1002", tId: tChandrawal.id, date: "2026-09-02", bid: 5750000000, status: "Under Review", outcome: "Pending", proposal: "Dual media rapid sand filtration and automated ozonation plant installation.", missing: "[]", notes: "Technical qualifications verified; awaiting commercial bid opening.", evalId: mgr4, evalDate: "2026-09-29 12:00:00" },
                { code: "APP-1007", uCode: "CON1002", tId: tJalJeevan.id, date: "2026-08-28", bid: 4550000000, status: "Won", outcome: "Won", proposal: "Multi-village DI pipeline laying and automated SCADA pump house integration.", missing: "[]", notes: "Excellent water transmission network experience; competitive financial bid within sanctioned outlay.", evalId: mgr4, evalDate: "2026-09-18 15:00:00" },
                { code: "APP-1008", uCode: "CON1003", tId: tUltadanga.id, date: "2026-09-15", bid: 3400000000, status: "Not Awarded", outcome: "Not Awarded", proposal: "Composite steel girder flyover launching during planned railway power blocks.", missing: JSON.stringify(["Railway Safety & RDSO Certified Fabrication Yard Approval"]), notes: "RDSO-certified girder fabrication yard clearance was not submitted.", evalId: mgr1, evalDate: "2026-09-30 14:00:00" },
                { code: "APP-1009", uCode: "CON1004", tId: tSecretariat.id, date: "2026-09-22", bid: 9650000000, status: "Under Review", outcome: "Pending", proposal: "GRIHA 4-star certified green building construction with prefabricated structural components.", missing: "[]", notes: "Awaiting environmental structural clearance review.", evalId: mgr1, evalDate: "2026-10-04 11:00:00" }
              ];

              db.query("DELETE FROM applications", [], () => {
                let appIns = 0;
                apps.forEach(a => {
                  const cId = uMap[a.uCode];
                  db.query(
                    `INSERT INTO applications (
                      application_code, contractor_id, tender_id, applied_on, bid_amount,
                      application_status, outcome, proposal_notes, missing_documents,
                      evaluation_notes, evaluator_id, evaluated_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [a.code, cId, a.tId, a.date, a.bid, a.status, a.outcome, a.proposal, a.missing, a.notes, a.evalId, a.evalDate],
                    () => {
                      appIns++;
                      if (appIns === apps.length) {
                        console.log(`✅ Successfully seeded ${apps.length} realistic application records!`);
                        db.query("SELECT COUNT(*) AS tenderCount FROM tenders", [], (tErr, tRows) => {
                          console.log(`📊 Verified Tenders in Database: ${tRows[0].tenderCount} records preserved.`);
                          process.exit(0);
                        });
                      }
                    }
                  );
                });
              });
            });
          });
        }
      }
    );
  });
});
