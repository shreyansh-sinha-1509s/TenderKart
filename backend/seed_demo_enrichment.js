// backend/seed_demo_enrichment.js
// Idempotent seeding script for enriching TenderKart with realistic demo tenders,
// contractors, and application histories.

const db = require("./db");
const bcrypt = require("bcryptjs");
const { newTenders, newContractors } = require("./demo_dataset");

console.log("==================================================");
console.log("🚀 STARTING TENDERKART DEMO ENRICHMENT SEEDER");
console.log("==================================================");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function seed() {
  try {
    // -------------------------------------------------------------
    // 1. SEED / ENSURE CONTRACTORS (CON1001 - CON1010) & MANAGERS
    // -------------------------------------------------------------
    console.log("Checking and inserting contractors...");
    let addedContractors = 0;

    for (const c of newContractors) {
      const existing = await runQuery(
        "SELECT id, user_code FROM users WHERE user_code = ? OR username = ? LIMIT 1",
        [c.user_code, c.username]
      );

      if (existing.length === 0) {
        const hashedPassword = bcrypt.hashSync(c.passwordRaw, 10);
        await runQuery(
          `INSERT INTO users (username, user_code, name, company, department, email, password, role, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.username, c.user_code, c.name, c.company, c.department, c.email, hashedPassword, c.role, c.created_at]
        );
        addedContractors++;
        console.log(`  + Added Contractor: ${c.user_code} (${c.name})`);
      }
    }
    console.log(`✅ Contractors ensured. (${addedContractors} new added)`);

    // Fetch user map (user_code -> id)
    const allUsers = await runQuery("SELECT id, user_code, role FROM users");
    const userMap = {};
    allUsers.forEach(u => {
      if (u.user_code) userMap[u.user_code] = u.id;
    });

    const mgr1 = userMap["MGR2001"] || null;
    const mgr2 = userMap["MGR2002"] || mgr1;
    const mgr3 = userMap["MGR2003"] || mgr1;
    const mgr4 = userMap["MGR2004"] || mgr1;
    const mgr5 = userMap["MGR2005"] || mgr1;
    const mgr6 = userMap["MGR2006"] || mgr1;

    // -------------------------------------------------------------
    // 2. SEED / ENSURE TENDERS (24 New Tenders to reach ~36 total)
    // -------------------------------------------------------------
    console.log("Checking and inserting expanded tenders...");
    let addedTenders = 0;

    for (const t of newTenders) {
      const existing = await runQuery(
        "SELECT id FROM tenders WHERE name = ? LIMIT 1",
        [t.name]
      );

      if (existing.length === 0) {
        await runQuery(
          `INSERT INTO tenders (name, department, category, budget, location, deadline, eligibility, required_documents, description, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.name, t.department, t.category, t.budget, t.location, t.deadline, t.eligibility, t.required_documents, t.description, t.source_url]
        );
        addedTenders++;
        console.log(`  + Added Tender: "${t.name.substring(0, 45)}..." in ${t.location}`);
      }
    }
    console.log(`✅ Tenders ensured. (${addedTenders} new added)`);

    // Fetch all tenders for lookup by keyword
    const allTenders = await runQuery("SELECT id, name, category, budget, location, deadline FROM tenders");
    console.log(`📊 Total Tenders currently in Database: ${allTenders.length}`);

    const findTender = (keyword) => {
      const found = allTenders.find(t => t.name.toLowerCase().includes(keyword.toLowerCase()));
      if (!found) {
        console.warn(`⚠️ Warning: Tender with keyword "${keyword}" not found. Falling back to ID ${allTenders[0].id}`);
        return allTenders[0];
      }
      return found;
    };

    // Pre-resolve tender IDs for robust referencing
    const tJabalpur = findTender("Jabalpur");
    const tBrahmaputra = findTender("Brahmaputra");
    const tDelhiKatra = findTender("Delhi-Amritsar-Katra");
    const tMumbaiGoa = findTender("Mumbai-Goa");
    const tThaneBridge = findTender("across Thane Creek");
    const tChandrawal = findTender("Chandrawal");
    const tJalJeevan = findTender("Jal Jeevan");
    const tUltadanga = findTender("Ultadanga");
    const tSecretariat = findTender("Secretariat");
    const tAIIMS = findTender("AIIMS");
    const tAerocity = findTender("Aerocity");
    const tBhopalSmart = findTender("Bhopal Smart City");

    // New tender lookups
    const tGhodbunderRoad = findTender("Ghodbunder Link Road");
    const tPuneHCMTR = findTender("HCMTR");
    const tNagpurRing = findTender("Outer Ring Road Phase-III");
    const tBengaluruPRR = findTender("Peripheral Ring Road");
    const tNashikRoad = findTender("Trimbak Road");

    const tBhayandarBridge = findTender("Bhayandar West and Naigaon");
    const tTapiBridge = findTender("Tapi River");
    const tPuneFlyover = findTender("University Junction");
    const tAhmedabadROB = findTender("Ahmedabad-Vadodara Railway Line");

    const tSuryaWater = findTender("Surya Regional Bulk Water");
    const tTemgharWater = findTender("Temghar Water Filtration");
    const tNarmadaWater = findTender("Narmada Phase-IV");
    const tCauveryWater = findTender("Cauvery Water Supply");
    const tMorbeWater = findTender("Morbe Dam");

    const tKEMHospital = findTender("KEM Hospital");
    const tGIFTCity = findTender("GIFT City");
    const tCIDCOHQ = findTender("Central Administrative Headquarters");
    const tDeviAhilya = findTender("Devi Ahilya");

    const tMetroLine9 = findTender("Metro Line 9");
    const tNammaMetro = findTender("Namma Metro Phase-2A");
    const tPuneMetro = findTender("Pune Metro Line 3 Extension");

    const tSuratFlood = findTender("Surat Smart City");
    const tPuneATCS = findTender("Pune Smart City Adaptive Traffic");
    const tNagpurITMS = findTender("Nagpur Smart Mobility");

    // Ensure applications table allows NULL bid_amount
    const cols = await runQuery("PRAGMA table_info(applications)");
    const bidCol = cols.find(c => c.name === "bid_amount");
    if (bidCol && bidCol.notnull === 1) {
      console.log("Migrating applications table to allow optional bid amounts...");
      await runQuery(`
        CREATE TABLE applications_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          application_code TEXT UNIQUE,
          contractor_id INTEGER NOT NULL,
          tender_id INTEGER NOT NULL,
          applied_on TEXT NOT NULL,
          bid_amount REAL,
          application_status TEXT NOT NULL DEFAULT 'Submitted',
          outcome TEXT DEFAULT 'Pending',
          proposal_notes TEXT,
          missing_documents TEXT,
          evaluation_notes TEXT,
          evaluator_id INTEGER,
          evaluated_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(contractor_id, tender_id),
          FOREIGN KEY(contractor_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
          FOREIGN KEY(evaluator_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      await runQuery("INSERT INTO applications_temp SELECT * FROM applications");
      await runQuery("DROP TABLE applications");
      await runQuery("ALTER TABLE applications_temp RENAME TO applications");
      console.log("✅ Applications table schema successfully updated.");
    }

    // -------------------------------------------------------------
    // 3. DEFINE COMPLETE 53 APPLICATION RECORDS
    // -------------------------------------------------------------
    const allApplications = [
      // ===========================================================
      // CON1001 (Rajesh Mehta - Mehta Infrastructure Works) [10 Apps: 4 Won, 3 Not Awarded, 2 Under Review, 1 Withdrawn -> 57.1% Win Rate]
      // ===========================================================
      {
        code: "APP-1001", uCode: "CON1001", tId: tJabalpur.id, date: "2026-08-14", bid: 8840000000,
        status: "Won", outcome: "Won",
        proposal: "Comprehensive EPC execution plan with in-house hot-mix plants and soil-testing labs.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Qualified on all technical criteria. Financial bid was highly competitive (0.9% under estimate) with full plant machinery ownership certified.",
        evalId: mgr1, evalDate: "2026-09-28 11:30:00"
      },
      {
        code: "APP-1002", uCode: "CON1001", tId: tBrahmaputra.id, date: "2026-08-20", bid: 26800000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Joint-venture consortium submission with specialized deep river caisson subcontractors.",
        missing: JSON.stringify(["Hydraulic Rig & Marine Barge Ownership Documents"]),
        notes: "[Simulated Evaluation Feedback] Bid amount exceeded the sanctioned budget outlay by 8.0%. Critical marine barge and heavy hydraulic piling rig ownership certificate was missing from Technical Envelope B.",
        evalId: mgr1, evalDate: "2026-09-22 14:15:00"
      },
      {
        code: "APP-1003", uCode: "CON1001", tId: tDelhiKatra.id, date: "2026-09-10", bid: 14100000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Slip-form concrete paving methodology with automated laser leveling and high-capacity batching plants.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Technical bids opened; compliance verification currently underway with regional NHAI office.",
        evalId: mgr1, evalDate: "2026-10-02 16:00:00"
      },
      {
        code: "APP-1004", uCode: "CON1001", tId: tMumbaiGoa.id, date: "2026-09-25", bid: 6720000000,
        status: "Won", outcome: "Won",
        proposal: "Specialized rock nailing and ghat slope stabilization engineering proposal.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Reviewed and confirmed by Technical Procurement Board. Exceptional L1 unit rate economics and hilly terrain geotechnical track record.",
        evalId: mgr1, evalDate: "2026-10-08 14:30:00"
      },
      {
        code: "APP-1005", uCode: "CON1001", tId: tThaneBridge.id, date: "2026-08-25", bid: 12400000000,
        status: "Withdrawn", outcome: "Withdrawn",
        proposal: "Voluntary withdrawal due to resource allocation prioritization toward NH-44 execution.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Contractor requested formal withdrawal prior to financial bid opening.",
        evalId: mgr1, evalDate: "2026-09-05 10:00:00"
      },
      {
        code: "APP-1006", uCode: "CON1001", tId: tGhodbunderRoad.id, date: "2026-09-12", bid: 1420000000,
        status: "Won", outcome: "Won",
        proposal: "Urban M40 concrete resurfacing with pre-approved ready-mix supplier network and nighttime staging.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Strong urban road execution proposal. Contractor scored highest in technical methodology and provided an optimized 6-month traffic detour plan.",
        evalId: mgr2, evalDate: "2026-10-01 15:45:00"
      },
      {
        code: "APP-1007", uCode: "CON1001", tId: tBhayandarBridge.id, date: "2026-09-18", bid: 3890000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Marine segmental bridge construction using self-propelled floating cranes.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Commercial proposal was 6.6% above benchmark budget estimate. Competitive L1 bidder selected by procurement committee.",
        evalId: mgr2, evalDate: "2026-10-03 17:00:00"
      },
      {
        code: "APP-1008", uCode: "CON1001", tId: tKEMHospital.id, date: "2026-09-29", bid: 3180000000,
        status: "Won", outcome: "Won",
        proposal: "Hospital structural retrofitting with non-intrusive carbon fiber wraps and vibration monitors.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Awarded. Demonstrated exceptional medical facility retrofitting safety protocols and submitted lowest compliant financial bid.",
        evalId: mgr3, evalDate: "2026-10-09 16:30:00"
      },
      {
        code: "APP-1009", uCode: "CON1001", tId: tMetroLine9.id, date: "2026-10-02", bid: 11900000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Elevated metro station box structural work and precast U-girder erection.",
        missing: "[]",
        notes: null, // Case F: Unsuccessful with complete checklist and no documented reason
        evalId: null, evalDate: null
      },
      {
        code: "APP-1010", uCode: "CON1001", tId: tPuneHCMTR.id, date: "2026-10-05", bid: null, // Test missing optional bid amount
        status: "Under Review", outcome: "Pending",
        proposal: "PMRDA elevated inner ring road preliminary technical qualification dossier.",
        missing: "[]",
        notes: "Technical pre-qualification envelope currently under scrutiny by PMC technical advisory cell.",
        evalId: mgr1, evalDate: "2026-10-10 11:00:00"
      },

      // ===========================================================
      // CON1002 (Amit Kulkarni - Kulkarni Civil Projects) [7 Apps: 2 Won, 3 Not Awarded, 2 Under Review -> 40.0% Win Rate]
      // ===========================================================
      {
        code: "APP-1011", uCode: "CON1002", tId: tChandrawal.id, date: "2026-09-02", bid: 5750000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Dual media rapid sand filtration and automated ozonation plant installation.",
        missing: "[]",
        notes: "Technical qualifications verified; awaiting commercial bid opening.",
        evalId: mgr4, evalDate: "2026-09-29 12:00:00"
      },
      {
        code: "APP-1012", uCode: "CON1002", tId: tJalJeevan.id, date: "2026-08-28", bid: 4550000000,
        status: "Won", outcome: "Won",
        proposal: "Multi-village DI pipeline laying and automated SCADA pump house integration.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Excellent water transmission network experience; competitive financial bid within sanctioned outlay.",
        evalId: mgr4, evalDate: "2026-09-18 15:00:00"
      },
      {
        code: "APP-1013", uCode: "CON1002", tId: tSuryaWater.id, date: "2026-09-15", bid: 4780000000,
        status: "Won", outcome: "Won",
        proposal: "Surya regional bulk pipeline fabrication with food-grade epoxy lining and break pressure reservoirs.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Confirmed winner. Contractor demonstrated complete MS pipe manufacturing tie-up and submitted L1 commercial rate.",
        evalId: mgr4, evalDate: "2026-10-02 14:00:00"
      },
      {
        code: "APP-1014", uCode: "CON1002", tId: tTemgharWater.id, date: "2026-09-22", bid: 3250000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Temghar water treatment filtration facility augmentation with SCADA telemetry.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Commercial quote was 10.2% above sanctioned public budget limit. Outlay allocation did not permit price deviation.",
        evalId: mgr4, evalDate: "2026-10-04 11:30:00"
      },
      {
        code: "APP-1015", uCode: "CON1002", tId: tMorbeWater.id, date: "2026-08-15", bid: 3400000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Raw water pipeline duplication across hilly section of Morbe Dam catchment.",
        missing: JSON.stringify(["Tunneling & Trenchless Pipe Jacking Machinery Proof"]),
        notes: "[Simulated Evaluation Feedback] Mandatory trenchless pipe jacking machinery ownership certificate for railway crossing section was not provided in Technical Envelope A.",
        evalId: mgr4, evalDate: "2026-09-12 16:00:00"
      },
      {
        code: "APP-1016", uCode: "CON1002", tId: tCIDCOHQ.id, date: "2026-09-28", bid: 4500000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Commercial office building structural construction with post-tensioned slabs.",
        missing: JSON.stringify(["GRIHA Green Building Compliance Manual"]),
        notes: "[Simulated Evaluation Feedback] Evaluator noted lack of certified green building compliance manual as stipulated in tender eligibility guidelines.",
        evalId: mgr2, evalDate: "2026-10-07 10:30:00"
      },
      {
        code: "APP-1017", uCode: "CON1002", tId: tNarmadaWater.id, date: "2026-10-03", bid: 6350000000,
        status: "Under Review", outcome: "Pending",
        proposal: "High-head river intake well pumping station and 1800mm diameter transmission main.",
        missing: "[]",
        notes: "Intake well geotechnical design under technical review by water resources consultant.",
        evalId: mgr4, evalDate: "2026-10-09 15:00:00"
      },

      // ===========================================================
      // CON1003 (Suresh Patil - Patil Road & Bridge Contractors) [5 Apps: 2 Won, 2 Not Awarded, 1 Under Review -> 50.0% Win Rate]
      // ===========================================================
      {
        code: "APP-1018", uCode: "CON1003", tId: tUltadanga.id, date: "2026-09-15", bid: 3400000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Composite steel girder flyover launching during planned railway power blocks.",
        missing: JSON.stringify(["Railway Safety & RDSO Certified Fabrication Yard Approval"]),
        notes: "[Simulated Evaluation Feedback] RDSO-certified girder fabrication yard clearance was not submitted.",
        evalId: mgr1, evalDate: "2026-09-30 14:00:00"
      },
      {
        code: "APP-1019", uCode: "CON1003", tId: tPuneFlyover.id, date: "2026-08-25", bid: 2800000000,
        status: "Won", outcome: "Won",
        proposal: "University junction double-decker flyover engineering and traffic detour scheme.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Contract awarded. Exemplary steel-concrete composite pier engineering track record and competitive pricing.",
        evalId: mgr1, evalDate: "2026-09-24 13:00:00"
      },
      {
        code: "APP-1020", uCode: "CON1003", tId: tNashikRoad.id, date: "2026-09-20", bid: 950000000,
        status: "Won", outcome: "Won",
        proposal: "Trimbak road rigid concrete pavement widening with modern slip-form pavers.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Successfully awarded. Bidder met all Class-I civil criteria and offered fastest mobilization schedule.",
        evalId: mgr1, evalDate: "2026-10-02 12:00:00"
      },
      {
        code: "APP-1021", uCode: "CON1003", tId: tNagpurRing.id, date: "2026-09-28", bid: 5650000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Outer ring road earthwork and asphalt surfacing package.",
        missing: "[]",
        notes: null, // Case F: Unsuccessful without documented reason
        evalId: null, evalDate: null
      },
      {
        code: "APP-1022", uCode: "CON1003", tId: tAhmedabadROB.id, date: "2026-10-06", bid: 3050000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Elevated highway ROB over railway line with reinforced earth ramps.",
        missing: "[]",
        notes: "Railway zone safety clearance verification currently underway.",
        evalId: mgr1, evalDate: "2026-10-10 14:00:00"
      },

      // ===========================================================
      // CON1004 (Neeraj Sharma - Sharma Urban Construction) [6 Apps: 1 Won, 3 Not Awarded, 2 Under Review -> 25.0% Win Rate]
      // ===========================================================
      {
        code: "APP-1023", uCode: "CON1004", tId: tSecretariat.id, date: "2026-09-22", bid: 9650000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "GRIHA 4-star certified green building construction with prefabricated structural components.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Evaluator recorded that CPWD Super-Special Class composite building experience criteria were not fully established.",
        evalId: mgr1, evalDate: "2026-10-04 11:00:00"
      },
      {
        code: "APP-1024", uCode: "CON1004", tId: tAIIMS.id, date: "2026-09-26", bid: 8400000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "AIIMS hospital structural civil work and multi-storey patient ward blocks.",
        missing: JSON.stringify(["Medical Gas Pipeline System (MGPS) & Modular OT Specialist Sub-Contractor MOUs"]),
        notes: "[Simulated Evaluation Feedback] Technical submission lacked mandatory formal tie-up MOU with specialized medical gas pipeline contractor.",
        evalId: mgr3, evalDate: "2026-10-05 16:30:00"
      },
      {
        code: "APP-1025", uCode: "CON1004", tId: tDeviAhilya.id, date: "2026-08-30", bid: 2950000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Convention hall structural steel frame and exhibition pavilion construction.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Financial bid exceeded the estimated budget by 5.4%. Competitor with L1 pricing awarded contract.",
        evalId: mgr3, evalDate: "2026-09-20 15:00:00"
      },
      {
        code: "APP-1026", uCode: "CON1004", tId: tGIFTCity.id, date: "2026-10-01", bid: 7350000000,
        status: "Won", outcome: "Won",
        proposal: "GIFT City diamond trade center twin towers with high-efficiency structural facade and IBMS.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Substantially improved documentation. Awarded after qualifying on all technical and IGBC green building compliance requirements.",
        evalId: mgr2, evalDate: "2026-10-09 17:00:00"
      },
      {
        code: "APP-1027", uCode: "CON1004", tId: tKEMHospital.id, date: "2026-10-04", bid: 3200000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Hospital modernization and hostel block building proposal.",
        missing: "[]",
        notes: "Technical evaluation committee reviewing structural engineering credentials.",
        evalId: mgr3, evalDate: "2026-10-09 12:00:00"
      },
      {
        code: "APP-1028", uCode: "CON1004", tId: tCIDCOHQ.id, date: "2026-10-08", bid: 4580000000,
        status: "Under Review", outcome: "Pending",
        proposal: "CIDCO headquarters post-tensioned RCC building construction.",
        missing: "[]",
        notes: "Awaiting environmental structural clearance review.",
        evalId: mgr2, evalDate: "2026-10-10 15:00:00"
      },

      // ===========================================================
      // CON1005 (Vikram Desai - Desai Infrastructure Solutions) [0 Apps -> Empty State Test]
      // ===========================================================
      // Intentionally 0 applications to test the dashboard empty state!

      // ===========================================================
      // CON1006 (Arvind Patel - Patel Earthmovers & Infra) [8 Apps: 4 Won, 2 Not Awarded, 2 Under Review -> 66.7% Win Rate]
      // ===========================================================
      {
        code: "APP-1029", uCode: "CON1006", tId: tJabalpur.id, date: "2026-08-10", bid: 8800000000,
        status: "Won", outcome: "Won",
        proposal: "Full EPC road package with 2 automated hot-mix plants and rapid slip-form concrete paving train.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Top-ranked bidder across technical and commercial scoring. Robust heavy equipment fleet verified on site.",
        evalId: mgr1, evalDate: "2026-09-20 14:00:00"
      },
      {
        code: "APP-1030", uCode: "CON1006", tId: tNagpurRing.id, date: "2026-08-25", bid: 5300000000,
        status: "Won", outcome: "Won",
        proposal: "Outer ring road Phase-III four-laning and grade separator construction.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Outstanding NHAI contractor performance track record. Awarded at 1.8% below initial departmental estimate.",
        evalId: mgr1, evalDate: "2026-09-26 16:30:00"
      },
      {
        code: "APP-1031", uCode: "CON1006", tId: tGhodbunderRoad.id, date: "2026-09-05", bid: 1400000000,
        status: "Won", outcome: "Won",
        proposal: "Concrete carriageway widening and utility duct construction.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Confirmed winner. Extensive urban concrete road building experience and lowest compliant financial offer.",
        evalId: mgr2, evalDate: "2026-09-29 11:00:00"
      },
      {
        code: "APP-1032", uCode: "CON1006", tId: tPuneHCMTR.id, date: "2026-09-18", bid: 7650000000,
        status: "Won", outcome: "Won",
        proposal: "Inner ring road viaduct civil construction and dedicated BRT infrastructure.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Awarded after rigorous technical compliance audit. Proven experience in executing complex urban access corridors.",
        evalId: mgr1, evalDate: "2026-10-06 14:00:00"
      },
      {
        code: "APP-1033", uCode: "CON1006", tId: tBengaluruPRR.id, date: "2026-09-22", bid: 19800000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Bengaluru peripheral ring road greenfield mega package.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Commercial quotation was 7.0% above the authorized government sanction. Competitor consortium awarded project.",
        evalId: mgr1, evalDate: "2026-10-04 15:30:00"
      },
      {
        code: "APP-1034", uCode: "CON1006", tId: tNashikRoad.id, date: "2026-09-26", bid: 1050000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Trimbak road cement concrete widening and culvert replacement.",
        missing: "[]",
        notes: null, // Case F: Unsuccessful with complete checklist, no documented reason
        evalId: null, evalDate: null
      },
      {
        code: "APP-1035", uCode: "CON1006", tId: tDelhiKatra.id, date: "2026-10-02", bid: 14150000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Access-controlled expressway continuous concrete pavement package.",
        missing: "[]",
        notes: "Technical pre-qualification bids under evaluation by NHAI tender committee.",
        evalId: mgr1, evalDate: "2026-10-08 11:00:00"
      },
      {
        code: "APP-1036", uCode: "CON1006", tId: tMumbaiGoa.id, date: "2026-10-06", bid: 6700000000,
        status: "Under Review", outcome: "Pending",
        proposal: "National Highway 66 ghat road widening and slope anchoring.",
        missing: "[]",
        notes: "Site visit and machinery inspection scheduled by regional PWD superintendent.",
        evalId: mgr1, evalDate: "2026-10-10 16:00:00"
      },

      // ===========================================================
      // CON1007 (Deepak Verma - Verma Metro & Tunneling) [5 Apps: 1 Won, 3 Not Awarded, 1 Under Review -> 25.0% Win Rate]
      // ===========================================================
      {
        code: "APP-1037", uCode: "CON1007", tId: tAerocity.id, date: "2026-08-18", bid: 16900000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "DMRC Silver Line underground tunneling and cut-and-cover station boxes.",
        missing: JSON.stringify(["Tunnel Boring Machine (EPB-TBM) Ownership / Lease Documentation"]),
        notes: "[Simulated Evaluation Feedback] Mandatory Earth Pressure Balance TBM manufacturer lease commitment was missing from Technical Envelope C.",
        evalId: mgr5, evalDate: "2026-09-15 12:00:00"
      },
      {
        code: "APP-1038", uCode: "CON1007", tId: tMetroLine9.id, date: "2026-09-08", bid: 10950000000,
        status: "Won", outcome: "Won",
        proposal: "Elevated viaduct and 8 stations between Dahisar and Mira-Bhayandar.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Awarded. High technical score on viaduct launching gantry safety management and lowest compliant commercial bid.",
        evalId: mgr5, evalDate: "2026-09-28 17:30:00"
      },
      {
        code: "APP-1039", uCode: "CON1007", tId: tNammaMetro.id, date: "2026-09-20", bid: 14200000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Outer ring road elevated metro viaduct and stations.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Financial quote was 6.0% above BMRCL budget benchmark. Another pre-qualified bidder submitted lower rate.",
        evalId: mgr5, evalDate: "2026-10-02 11:30:00"
      },
      {
        code: "APP-1040", uCode: "CON1007", tId: tPuneMetro.id, date: "2026-09-28", bid: 9100000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Hinjawadi metro extension viaduct and station structures.",
        missing: "[]",
        notes: null, // Case F: Unsuccessful with complete checklist, no documented reason
        evalId: null, evalDate: null
      },
      {
        code: "APP-1041", uCode: "CON1007", tId: tThaneBridge.id, date: "2026-10-05", bid: 12350000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Thane creek bridge marine substructure and segmental superstructure.",
        missing: "[]",
        notes: "Marine foundation design review underway with naval hydrographic authority.",
        evalId: mgr1, evalDate: "2026-10-10 12:30:00"
      },

      // ===========================================================
      // CON1008 (Ananya Sen - Sen Urban Engineering) [7 Apps: 2 Won, 3 Not Awarded, 2 Under Review -> 40.0% Win Rate]
      // ===========================================================
      {
        code: "APP-1042", uCode: "CON1008", tId: tSecretariat.id, date: "2026-08-20", bid: 9600000000,
        status: "Won", outcome: "Won",
        proposal: "Common Central Secretariat Integrated Office blocks with high-performance energy systems.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Winner confirmed. Excellent GRIHA green building technical credentials and competitive financial estimate.",
        evalId: mgr1, evalDate: "2026-09-20 16:00:00"
      },
      {
        code: "APP-1043", uCode: "CON1008", tId: tAIIMS.id, date: "2026-09-02", bid: 8350000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "AIIMS Rewari super speciality hospital campus package.",
        missing: JSON.stringify(["AERB Radiation Shielding Design Clearance"]),
        notes: "[Simulated Evaluation Feedback] Technical Envelope B lacked mandatory preliminary AERB radiation shielding compliance clearance for oncology wing.",
        evalId: mgr3, evalDate: "2026-09-25 14:00:00"
      },
      {
        code: "APP-1044", uCode: "CON1008", tId: tBhopalSmart.id, date: "2026-09-12", bid: 3800000000,
        status: "Won", outcome: "Won",
        proposal: "Bhopal Smart City ICCC platform expansion and video analytics integration.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Successfully awarded. Validated CMMI Level 5 software development credentials and competitive municipal support pricing.",
        evalId: mgr6, evalDate: "2026-10-01 10:00:00"
      },
      {
        code: "APP-1045", uCode: "CON1008", tId: tSuratFlood.id, date: "2026-09-22", bid: 1950000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Surat Smart City IoT flood early warning platform and sensor array.",
        missing: "[]",
        notes: "[Simulated Evaluation Feedback] Financial proposal exceeded municipal sanctioned allocation by 5.4%.",
        evalId: mgr6, evalDate: "2026-10-03 15:30:00"
      },
      {
        code: "APP-1046", uCode: "CON1008", tId: tPuneATCS.id, date: "2026-09-28", bid: 2500000000,
        status: "Not Awarded", outcome: "Not Awarded",
        proposal: "Adaptive traffic control system and AI camera surveillance expansion.",
        missing: "[]",
        notes: null, // Case F: Unsuccessful without documented reason
        evalId: null, evalDate: null
      },
      {
        code: "APP-1047", uCode: "CON1008", tId: tNagpurITMS.id, date: "2026-10-04", bid: 2100000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Smart transit fleet tracking and underground optical fiber communication backbone.",
        missing: "[]",
        notes: "System architecture and cybersecurity compliance review in progress by NSSCDCL.",
        evalId: mgr6, evalDate: "2026-10-09 14:00:00"
      },
      {
        code: "APP-1048", uCode: "CON1008", tId: tGIFTCity.id, date: "2026-10-07", bid: null, // Test missing optional bid amount
        status: "Under Review", outcome: "Pending",
        proposal: "GIFT City trade center high-rise commercial complex civil proposal.",
        missing: "[]",
        notes: "Preliminary eligibility documentation verified; awaiting commercial bid opening.",
        evalId: mgr2, evalDate: "2026-10-10 11:30:00"
      },

      // ===========================================================
      // CON1009 (Tarun Aggarwal - Aggarwal Smart Utilities) [2 Apps: 0 Won, 0 Not Awarded, 2 Pending -> Win Rate null (New Contractor)]
      // ===========================================================
      {
        code: "APP-1049", uCode: "CON1009", tId: tSuratFlood.id, date: "2026-10-02", bid: 1820000000,
        status: "Under Review", outcome: "Pending",
        proposal: "IoT ultrasonic flood sensor deployment and smart city emergency dashboard.",
        missing: "[]",
        notes: "Sensor OEM authorization certificates verified; commercial opening pending.",
        evalId: mgr6, evalDate: "2026-10-08 15:00:00"
      },
      {
        code: "APP-1050", uCode: "CON1009", tId: tPuneATCS.id, date: "2026-10-08", bid: 2400000000,
        status: "Submitted", outcome: "Pending",
        proposal: "Traffic signal automation and junction camera integration bid.",
        missing: "[]",
        notes: "Application recently submitted; technical evaluation pending.",
        evalId: null, evalDate: null
      },

      // ===========================================================
      // CON1010 (Pooja Hegde - Hegde Water Works & Pipelines) [3 Apps: 0 Won, 0 Not Awarded, 3 Pending -> Win Rate null (Only Pending)]
      // ===========================================================
      {
        code: "APP-1051", uCode: "CON1010", tId: tSuryaWater.id, date: "2026-09-28", bid: 4800000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Bulk water supply pipeline laying and cathodic protection engineering.",
        missing: "[]",
        notes: "Hydraulic pressure testing methodology under review by municipal water engineer.",
        evalId: mgr4, evalDate: "2026-10-06 11:00:00"
      },
      {
        code: "APP-1052", uCode: "CON1010", tId: tCauveryWater.id, date: "2026-10-04", bid: 9100000000,
        status: "Under Review", outcome: "Pending",
        proposal: "Cauvery Stage V bulk transmission pipeline and booster pump station installation.",
        missing: "[]",
        notes: "Technical bid compliance review in progress with BWSSB engineering cell.",
        evalId: mgr4, evalDate: "2026-10-09 16:30:00"
      },
      {
        code: "APP-1053", uCode: "CON1010", tId: tTemgharWater.id, date: "2026-10-09", bid: 2900000000,
        status: "Submitted", outcome: "Pending",
        proposal: "Temghar water treatment expansion and high-pressure DI transmission main.",
        missing: "[]",
        notes: "Application registered; awaiting preliminary qualification meeting.",
        evalId: null, evalDate: null
      }
    ];

    console.log(`Checking and inserting ${allApplications.length} structured contractor application records...`);
    let addedApps = 0;
    let updatedApps = 0;

    for (const app of allApplications) {
      const contractorId = userMap[app.uCode];
      if (!contractorId) {
        console.error(`❌ Contractor ID not found for ${app.uCode}`);
        continue;
      }

      // Resolve any code collision from legacy seeds
      const codeHolder = await runQuery(
        "SELECT id, contractor_id, tender_id FROM applications WHERE application_code = ? LIMIT 1",
        [app.code]
      );
      if (codeHolder.length > 0 && (codeHolder[0].contractor_id !== contractorId || codeHolder[0].tender_id !== app.tId)) {
        await runQuery(
          "UPDATE applications SET application_code = ? WHERE id = ?",
          [app.code + "-temp", codeHolder[0].id]
        );
      }

      // Check for duplicate by (contractor_id, tender_id)
      const existing = await runQuery(
        "SELECT id, application_code FROM applications WHERE contractor_id = ? AND tender_id = ? LIMIT 1",
        [contractorId, app.tId]
      );

      if (existing.length === 0) {
        await runQuery(
          `INSERT INTO applications (
            application_code, contractor_id, tender_id, applied_on, bid_amount,
            application_status, outcome, proposal_notes, missing_documents,
            evaluation_notes, evaluator_id, evaluated_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            app.code, contractorId, app.tId, app.date, app.bid,
            app.status, app.outcome, app.proposal, app.missing,
            app.notes, app.evalId, app.evalDate
          ]
        );
        addedApps++;
      } else {
        // Idempotently update application to ensure clean data state
        await runQuery(
          `UPDATE applications SET
            application_code = ?,
            applied_on = ?,
            bid_amount = ?,
            application_status = ?,
            outcome = ?,
            proposal_notes = ?,
            missing_documents = ?,
            evaluation_notes = ?,
            evaluator_id = ?,
            evaluated_at = ?,
            updated_at = datetime('now')
          WHERE id = ?`,
          [
            app.code, app.date, app.bid, app.status, app.outcome,
            app.proposal, app.missing, app.notes, app.evalId, app.evalDate,
            existing[0].id
          ]
        );
        updatedApps++;
      }
    }

    // Clean up any temporary unmapped legacy rows
    await runQuery("DELETE FROM applications WHERE application_code LIKE '%-temp'");

    console.log(`✅ Applications seeded/updated successfully! (${addedApps} inserted, ${updatedApps} verified/updated)`);

    // -------------------------------------------------------------
    // 4. STATISTICAL VALIDATION & SUMMARY REPORT
    // -------------------------------------------------------------
    console.log("\n==================================================");
    console.log("📊 DATABASE STATISTICAL VALIDATION SUMMARY");
    console.log("==================================================");

    const [tCount] = await runQuery("SELECT COUNT(*) AS c FROM tenders");
    const [uCount] = await runQuery("SELECT COUNT(*) AS c FROM users");
    const [cCount] = await runQuery("SELECT COUNT(*) AS c FROM users WHERE role = 'contractor'");
    const [mCount] = await runQuery("SELECT COUNT(*) AS c FROM users WHERE role = 'manager'");
    const [aCount] = await runQuery("SELECT COUNT(*) AS c FROM applications");

    console.log(`• Total Tenders in DB:      ${tCount.c} (Target: 30–40)`);
    console.log(`• Total Users in DB:        ${uCount.c} (${cCount.c} Contractors + ${mCount.c} Managers)`);
    console.log(`• Total Applications in DB: ${aCount.c}`);

    const outcomes = await runQuery(`
      SELECT outcome, COUNT(*) as c FROM applications GROUP BY outcome ORDER BY c DESC
    `);
    console.log("\nOutcome Breakdown:");
    outcomes.forEach(o => console.log(`  - ${o.outcome || 'Pending'}: ${o.c}`));

    const feedbackCount = await runQuery(`
      SELECT COUNT(*) as c FROM applications WHERE evaluation_notes IS NOT NULL AND evaluation_notes != ''
    `);
    console.log(`\n• Applications with Evaluator Feedback: ${feedbackCount[0].c}`);

    const categoryBreakdown = await runQuery(`
      SELECT category, COUNT(*) as c FROM tenders GROUP BY category ORDER BY c DESC
    `);
    console.log("\nTender Category Breakdown:");
    categoryBreakdown.forEach(cat => console.log(`  - ${cat.category}: ${cat.c} tenders`));

    console.log("\nContractor Application Histories & Win Rates:");
    const contractorList = ["CON1001", "CON1002", "CON1003", "CON1004", "CON1005", "CON1006", "CON1007", "CON1008", "CON1009", "CON1010"];

    for (const code of contractorList) {
      const uId = userMap[code];
      const apps = await runQuery(`
        SELECT application_status, outcome FROM applications WHERE contractor_id = ?
      `, [uId]);

      let won = 0, lost = 0, pending = 0, withdrawn = 0;
      apps.forEach(a => {
        if (a.outcome === "Won") won++;
        else if (a.outcome === "Not Awarded") lost++;
        else if (a.outcome === "Withdrawn") withdrawn++;
        else pending++;
      });

      const decided = won + lost;
      const winRate = decided > 0 ? ((won / decided) * 100).toFixed(1) + "%" : "null (Not enough completed outcomes)";
      console.log(`  • ${code}: ${apps.length} Apps (Won: ${won}, Not Awarded: ${lost}, Pending: ${pending}, Withdrawn: ${withdrawn}) -> Decided Win Rate: ${winRate}`);
    }

    console.log("\n==================================================");
    console.log("🎉 DEMO ENRICHMENT COMPLETE & IDEMPOTENT!");
    console.log("==================================================");

  } catch (err) {
    console.error("❌ Error during seeding:", err);
  } finally {
    process.exit(0);
  }
}

seed();
