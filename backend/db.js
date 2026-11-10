const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Determine database path (use /tmp on Vercel/serverless environments)
let dbPath = path.join(__dirname, "tenderkart.db");

if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDbPath = path.join("/tmp", "tenderkart.db");
  const sourceDbPath = path.join(__dirname, "tenderkart.db");

  try {
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        fs.copyFileSync(sourceDbPath, tmpDbPath);
      }
    }
    dbPath = tmpDbPath;
  } catch (err) {
    console.warn("Could not copy database to /tmp, falling back to in-memory/tmp:", err.message);
    dbPath = tmpDbPath;
  }
}

// Open (or create) the SQLite database file
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening SQLite database:", err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Enable foreign key cascades in SQLite
db.run("PRAGMA foreign_keys = ON");

function computeInitialStatus(deadlineStr) {
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

// Auto-create tables and ensure schema migrations
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'contractor',
      name TEXT,
      company TEXT,
      department TEXT,
      user_code TEXT,
      office_state TEXT,
      approval_status TEXT DEFAULT 'Approved',
      is_active INTEGER DEFAULT 1,
      approved_by INTEGER,
      approved_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Gracefully ensure user columns exist for existing database instances
  db.run("ALTER TABLE users ADD COLUMN name TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN company TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN department TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN user_code TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN office_state TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT 'Approved'", () => {});
  db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1", () => {});
  db.run("ALTER TABLE users ADD COLUMN approved_by INTEGER", () => {});
  db.run("ALTER TABLE users ADD COLUMN approved_at TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN updated_at TEXT", () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS tenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      category TEXT NOT NULL,
      budget REAL NOT NULL,
      location TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL,
      status TEXT DEFAULT 'Open',
      eligibility TEXT NOT NULL,
      required_documents TEXT NOT NULL,
      description TEXT NOT NULL,
      source_url TEXT,
      views_count INTEGER DEFAULT 0,
      created_by INTEGER,
      updated_by INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Gracefully ensure tender columns exist for existing database instances
  db.run("ALTER TABLE tenders ADD COLUMN source_url TEXT", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN state TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN status TEXT DEFAULT 'Open'", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN views_count INTEGER DEFAULT 0", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN created_by INTEGER", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN updated_by INTEGER", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN updated_at TEXT", () => {});

  // Hard database-level trigger enforcing the strict 12-tender demonstration cap
  db.run(`
    CREATE TRIGGER IF NOT EXISTS enforce_max_12_tenders
    BEFORE INSERT ON tenders
    WHEN (SELECT COUNT(*) FROM tenders) >= 12
    BEGIN
      SELECT RAISE(ABORT, 'Tender limit reached: TenderKart demonstration dataset is strictly limited to 12 tenders.');
    END;
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_tenders (
      user_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, tender_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(tender_id) REFERENCES tenders(id) ON DELETE CASCADE
    );
  `);
  db.run("ALTER TABLE saved_tenders ADD COLUMN created_at TEXT", () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
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
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      sender_user_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      organization_name TEXT,
      sender_name TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      contact_number TEXT,
      inquiry_category TEXT NOT NULL,
      related_tender_id INTEGER,
      state TEXT,
      assigned_manager_id INTEGER,
      assignment_status TEXT DEFAULT 'Assigned',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      assigned_to TEXT DEFAULT 'admin',
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      demo_record INTEGER DEFAULT 0,
      FOREIGN KEY(sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(related_tender_id) REFERENCES tenders(id) ON DELETE SET NULL,
      FOREIGN KEY(assigned_manager_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  db.run("ALTER TABLE inquiries ADD COLUMN state TEXT", () => {});
  db.run("ALTER TABLE inquiries ADD COLUMN assigned_manager_id INTEGER", () => {});
  db.run("ALTER TABLE inquiries ADD COLUMN assignment_status TEXT DEFAULT 'Assigned'", () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS inquiry_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id INTEGER NOT NULL,
      sender_user_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      message_body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      read_at TEXT,
      FOREIGN KEY(inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER,
      actor_role TEXT,
      action_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      state TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Ensure single Central Admin account exists
  db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1", (err, row) => {
    if (!err && !row) {
      const adminHash = bcrypt.hashSync("Admin@1001", 10);
      db.run(
        `INSERT INTO users (username, user_code, name, company, department, email, password, role, office_state, approval_status, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 1, datetime('now'))`,
        ["admin", "ADM1001", "TenderKart Central Admin", "TenderKart Administration", "National Procurement Supervision", "admin@demo.tenderkart.in", adminHash, "admin", null]
      );
    }
  });

  // Seed default Contractors and State-wise Managers ONLY if no non-admin users exist
  db.get("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Seeding realistic contractor and state-wise manager accounts...");
      const defaultUsers = [
        // --- 5 CONTRACTOR ACCOUNTS ---
        {
          username: "CON1001",
          user_code: "CON1001",
          name: "Rajesh Mehta",
          company: "Mehta Infrastructure Works",
          department: null,
          office_state: null,
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
          office_state: null,
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
          office_state: null,
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
          office_state: null,
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
          office_state: null,
          email: "vikram.desai@demo.tenderkart.in",
          passwordRaw: "Contractor@1005",
          role: "contractor",
          created_at: "2026-10-07 11:10:00"
        },

        // --- 6 STATE-WISE MANAGER ACCOUNTS ---
        {
          username: "MGR2001",
          user_code: "MGR2001",
          name: "Anil Joshi",
          company: null,
          department: "Maharashtra Procurement Division",
          office_state: "Maharashtra",
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
          department: "Gujarat Procurement Division",
          office_state: "Gujarat",
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
          department: "Madhya Pradesh Procurement Division",
          office_state: "Madhya Pradesh",
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
          department: "Delhi Procurement Division",
          office_state: "Delhi",
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
          department: "Uttar Pradesh Procurement Division",
          office_state: "Uttar Pradesh",
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
          department: "Haryana Procurement Division",
          office_state: "Haryana",
          email: "sneha.iyer@demo.tenderkart.in",
          passwordRaw: "Manager@2006",
          role: "manager",
          created_at: "2026-10-24 17:30:00"
        }
      ];

      defaultUsers.forEach((u) => {
        const hashedPassword = bcrypt.hashSync(u.passwordRaw, 10);
        db.run(
          `INSERT INTO users (username, user_code, name, company, department, office_state, email, password, role, approval_status, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 1, ?)`,
          [u.username, u.user_code, u.name, u.company, u.department, u.office_state, u.email, hashedPassword, u.role, u.created_at]
        );
      });
    }
  });

  // Seed strictly 12 Indian government infrastructure tenders ONLY if tenders table is completely empty
  db.get("SELECT COUNT(*) AS count FROM tenders", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Seeding strictly 12 verified Indian government infrastructure tenders...");
      const sampleTenders = [
        // --- ROADS (3) ---
        {
          name: "NH-44 Four-Laning of Jabalpur to Lakhnadon Section (Km 275 to Km 354)",
          department: "National Highways Authority of India (NHAI)",
          category: "Roads",
          budget: 8920000000,
          location: "Jabalpur-Seoni, Madhya Pradesh",
          state: "Madhya Pradesh",
          deadline: "2026-09-24",
          eligibility: "Class-A National Highway Contractors with experience of executing at least 40km of 4-lane access-controlled highways in last 5 years and minimum net worth of INR 250 Cr.",
          required_documents: JSON.stringify([
            "Class-A NHAI Contractor Registration",
            "Technical Highway Track-Record & Machinery Holding Statement",
            "Last 3 Fiscal Years Audited Turnover Balance Sheets",
            "Earnest Money Deposit (EMD) Bank Guarantee",
            "GST Registration Certificate and Valid PAN Card"
          ]),
          description: "Rehabilitation, widening, and 4-laning of the Jabalpur to Lakhnadon section of National Highway 44 (NH-44) from Km 275.000 to Km 354.000 under the National Highways Development Project (NHDP). Scope covers earthwork, granular sub-base (GSB), dense bituminous macadam (DBM), bituminous concrete (BC) overlay, grade-separated intersections, 4 minor bridges, 22 box culverts, wayside amenities, and toll plaza infrastructure.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          name: "Construction of 6-Lane Access-Controlled Delhi-Amritsar-Katra Expressway (Package 8)",
          department: "National Highways Authority of India (NHAI)",
          category: "Roads",
          budget: 14250000000,
          location: "Ludhiana-Gurdaspur Corridor, Punjab",
          state: "Punjab",
          deadline: "2026-10-12",
          eligibility: "Registered Class-A / Tier-1 Infrastructure Developers with EPC experience in greenfield access-controlled expressway projects of value not less than INR 700 Cr in the last 7 years.",
          required_documents: JSON.stringify([
            "NHAI EPC Developer Qualification Certificate",
            "Plant & Paving Heavy Equipment Proof of Ownership",
            "Bank Solvency Certificate from Nationalized Bank",
            "Quality Assurance Plan (QAP) & Safety Manual",
            "Environment & Forest Clearance Compliance Undertaking"
          ]),
          description: "Construction of six-lane access-controlled greenfield highway section of Delhi-Amritsar-Katra Expressway (Package 8) on EPC mode. The work entails continuous concrete pavement, construction of major vehicular underpasses (VUP), light vehicular underpasses (LVUP), trumpet interchange at state highway junction, stormwater drainage networks, advance traffic management system (ATMS), and high-security boundary fencing.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          name: "Four-Laning of Mumbai-Goa National Highway (NH-66) Kashedi Ghat to Sangameshwar (Package V)",
          department: "Maharashtra State Public Works Department (MoRTH Division)",
          category: "Roads",
          budget: 6850000000,
          location: "Ratnagiri, Maharashtra",
          state: "Maharashtra",
          deadline: "2026-11-18",
          eligibility: "Class-I PWD / MoRTH registered road contractors having executed hilly-terrain road widening and slope-stabilization works of minimum INR 250 Cr.",
          required_documents: JSON.stringify([
            "Class-I Maharashtra PWD Contractor License",
            "Hill Slope Stabilization & Rock Anchoring Machinery Holding Proof",
            "Audited Financial Balance Sheets for FY 2022-25",
            "Joint Venture (JV) Agreement (if applicable)",
            "EMD & Bid Security Verification"
          ]),
          description: "Widening to 4-lanes of NH-66 (old NH-17) between Kashedi Ghat and Sangameshwar under EPC mode. Work includes extensive rock cutting, soil nailing, geotechnical retaining walls, reinforced concrete box culverts, asphalt concrete pavement, modern metal beam crash barriers, solar highway lighting, and anti-landslide protection systems.",
          source_url: "https://mahatenders.gov.in"
        },

        // --- BRIDGES (3) ---
        {
          name: "Construction of 4-Lane Bridge over Brahmaputra River Connecting Dhubri and Phulbari",
          department: "National Highways and Infrastructure Development Corporation (NHIDCL)",
          category: "Bridges",
          budget: 24800000000,
          location: "Dhubri-Phulbari, Assam & Meghalaya",
          state: "Assam",
          deadline: "2026-09-18",
          eligibility: "International / National specialized heavy bridge engineering consortiums with experience in deep well foundation bridges over major perennial alluvial rivers with span length > 120m.",
          required_documents: JSON.stringify([
            "Major River Bridge Specialty License",
            "Hydraulic Rig & Marine Barge Ownership Documents",
            "Solvency Certificate of INR 500 Cr from Scheduled Commercial Bank",
            "ISO 9001 & ISO 14001 Quality Certifications",
            "EPF, ESI and Labor Department Clearance"
          ]),
          description: "Engineering, procurement, and construction of deep river foundation and RCC pier superstructure for the 19km major bridge over river Brahmaputra between Dhubri (Assam) and Phulbari (Meghalaya). Works include 2.5m diameter bored cast-in-situ piles, deep well sinking, anti-scour protection aprons, seismic dampers, navigation lighting, and approach viaducts.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          name: "Design and Construction of 6-Lane Creek Bridge between Thane and Navi Mumbai across Thane Creek",
          department: "Mumbai Metropolitan Region Development Authority (MMRDA)",
          category: "Bridges",
          budget: 12500000000,
          location: "Thane-Navi Mumbai, Maharashtra",
          state: "Maharashtra",
          deadline: "2026-10-14",
          eligibility: "Special Class Bridge Contractors with prior experience in marine creek/coastal bridge construction with pre-stressed concrete girders and cathodic corrosion protection.",
          required_documents: JSON.stringify([
            "MMRDA Special Class Civil Registration",
            "Marine Construction Piling Barge Equipment Proof",
            "CRZ (Coastal Regulation Zone) Environmental Compliance Undertaking",
            "3 Years Audited Turnover Statements",
            "EMD Bank Guarantee Receipt"
          ]),
          description: "Turnkey EPC contract for design, construction, and commissioning of a 6-lane elevated bridge spanning Thane Creek. The project consists of 3.2km main creek viaduct with precast segmental box girders, marine foundation piling with epoxy-coated rebars, toll integration gantry, navigational channel clearance spans, and high-mast coastal LED illumination.",
          source_url: "https://mahatenders.gov.in"
        },
        {
          name: "Six-Lane Elevated Corridor and Rail Over Bridge (ROB) over Ahmedabad-Vadodara Railway Line",
          department: "Ahmedabad Urban Development Authority (AUDA)",
          category: "Bridges",
          budget: 3100000000,
          location: "Ahmedabad, Gujarat",
          state: "Gujarat",
          deadline: "2026-11-10",
          eligibility: "Class-I Civil Engineering firms with RDSO railway approval and experience in erecting heavy steel girders during designated railway mega-blocks.",
          required_documents: JSON.stringify([
            "AUDA Class-I Registration",
            "RDSO Railway Approval for Steel Girder Fabrication",
            "CA Audited Financials for FY 2022-25",
            "Workmen Compensation & Safety Undertaking",
            "EMD Bank Guarantee"
          ]),
          description: "Construction of a 2.4km six-lane elevated road-cum-ROB crossing the Western Railway mainline. Includes composite steel girders with 64-meter clear railway span, reinforced earth (RE) approach ramps, friction-course asphalt surfacing, and integrated drainage down-takes.",
          source_url: "https://tender.nprocure.com"
        },

        // --- WATER SUPPLY (2) ---
        {
          name: "Jal Jeevan Mission - 120 MLD Bulk Water Pipeline Network and Pump Houses for 480 Habitations",
          department: "State Water and Sanitation Mission (SWSM), UP",
          category: "Water Supply",
          budget: 4600000000,
          location: "Prayagraj & Kaushambi, Uttar Pradesh",
          state: "Uttar Pradesh",
          deadline: "2026-10-11",
          eligibility: "Class-A Water Supply & Public Health Engineering (PHE) Contractors with experience in laying at least 150km of DI/MS potable water supply pipeline and multi-stage pump stations.",
          required_documents: JSON.stringify([
            "SWSM / UP Jal Nigam Class-A Registration",
            "Ductile Iron (DI) K9 Pipe Manufacturer Tie-up Agreement",
            "Valid Electrical Contractor License for High Tension Pump Substation",
            "3 Years Balance Sheet by Chartered Accountant",
            "Bid Security Declaration"
          ]),
          description: "Comprehensive EPC execution of multi-village rural piped water supply scheme under Jal Jeevan Mission. Scope comprises intake well on Ganga river, 120 MLD raw water transmission main, 28 overhead RCC water reservoirs (ESRs), 420km Ductile Iron (DI) and HDPE pipeline distribution network, automated SCADA flow meters, chlorination plant, and 10 years operations & maintenance.",
          source_url: "https://etender.up.nic.in"
        },
        {
          name: "Turnkey 100 MLD Automated Water Treatment Plant (WTP) at Chandrawal Water Works",
          department: "Delhi Jal Board (DJB)",
          category: "Water Supply",
          budget: 5800000000,
          location: "Chandrawal, Central Delhi",
          state: "Delhi",
          deadline: "2026-11-12",
          eligibility: "Turnkey Environmental / Water Treatment Engineering firms with successful completion of at least one 70+ MLD rapid gravity sand filtration and ozonation WTP within the last 7 years.",
          required_documents: JSON.stringify([
            "Delhi Jal Board Class-A Civil/PHE Enlistment",
            "Ozonation & Dual Media Filtration Technology Partner Agreement",
            "Bank Solvency Certificate of INR 100 Cr",
            "Central Pollution Control Board (CPCB) Compliance Undertaking",
            "GST & Audited P&L Statements"
          ]),
          description: "Design, construction, supply, installation, testing, and commissioning of a 100 MLD capacity high-efficiency Water Treatment Plant at Chandrawal. Technology scope covers raw water intake, coagulation-flocculation clarifiers, dual-media rapid gravity sand filters, ozonation unit, activated carbon filters, ultraviolet disinfection, automated SCADA master control room, and sludge dewatering centrifuges.",
          source_url: "https://govtprocurement.delhi.gov.in"
        },

        // --- BUILDINGS (2) ---
        {
          name: "Construction of 750-Bed Super Speciality Hospital Block & Academic Campus for AIIMS",
          department: "HSCC (India) Limited / Ministry of Health",
          category: "Buildings",
          budget: 8200000000,
          location: "Rewari, Haryana",
          state: "Haryana",
          deadline: "2026-10-13",
          eligibility: "Class-A Hospital Infrastructure Builders who have completed at least one 500+ bed medical college hospital campus including modular operation theatres and medical gas pipeline networks.",
          required_documents: JSON.stringify([
            "Class-A Hospital Infrastructure Construction License",
            "Medical Gas Pipeline System (MGPS) & Modular OT Specialist Sub-Contractor MOUs",
            "AERB (Atomic Energy Regulatory Board) Radiation Shielding Design Clearance",
            "3 Fiscal Years Average Turnover > INR 350 Cr",
            "GST & PAN Details"
          ]),
          description: "Comprehensive EPC construction of a 750-bed Super Speciality Hospital, 100-bed Emergency Trauma Centre, Medical College Building, Nursing Hostel, and Faculty Residential Towers for AIIMS Rewari campus. Scope covers civil structural framework, 18 modular surgical suites, pneumatic chute transport system, central CSSD, medical oxygen cryogenic storage, and sub-station electrification.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          name: "Construction of 12-Storey International Diamond & Trade Facilitation Center at GIFT City",
          department: "Gujarat International Finance Tec-City (GIFT City)",
          category: "Buildings",
          budget: 7500000000,
          location: "Ahmedabad, Gujarat",
          state: "Gujarat",
          deadline: "2026-11-28",
          eligibility: "Tier-1 Commercial Real Estate Developers with IGBC Platinum green building experience and composite steel-concrete construction history of towers >= 50m height.",
          required_documents: JSON.stringify([
            "GIFT City Accredited Builder License",
            "IGBC / LEED Platinum Certified Team Roster",
            "IBMS (Integrated Building Management System) Capability Statement",
            "Bank Solvency Certificate of INR 200 Cr",
            "EPF, ESI and Labor Clearances"
          ]),
          description: "Turnkey EPC construction of a twin-tower G+12 International Diamond and Trade Complex with 3 basement parking levels. Involves high-performance low-E structural glazing, automated pneumatic waste collection integration, district cooling piping hook-up, smart biometric access control, and 1.2 MW rooftop solar canopy.",
          source_url: "https://tender.nprocure.com"
        },

        // --- METRO PROJECTS (1) ---
        {
          name: "DMRC Phase-IV Aerocity to Tughlakabad Underground Corridor & 4 Stations (Package DC-08)",
          department: "Delhi Metro Rail Corporation (DMRC)",
          category: "Metro Projects",
          budget: 16500000000,
          location: "South Delhi Corridor, New Delhi",
          state: "Delhi",
          deadline: "2026-10-15",
          eligibility: "Specialized Urban Mass Rapid Transit System (MRTS) contractors or Joint Ventures with experience in Tunnel Boring Machine (TBM) tunneling and underground metro station construction in high-density urban zones.",
          required_documents: JSON.stringify([
            "DMRC MRTS Civil Enlistment Certificate",
            "Tunnel Boring Machine (EPB-TBM) Ownership / Lease Documentation",
            "Safety & Environmental Plan for Deep Underground Excavations",
            "Bank Solvency Letter of INR 300 Cr",
            "JV Consortium Agreement"
          ]),
          description: "Design and construction of 6.2km twin underground metro tunnels using Earth Pressure Balance (EPB) Tunnel Boring Machines (TBM) along with cut-and-cover underground stations at Mahipalpur, Vasant Kunj, Chhatarpur Mandir, and IGNOU for Delhi Metro Phase-IV Silver Line. Scope includes diaphragm walls, bottom-up station box RCC work, cross passages, tunnel track plinth, ventilation shafts, and MEP rough-ins.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },

        // --- SMART CITY (1) ---
        {
          name: "Bhopal Smart City Integrated Command and Control Center (ICCC) Expansion & City-Wide AI Analytics",
          department: "Bhopal Smart City Development Corporation (BSCDL)",
          category: "Smart City",
          budget: 3850000000,
          location: "Bhopal, Madhya Pradesh",
          state: "Madhya Pradesh",
          deadline: "2026-11-20",
          eligibility: "System Integrators & Smart City IT Solution Providers with CMMI Level 5 certification and experience in deploying city-wide ICCC platforms, GIS mapping, and automated traffic surveillance for a Tier-1/Tier-2 municipal corporation.",
          required_documents: JSON.stringify([
            "CMMI Level 5 Certification & ISO 27001 Security Credentials",
            "OEM Authorization Letters (Servers, AI Software, High-Definition PTZ Cameras)",
            "3 Years Audited Balance Sheets with Net Positive Worth",
            "Cybersecurity & Data Privacy Undertaking",
            "Earnest Money Deposit (EMD) Receipt"
          ]),
          description: "Turnkey implementation and 5-year operations of the expanded Integrated Command and Control Centre (ICCC) for Bhopal Smart City. The scope encompasses 1,200 AI-powered smart surveillance and Automatic Number Plate Recognition (ANPR) cameras, adaptive traffic control systems (ATCS), environmental pollution monitoring sensor arrays, municipal solid waste GPS tracking integration, centralized video wall, citizen emergency call boxes (ECB), and cloud disaster recovery datacenter.",
          source_url: "https://mptenders.gov.in"
        }
      ];

      sampleTenders.forEach((t) => {
        const status = computeInitialStatus(t.deadline);
        db.run(
          `INSERT INTO tenders (name, department, category, budget, location, state, deadline, status, eligibility, required_documents, description, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.name, t.department, t.category, t.budget, t.location, t.state, t.deadline, status, t.eligibility, t.required_documents, t.description, t.source_url]
        );
      });
    }
  });
});

// MySQL-compatible query shim wrapping standard sqlite3 callbacks + Promise helpers
const connection = {
  query(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    const trimmed = (sql || "").trim().toUpperCase();

    if (trimmed.startsWith("INSERT")) {
      db.run(sql, params, function (err) {
        if (err) return cb ? cb(err) : null;
        if (cb) cb(null, { insertId: this.lastID });
      });
    } else if (trimmed.startsWith("UPDATE") || trimmed.startsWith("DELETE")) {
      db.run(sql, params, function (err) {
        if (err) return cb ? cb(err) : null;
        if (cb) cb(null, { affectedRows: this.changes });
      });
    } else {
      db.all(sql, params, (err, rows) => {
        if (err) return cb ? cb(err) : null;
        if (cb) cb(null, rows);
      });
    }
  },
  queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  },
  getAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },
  logActivity({ actor_user_id = null, actor_role = null, action_type, entity_type = null, entity_id = null, state = null, details = null }) {
    db.run(
      `INSERT INTO activity_logs (actor_user_id, actor_role, action_type, entity_type, entity_id, state, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [actor_user_id, actor_role, action_type, entity_type, entity_id, state, details],
      (err) => {
        if (err) console.warn("Activity log insert warning:", err.message);
      }
    );
  },
  rawDb: db
};

module.exports = connection;
