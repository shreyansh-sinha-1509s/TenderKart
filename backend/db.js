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

// Auto-create tables and initial seed data if not present
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
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Gracefully ensure extra user columns exist for existing database instances
  db.run("ALTER TABLE users ADD COLUMN name TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN company TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN department TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN user_code TEXT", () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS tenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      category TEXT NOT NULL,
      budget REAL NOT NULL,
      location TEXT NOT NULL,
      deadline TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      required_documents TEXT NOT NULL,
      description TEXT NOT NULL,
      source_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Gracefully ensure source_url column exists for existing database instances
  db.run("ALTER TABLE tenders ADD COLUMN source_url TEXT", () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_tenders (
      user_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, tender_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(tender_id) REFERENCES tenders(id) ON DELETE CASCADE
    );
  `);

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
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      assigned_to TEXT DEFAULT 'admin',
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'New',
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      demo_record INTEGER DEFAULT 0,
      FOREIGN KEY(sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(related_tender_id) REFERENCES tenders(id) ON DELETE SET NULL
    );
  `);

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

  // Ensure default central admin account exists
  db.get("SELECT id FROM users WHERE role = 'admin' OR username = 'admin'", (err, row) => {
    if (!err && !row) {
      const adminHash = bcrypt.hashSync("Admin@1001", 10);
      db.run(
        `INSERT INTO users (username, user_code, name, company, department, email, password, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        ["admin", "ADM1001", "TenderKart Central Admin", "TenderKart Administration", "System Administration & Helpdesk", "admin@demo.tenderkart.in", adminHash, "admin"]
      );
    }
  });

  // Seed default 5 Contractors and 6 Managers if users table is empty
  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Seeding realistic contractor and manager accounts...");
      const defaultUsers = [
        // --- 5 CONTRACTOR ACCOUNTS ---
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

        // --- 6 MANAGER ACCOUNTS ---
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

      defaultUsers.forEach(u => {
        const hashedPassword = bcrypt.hashSync(u.passwordRaw, 10);
        db.run(
          `INSERT INTO users (username, user_code, name, company, department, email, password, role, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.username, u.user_code, u.name, u.company, u.department, u.email, hashedPassword, u.role, u.created_at]
        );
      });
    }
  });

  // Seed 12 real Indian government infrastructure tenders if tenders table is empty
  db.get("SELECT COUNT(*) AS count FROM tenders", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Seeding 12 verified Indian government infrastructure tenders...");
      const sampleTenders = [
        // --- ROADS (3 Tenders: 1 Closed, 1 Closing Soon, 1 Open) ---
        {
          name: "NH-44 Four-Laning of Jabalpur to Lakhnadon Section (Km 275 to Km 354)",
          department: "National Highways Authority of India (NHAI)",
          category: "Roads",
          budget: 8920000000,
          location: "Jabalpur-Seoni, Madhya Pradesh",
          deadline: "2026-09-24", // CLOSED
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
          deadline: "2026-10-12", // CLOSING SOON (4 days)
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
          deadline: "2026-11-18", // OPEN (41 days)
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

        // --- BRIDGES (3 Tenders: 1 Closed, 1 Closing Soon, 1 Open) ---
        {
          name: "Construction of 4-Lane Bridge over Brahmaputra River Connecting Dhubri and Phulbari",
          department: "National Highways and Infrastructure Development Corporation (NHIDCL)",
          category: "Bridges",
          budget: 24800000000,
          location: "Dhubri-Phulbari, Assam & Meghalaya",
          deadline: "2026-09-18", // CLOSED
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
          deadline: "2026-10-14", // CLOSING SOON (6 days)
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
          name: "Construction of 6-Lane Elevated Flyover and Rail Over Bridge (ROB) at Ultadanga Junction",
          department: "Kolkata Metropolitan Development Authority (KMDA) & Eastern Railway",
          category: "Bridges",
          budget: 3200000000,
          location: "Kolkata, West Bengal",
          deadline: "2026-11-25", // OPEN (48 days)
          eligibility: "Registered Class-I Civil Engineering firms with proven track record of constructing at least two composite steel girder ROBs over active Indian Railways tracks without traffic disruptions.",
          required_documents: JSON.stringify([
            "KMDA Class-I Enlistment Certificate",
            "Railway Safety & RDSO Certified Fabrication Yard Approval",
            "3-Year Average Financial Turnover Certificate",
            "Structural Engineering Quality Assurance Manual",
            "GST Clearance & PAN"
          ]),
          description: "Construction of a 6-lane elevated flyover and Rail Over Bridge (ROB) over the Sealdah Division railway tracks at Ultadanga Junction. Project scope covers composite steel girder launching during railway power blocks, RCC pier construction, reinforced earth (RE) wall approach ramps, noise barrier installation, and stormwater drainage outfalls.",
          source_url: "https://wbtenders.gov.in"
        },

        // --- WATER SUPPLY (2 Tenders: 1 Closing Soon, 1 Open) ---
        {
          name: "Jal Jeevan Mission - 120 MLD Bulk Water Pipeline Network and Pump Houses for 480 Habitations",
          department: "State Water and Sanitation Mission (SWSM), UP",
          category: "Water Supply",
          budget: 4600000000,
          location: "Prayagraj & Kaushambi, Uttar Pradesh",
          deadline: "2026-10-11", // CLOSING SOON (3 days)
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
          deadline: "2026-11-12", // OPEN (35 days)
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

        // --- BUILDINGS (2 Tenders: 2 Closing Soon) ---
        {
          name: "Construction of Integrated Common Central Secretariat Office Complex (Transit Blocks 4 & 5)",
          department: "Central Public Works Department (CPWD)",
          category: "Buildings",
          budget: 9800000000,
          location: "New Delhi, Delhi",
          deadline: "2026-10-10", // CLOSING SOON (2 days)
          eligibility: "CPWD Class-I (Super Special) composite building contractors with minimum GRIHA 4-star certified green building construction experience of projects exceeding INR 400 Cr.",
          required_documents: JSON.stringify([
            "CPWD Class-I (Super) Registration Certificate",
            "GRIHA / IGBC Accredited Green Building Team Credentials",
            "HVAC, BMS, and Fire Fighting System Execution Capability Statement",
            "Last 5 Years Financial Turnover Statements",
            "EMD Bank Guarantee"
          ]),
          description: "Construction of modern, eco-friendly G+8 multi-storeyed Integrated Office Blocks (Blocks 4 & 5) for Central Government Ministries. Work includes diaphragm wall basement car parking for 2,000 vehicles, pre-cast RCC framed superstructure, energy-efficient double-glazed low-E curtain wall facade, 500 kWp rooftop solar PV plant, centralized VRV HVAC system, IBMS, and high-speed IoT elevators.",
          source_url: "https://eprocure.gov.in/eprocure/app"
        },
        {
          name: "Construction of 750-Bed Super Speciality Hospital Block & Academic Campus for AIIMS",
          department: "HSCC (India) Limited / Ministry of Health",
          category: "Buildings",
          budget: 8200000000,
          location: "Rewari, Haryana",
          deadline: "2026-10-13", // CLOSING SOON (5 days)
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

        // --- METRO PROJECTS (1 Tender: 1 Closing Soon) ---
        {
          name: "DMRC Phase-IV Aerocity to Tughlakabad Underground Corridor & 4 Stations (Package DC-08)",
          department: "Delhi Metro Rail Corporation (DMRC)",
          category: "Metro Projects",
          budget: 16500000000,
          location: "South Delhi Corridor, New Delhi",
          deadline: "2026-10-15", // CLOSING SOON (7 days)
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

        // --- SMART CITY (1 Tender: 1 Open) ---
        {
          name: "Bhopal Smart City Integrated Command and Control Center (ICCC) Expansion & City-Wide AI Analytics",
          department: "Bhopal Smart City Development Corporation (BSCDL)",
          category: "Smart City",
          budget: 3850000000,
          location: "Bhopal, Madhya Pradesh",
          deadline: "2026-11-20", // OPEN (43 days)
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
        db.run(
          `INSERT INTO tenders (name, department, category, budget, location, deadline, eligibility, required_documents, description, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.name, t.department, t.category, t.budget, t.location, t.deadline, t.eligibility, t.required_documents, t.description, t.source_url]
        );
      });
    }
  });

  // Seed realistic demo applications if applications table is empty
  db.get("SELECT COUNT(*) AS count FROM applications", (err, row) => {
    if (!err && row && row.count === 0) {
      seedDemoApplications();
    }
  });
});

function seedDemoApplications() {
  db.all("SELECT id, user_code FROM users", (uErr, users) => {
    if (uErr || !users || users.length === 0) return;
    db.all("SELECT id, name, category, budget FROM tenders", (tErr, tenders) => {
      if (tErr || !tenders || tenders.length === 0) return;

      const userMap = {};
      users.forEach(u => {
        if (u.user_code) userMap[u.user_code] = u.id;
      });

      const findTender = (phrase) => tenders.find(t => t.name.toLowerCase().includes(phrase.toLowerCase())) || tenders[0];

      const tJabalpur = findTender("Jabalpur");
      const tBrahmaputra = findTender("Brahmaputra");
      const tDelhiKatra = findTender("Delhi-Amritsar-Katra");
      const tMumbaiGoa = findTender("Mumbai-Goa");
      const tThane = findTender("Thane");
      const tChandrawal = findTender("Chandrawal");
      const tJalJeevan = findTender("Jal Jeevan");
      const tUltadanga = findTender("Ultadanga");
      const tSecretariat = findTender("Secretariat");

      const mgr1Id = userMap["MGR2001"] || null;
      const mgr4Id = userMap["MGR2004"] || mgr1Id;

      const demoApps = [
        // CON1001 (Rajesh Mehta): 5 Applications (1 Won, 1 Not Awarded, 2 Pending, 1 Withdrawn)
        {
          code: "APP-1001",
          user_code: "CON1001",
          tender_id: tJabalpur.id,
          applied_on: "2026-08-14",
          bid_amount: 8840000000,
          status: "Won",
          outcome: "Won",
          proposal: "Comprehensive EPC execution plan with in-house hot-mix plants and soil-testing labs deployed within 15km corridor.",
          missing_docs: "[]",
          notes: "Qualified on all technical criteria. Financial bid was highly competitive (0.9% under estimate) with full plant machinery ownership certified.",
          evaluator_id: mgr1Id,
          evaluated_at: "2026-09-28 11:30:00"
        },
        {
          code: "APP-1002",
          user_code: "CON1001",
          tender_id: tBrahmaputra.id,
          applied_on: "2026-08-20",
          bid_amount: 26800000000,
          status: "Not Awarded",
          outcome: "Not Awarded",
          proposal: "Joint-venture consortium submission with specialized deep river caisson subcontractors.",
          missing_docs: JSON.stringify(["Hydraulic Rig & Marine Barge Ownership Documents"]),
          notes: "Bid amount exceeded the sanctioned budget outlay by 8.0%. Critical marine barge and heavy hydraulic piling rig ownership certificate was missing from Technical Envelope B.",
          evaluator_id: mgr1Id,
          evaluated_at: "2026-09-22 14:15:00"
        },
        {
          code: "APP-1003",
          user_code: "CON1001",
          tender_id: tDelhiKatra.id,
          applied_on: "2026-09-10",
          bid_amount: 14100000000,
          status: "Under Review",
          outcome: "Pending",
          proposal: "Slip-form concrete paving methodology with automated laser leveling and high-capacity batching plants.",
          missing_docs: "[]",
          notes: "Technical bids opened; compliance verification currently underway with regional NHAI office.",
          evaluator_id: mgr1Id,
          evaluated_at: "2026-10-02 16:00:00"
        },
        {
          code: "APP-1004",
          user_code: "CON1001",
          tender_id: tMumbaiGoa.id,
          applied_on: "2026-09-25",
          bid_amount: 6720000000,
          status: "Submitted",
          outcome: "Pending",
          proposal: "Specialized rock nailing and ghat slope stabilization engineering proposal with dedicated drainage culverts.",
          missing_docs: "[]",
          notes: null,
          evaluator_id: null,
          evaluated_at: null
        },
        {
          code: "APP-1005",
          user_code: "CON1001",
          tender_id: tThane.id,
          applied_on: "2026-08-25",
          bid_amount: 12400000000,
          status: "Withdrawn",
          outcome: "Withdrawn",
          proposal: "Voluntary withdrawal due to resource allocation prioritization toward NH-44 execution.",
          missing_docs: "[]",
          notes: "Contractor requested formal withdrawal prior to financial bid opening.",
          evaluator_id: mgr1Id,
          evaluated_at: "2026-09-05 10:00:00"
        },

        // CON1002 (Amit Kulkarni): 2 Applications (1 Won, 1 Pending)
        {
          code: "APP-1006",
          user_code: "CON1002",
          tender_id: tChandrawal.id,
          applied_on: "2026-09-02",
          bid_amount: 5750000000,
          status: "Under Review",
          outcome: "Pending",
          proposal: "Dual media rapid sand filtration and automated ozonation plant installation.",
          missing_docs: "[]",
          notes: "Technical qualifications verified; awaiting commercial bid opening.",
          evaluator_id: mgr4Id,
          evaluated_at: "2026-09-29 12:00:00"
        },
        {
          code: "APP-1007",
          user_code: "CON1002",
          tender_id: tJalJeevan.id,
          applied_on: "2026-08-28",
          bid_amount: 4550000000,
          status: "Won",
          outcome: "Won",
          proposal: "Multi-village DI pipeline laying and automated SCADA pump house integration.",
          missing_docs: "[]",
          notes: "Excellent water transmission network experience; competitive financial bid within sanctioned outlay.",
          evaluator_id: mgr4Id,
          evaluated_at: "2026-09-18 15:00:00"
        },

        // CON1003 (Suresh Patil): 1 Application (Not Awarded)
        {
          code: "APP-1008",
          user_code: "CON1003",
          tender_id: tUltadanga.id,
          applied_on: "2026-09-15",
          bid_amount: 3400000000,
          status: "Not Awarded",
          outcome: "Not Awarded",
          proposal: "Composite steel girder flyover launching during planned railway power blocks.",
          missing_docs: JSON.stringify(["Railway Safety & RDSO Certified Fabrication Yard Approval"]),
          notes: "RDSO-certified girder fabrication yard clearance was not submitted.",
          evaluator_id: mgr1Id,
          evaluated_at: "2026-09-30 14:00:00"
        },

        // CON1004 (Neeraj Sharma): 1 Application (Pending)
        {
          code: "APP-1009",
          user_code: "CON1004",
          tender_id: tSecretariat.id,
          applied_on: "2026-09-22",
          bid_amount: 9650000000,
          status: "Under Review",
          outcome: "Pending",
          proposal: "GRIHA 4-star certified green building construction with prefabricated structural components.",
          missing_docs: "[]",
          notes: "Awaiting environmental structural clearance review.",
          evaluator_id: mgr1Id,
          evaluated_at: "2026-10-04 11:00:00"
        }
        // CON1005 (Vikram Desai): 0 Applications (Preserved for demonstrating the clean empty state)
      ];

      demoApps.forEach(a => {
        const cId = userMap[a.user_code];
        if (cId && a.tender_id) {
          db.run(
            `INSERT OR IGNORE INTO applications (
              application_code, contractor_id, tender_id, applied_on, bid_amount,
              application_status, outcome, proposal_notes, missing_documents,
              evaluation_notes, evaluator_id, evaluated_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [a.code, cId, a.tender_id, a.applied_on, a.bid_amount, a.status, a.outcome, a.proposal, a.missing_docs, a.notes, a.evaluator_id, a.evaluated_at]
          );
        }
      });
      console.log("Seeded realistic demo applications successfully.");
    });
  });
}

// MySQL-compatible query shim wrapping standard sqlite3 callbacks
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
      // SELECT queries
      db.all(sql, params, (err, rows) => {
        if (err) return cb ? cb(err) : null;
        if (cb) cb(null, rows);
      });
    }
  }
};

module.exports = connection;
