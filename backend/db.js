const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { computeStatusFromDeadline } = require("./constants");

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
    console.warn("Could not copy database to /tmp, falling back to tmp:", err.message);
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

// Auto-ensure schema and safe column upgrades for the Two-Role architecture
db.serialize(() => {
  // Remove obsolete 12-tender cap trigger & obsolete inquiry/notification tables if present
  db.run("DROP TRIGGER IF EXISTS enforce_max_12_tenders");
  db.run("DROP TABLE IF EXISTS inquiry_messages");
  db.run("DROP TABLE IF EXISTS inquiries");
  db.run("DROP TABLE IF EXISTS notifications");

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'contractor' CHECK (LOWER(role) IN ('admin', 'contractor')),
      name TEXT,
      company TEXT,
      department TEXT,
      user_code TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run("ALTER TABLE users ADD COLUMN name TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN company TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN department TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN user_code TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1", () => {});
  db.run("ALTER TABLE users ADD COLUMN updated_at TEXT", () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS tenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tender_code TEXT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      category TEXT NOT NULL,
      budget REAL NOT NULL,
      location TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '',
      published_date TEXT,
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

  db.run("ALTER TABLE tenders ADD COLUMN tender_code TEXT", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN published_date TEXT", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN source_url TEXT", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN state TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN status TEXT DEFAULT 'Open'", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN views_count INTEGER DEFAULT 0", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN created_by INTEGER", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN updated_by INTEGER", () => {});
  db.run("ALTER TABLE tenders ADD COLUMN updated_at TEXT", () => {});
  db.run(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_tenders_tender_code ON tenders(tender_code) WHERE tender_code IS NOT NULL",
    () => {}
  );

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
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_code TEXT UNIQUE,
      contractor_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      applied_on TEXT NOT NULL,
      bid_amount REAL,
      portal_name TEXT,
      reference_number TEXT,
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
  db.run("ALTER TABLE applications ADD COLUMN portal_name TEXT", () => {});
  db.run("ALTER TABLE applications ADD COLUMN reference_number TEXT", () => {});

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

  // Ensure single Central Admin exists if DB was initialized blank (precomputed bcrypt hash only)
  db.get("SELECT id FROM users WHERE LOWER(role) = 'admin' LIMIT 1", (err, row) => {
    if (!err && !row) {
      const adminHash = "$2a$10$ev7.hSyreSEtBfgSLLORZOkJzrOOVcjCJXVcc8GEgtua6Y6dyCD/i";
      db.run(
        `INSERT INTO users (username, user_code, name, company, department, email, password, role, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 1, datetime('now'))`,
        [
          "admin",
          "ADM1001",
          "TenderKart Central Admin",
          "TenderKart Administration",
          "National Procurement Supervision",
          "admin@demo.tenderkart.in",
          adminHash
        ]
      );
    }
  });

  // Seed 5 Contractors ONLY if no contractors exist (precomputed bcrypt hashes only; never creates manager accounts)
  db.get("SELECT COUNT(*) AS count FROM users WHERE LOWER(role) = 'contractor'", (err, row) => {
    if (!err && row && row.count === 0) {
      const defaultContractors = [
        {
          username: "CON1001",
          user_code: "CON1001",
          name: "Rajesh Mehta",
          company: "Mehta Infrastructure Works",
          email: "rajesh.mehta@demo.tenderkart.in",
          passwordHash: "$2a$10$n8X64K50mZ5ltpZB96IQveqMRdgqIp3Uue/LdJB5yLDi5X4g3MitO",
          created_at: "2026-08-05 10:30:00"
        },
        {
          username: "CON1002",
          user_code: "CON1002",
          name: "Amit Kulkarni",
          company: "Kulkarni Civil Projects",
          email: "amit.kulkarni@demo.tenderkart.in",
          passwordHash: "$2a$10$4Mqv0O6ktgfkl7ANL9S3b.69ztR7outjSXOyQYbriGBm4Jw/ePwmq",
          created_at: "2026-08-18 14:15:00"
        },
        {
          username: "CON1003",
          user_code: "CON1003",
          name: "Suresh Patil",
          company: "Patil Road & Bridge Contractors",
          email: "suresh.patil@demo.tenderkart.in",
          passwordHash: "$2a$10$Zn7D0SwmoR8l3AcVxBWzpOmzW61VSHpyJOTMhNjzVBxIYI2RkaF26",
          created_at: "2026-09-03 09:45:00"
        },
        {
          username: "CON1006",
          user_code: "CON1006",
          name: "Arvind Patel",
          company: "Patel Earthmovers & Infra",
          email: "arvind.patel@demo.tenderkart.in",
          passwordHash: "$2a$10$LHkztCBj4SZavZ4rcGK2KOp7V/yo8y7G4ojcwnwsGxMOvsAP4gEqG",
          created_at: "2026-09-21 16:20:00"
        },
        {
          username: "CON1008",
          user_code: "CON1008",
          name: "Ananya Sen",
          company: "Sen Urban Engineering",
          email: "ananya.sen@demo.tenderkart.in",
          passwordHash: "$2a$10$mdu.93ly60GhGZQWMljU9uGLAZFH5tzH16.SWP2f9kdjPbZ0hrTDq",
          created_at: "2026-10-07 11:10:00"
        }
      ];

      defaultContractors.forEach((u) => {
        db.run(
          `INSERT INTO users (username, user_code, name, company, department, email, password, role, is_active, created_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?, 'contractor', 1, ?)`,
          [u.username, u.user_code, u.name, u.company, u.email, u.passwordHash, u.created_at]
        );
      });
    }
  });

  // Seed baseline 12 tenders ONLY if tenders table is completely empty
  db.get("SELECT COUNT(*) AS count FROM tenders", (err, row) => {
    if (!err && row && row.count === 0) {
      const sampleTenders = [
        {
          tender_code: "TK-0052",
          name: "NH-44 Four-Laning of Jabalpur to Lakhnadon Section (Km 275 to Km 354)",
          department: "National Highways Authority of India (NHAI)",
          category: "Roads",
          budget: 8920000000,
          location: "Jabalpur-Seoni, Madhya Pradesh",
          state: "Madhya Pradesh",
          published_date: "2026-08-05",
          deadline: "2026-09-24",
          eligibility: "Class-A National Highway Contractors with experience of executing at least 40km of 4-lane access-controlled highways in last 5 years and minimum net worth of INR 250 Cr.",
          required_documents: JSON.stringify([
            "Class-A NHAI Contractor Registration",
            "Technical Highway Track-Record & Machinery Holding Statement",
            "Last 3 Fiscal Years Audited Turnover Balance Sheets",
            "Earnest Money Deposit (EMD) Bank Guarantee",
            "GST Registration Certificate and Valid PAN Card"
          ]),
          description: "Rehabilitation, widening, and 4-laning of the Jabalpur to Lakhnadon section of National Highway 44 (NH-44) from Km 275.000 to Km 354.000 under the National Highways Development Project (NHDP).",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          tender_code: "TK-0046",
          name: "Construction of 6-Lane Access-Controlled Delhi-Amritsar-Katra Expressway (Package 8)",
          department: "National Highways Authority of India (NHAI)",
          category: "Roads",
          budget: 14250000000,
          location: "Ludhiana-Gurdaspur Corridor, Punjab",
          state: "Punjab",
          published_date: "2026-08-28",
          deadline: "2026-10-12",
          eligibility: "Registered Class-A / Tier-1 Infrastructure Developers with EPC experience in greenfield access-controlled expressway projects of value not less than INR 700 Cr in the last 7 years.",
          required_documents: JSON.stringify([
            "NHAI EPC Developer Qualification Certificate",
            "Plant & Paving Heavy Equipment Proof of Ownership",
            "Bank Solvency Certificate from Nationalized Bank",
            "Quality Assurance Plan (QAP) & Safety Manual",
            "Environment & Forest Clearance Compliance Undertaking"
          ]),
          description: "Construction of six-lane access-controlled greenfield highway section of Delhi-Amritsar-Katra Expressway (Package 8) on EPC mode.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          tender_code: "TK-0043",
          name: "Four-Laning of Mumbai-Goa National Highway (NH-66) Kashedi Ghat to Sangameshwar (Package V)",
          department: "Maharashtra State Public Works Department (MoRTH Division)",
          category: "Roads",
          budget: 6850000000,
          location: "Ratnagiri, Maharashtra",
          state: "Maharashtra",
          published_date: "2026-09-20",
          deadline: "2026-11-18",
          eligibility: "Class-I PWD / MoRTH registered road contractors having executed hilly-terrain road widening and slope-stabilization works of minimum INR 250 Cr.",
          required_documents: JSON.stringify([
            "Class-I Maharashtra PWD Contractor License",
            "Hill Slope Stabilization & Rock Anchoring Machinery Holding Proof",
            "Audited Financial Balance Sheets for FY 2022-25",
            "Joint Venture (JV) Agreement (if applicable)",
            "EMD & Bid Security Verification"
          ]),
          description: "Widening to 4-lanes of NH-66 (old NH-17) between Kashedi Ghat and Sangameshwar under EPC mode.",
          source_url: "https://mahatenders.gov.in"
        },
        {
          tender_code: "TK-0041",
          name: "Construction of 4-Lane Bridge over Brahmaputra River Connecting Dhubri and Phulbari",
          department: "National Highways and Infrastructure Development Corporation (NHIDCL)",
          category: "Bridges",
          budget: 24800000000,
          location: "Dhubri-Phulbari, Assam & Meghalaya",
          state: "Assam",
          published_date: "2026-08-04",
          deadline: "2026-09-18",
          eligibility: "International / National specialized heavy bridge engineering consortiums with experience in deep well foundation bridges over major perennial alluvial rivers with span length > 120m.",
          required_documents: JSON.stringify([
            "Major River Bridge Specialty License",
            "Hydraulic Rig & Marine Barge Ownership Documents",
            "Solvency Certificate of INR 500 Cr from Scheduled Commercial Bank",
            "ISO 9001 & ISO 14001 Quality Certifications",
            "EPF, ESI and Labor Department Clearance"
          ]),
          description: "Engineering, procurement, and construction of deep river foundation and RCC pier superstructure for the 19km major bridge over river Brahmaputra between Dhubri and Phulbari.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          tender_code: "TK-0042",
          name: "Design and Construction of 6-Lane Creek Bridge between Thane and Navi Mumbai across Thane Creek",
          department: "Mumbai Metropolitan Region Development Authority (MMRDA)",
          category: "Bridges",
          budget: 12500000000,
          location: "Thane-Navi Mumbai, Maharashtra",
          state: "Maharashtra",
          published_date: "2026-08-20",
          deadline: "2026-10-14",
          eligibility: "Special Class Bridge Contractors with prior experience in marine creek/coastal bridge construction with pre-stressed concrete girders and cathodic corrosion protection.",
          required_documents: JSON.stringify([
            "MMRDA Special Class Civil Registration",
            "Marine Construction Piling Barge Equipment Proof",
            "CRZ (Coastal Regulation Zone) Environmental Compliance Undertaking",
            "3 Years Audited Turnover Statements",
            "EMD Bank Guarantee Receipt"
          ]),
          description: "Turnkey EPC contract for design, construction, and commissioning of a 6-lane elevated bridge spanning Thane Creek.",
          source_url: "https://mahatenders.gov.in"
        },
        {
          tender_code: "TK-0061",
          name: "Six-Lane Elevated Corridor and Rail Over Bridge (ROB) over Ahmedabad-Vadodara Railway Line",
          department: "Ahmedabad Urban Development Authority (AUDA)",
          category: "Bridges",
          budget: 3100000000,
          location: "Ahmedabad, Gujarat",
          state: "Gujarat",
          published_date: "2026-09-25",
          deadline: "2026-11-10",
          eligibility: "Class-I Civil Engineering firms with RDSO railway approval and experience in erecting heavy steel girders during designated railway mega-blocks.",
          required_documents: JSON.stringify([
            "AUDA Class-I Registration",
            "RDSO Railway Approval for Steel Girder Fabrication",
            "CA Audited Financials for FY 2022-25",
            "Workmen Compensation & Safety Undertaking",
            "EMD Bank Guarantee"
          ]),
          description: "Construction of a 2.4km six-lane elevated road-cum-ROB crossing the Western Railway mainline.",
          source_url: "https://tender.nprocure.com"
        },
        {
          tender_code: "TK-0044",
          name: "Jal Jeevan Mission - 120 MLD Bulk Water Pipeline Network and Pump Houses for 480 Habitations",
          department: "State Water and Sanitation Mission (SWSM), UP",
          category: "Water Supply",
          budget: 4600000000,
          location: "Prayagraj & Kaushambi, Uttar Pradesh",
          state: "Uttar Pradesh",
          published_date: "2026-08-23",
          deadline: "2026-10-11",
          eligibility: "Class-A Water Supply & Public Health Engineering (PHE) Contractors with experience in laying at least 150km of DI/MS potable water supply pipeline and multi-stage pump stations.",
          required_documents: JSON.stringify([
            "SWSM / UP Jal Nigam Class-A Registration",
            "Ductile Iron (DI) K9 Pipe Manufacturer Tie-up Agreement",
            "Valid Electrical Contractor License for High Tension Pump Substation",
            "3 Years Balance Sheet by Chartered Accountant",
            "Bid Security Declaration"
          ]),
          description: "Comprehensive EPC execution of multi-village rural piped water supply scheme under Jal Jeevan Mission.",
          source_url: "https://etender.up.nic.in"
        },
        {
          tender_code: "TK-0045",
          name: "Turnkey 100 MLD Automated Water Treatment Plant (WTP) at Chandrawal Water Works",
          department: "Delhi Jal Board (DJB)",
          category: "Water Supply",
          budget: 5800000000,
          location: "Chandrawal, Central Delhi",
          state: "Delhi",
          published_date: "2026-08-28",
          deadline: "2026-11-12",
          eligibility: "Turnkey Environmental / Water Treatment Engineering firms with successful completion of at least one 70+ MLD rapid gravity sand filtration and ozonation WTP within the last 7 years.",
          required_documents: JSON.stringify([
            "Delhi Jal Board Class-A Civil/PHE Enlistment",
            "Ozonation & Dual Media Filtration Technology Partner Agreement",
            "Bank Solvency Certificate of INR 100 Cr",
            "Central Pollution Control Board (CPCB) Compliance Undertaking",
            "GST & Audited P&L Statements"
          ]),
          description: "Design, construction, supply, installation, testing, and commissioning of a 100 MLD capacity high-efficiency Water Treatment Plant at Chandrawal.",
          source_url: "https://govtprocurement.delhi.gov.in"
        },
        {
          tender_code: "TK-0047",
          name: "Construction of 750-Bed Super Speciality Hospital Block & Academic Campus for AIIMS",
          department: "HSCC (India) Limited / Ministry of Health",
          category: "Buildings",
          budget: 8200000000,
          location: "Rewari, Haryana",
          state: "Haryana",
          published_date: "2026-08-28",
          deadline: "2026-10-13",
          eligibility: "Class-A Hospital Infrastructure Builders who have completed at least one 500+ bed medical college hospital campus including modular operation theatres and medical gas pipeline networks.",
          required_documents: JSON.stringify([
            "Class-A Hospital Infrastructure Construction License",
            "Medical Gas Pipeline System (MGPS) & Modular OT Specialist Sub-Contractor MOUs",
            "AERB (Atomic Energy Regulatory Board) Radiation Shielding Design Clearance",
            "3 Fiscal Years Average Turnover > INR 350 Cr",
            "GST & PAN Details"
          ]),
          description: "Comprehensive EPC construction of a 750-bed Super Speciality Hospital, 100-bed Emergency Trauma Centre, Medical College Building, Nursing Hostel, and Faculty Residential Towers.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          tender_code: "TK-0068",
          name: "Construction of 12-Storey International Diamond & Trade Facilitation Center at GIFT City",
          department: "Gujarat International Finance Tec-City (GIFT City)",
          category: "Buildings",
          budget: 7500000000,
          location: "Ahmedabad, Gujarat",
          state: "Gujarat",
          published_date: "2026-10-02",
          deadline: "2026-11-28",
          eligibility: "Tier-1 Commercial Real Estate Developers with IGBC Platinum green building experience and composite steel-concrete construction history of towers >= 50m height.",
          required_documents: JSON.stringify([
            "GIFT City Accredited Builder License",
            "IGBC / LEED Platinum Certified Team Roster",
            "IBMS (Integrated Building Management System) Capability Statement",
            "Bank Solvency Certificate of INR 200 Cr",
            "EPF, ESI and Labor Clearances"
          ]),
          description: "Turnkey EPC construction of a twin-tower G+12 International Diamond and Trade Complex with 3 basement parking levels.",
          source_url: "https://tender.nprocure.com"
        },
        {
          tender_code: "TK-0048",
          name: "DMRC Phase-IV Aerocity to Tughlakabad Underground Corridor & 4 Stations (Package DC-08)",
          department: "Delhi Metro Rail Corporation (DMRC)",
          category: "Metro Projects",
          budget: 16500000000,
          location: "South Delhi Corridor, New Delhi",
          state: "Delhi",
          published_date: "2026-08-31",
          deadline: "2026-10-15",
          eligibility: "Specialized Urban Mass Rapid Transit System (MRTS) contractors or Joint Ventures with experience in Tunnel Boring Machine (TBM) tunneling and underground metro station construction.",
          required_documents: JSON.stringify([
            "DMRC MRTS Civil Enlistment Certificate",
            "Tunnel Boring Machine (EPB-TBM) Ownership / Lease Documentation",
            "Safety & Environmental Plan for Deep Underground Excavations",
            "Bank Solvency Letter of INR 300 Cr",
            "JV Consortium Agreement"
          ]),
          description: "Design and construction of 6.2km twin underground metro tunnels using Earth Pressure Balance (EPB) Tunnel Boring Machines (TBM) along with 4 underground stations.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          tender_code: "TK-0049",
          name: "Bhopal Smart City Integrated Command and Control Center (ICCC) Expansion & City-Wide AI Analytics",
          department: "Bhopal Smart City Development Corporation (BSCDL)",
          category: "Smart City",
          budget: 3850000000,
          location: "Bhopal, Madhya Pradesh",
          state: "Madhya Pradesh",
          published_date: "2026-09-07",
          deadline: "2026-11-20",
          eligibility: "System Integrators & Smart City IT Solution Providers with CMMI Level 5 certification and experience in deploying city-wide ICCC platforms and GIS mapping.",
          required_documents: JSON.stringify([
            "CMMI Level 5 Certification & ISO 27001 Security Credentials",
            "OEM Authorization Letters",
            "3 Years Audited Balance Sheets with Net Positive Worth",
            "Cybersecurity & Data Privacy Undertaking",
            "Earnest Money Deposit (EMD) Receipt"
          ]),
          description: "Turnkey implementation and 5-year operations of the expanded Integrated Command and Control Centre (ICCC) for Bhopal Smart City.",
          source_url: "https://mptenders.gov.in"
        }
      ];

      sampleTenders.forEach((t) => {
        const status = computeStatusFromDeadline(t.deadline);
        db.run(
          `INSERT INTO tenders (tender_code, name, department, category, budget, location, state, published_date, deadline, status, eligibility, required_documents, description, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.tender_code, t.name, t.department, t.category, t.budget, t.location, t.state, t.published_date, t.deadline, status, t.eligibility, t.required_documents, t.description, t.source_url]
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
        if (err) console.warn("Activity log warning:", err.message);
      }
    );
  },
  rawDb: db
};

module.exports = connection;
