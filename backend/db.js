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
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

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
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

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

  // Seed default admin and contractor if users table is empty
  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Seeding default users...");
      const adminPass = bcrypt.hashSync("admin123", 10);
      const contractorPass = bcrypt.hashSync("contractor123", 10);

      db.run("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)", ["admin", "admin@tenderkart.gov", adminPass, "admin"]);
      db.run("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)", ["contractor", "info@buildcorp.com", contractorPass, "user"]);
    }
  });

  // Seed 12 sample tenders if tenders table is empty
  db.get("SELECT COUNT(*) AS count FROM tenders", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Seeding sample urban infrastructure tenders...");
      const sampleTenders = [
        {
          name: "[DEMO] NH-48 National Highway 6-Lane Expansion",
          department: "National Highways Authority of India (NHAI)",
          category: "Roads",
          budget: 4500000000,
          location: "Gujarat-Maharashtra Border Corridor",
          deadline: "2026-10-15",
          eligibility: "Class-A Road Contractors with prior experience of executing at least 50km of highways in the last 5 years.",
          required_documents: JSON.stringify(["Class-A Contractor Registration Certificate", "Technical Capability Statement", "Last 3 Years Audited Financial Balance Sheets", "GST Registration and PAN Card"]),
          description: "[SAMPLE DEMO TENDER] Widening and rehabilitation of the existing 4-lane national highway to 6 lanes from Km 120.000 to Km 170.000 on the NH-48 corridor. Work includes asphalt concrete overlay, flyover constructions at major junctions, and implementation of toll plaza infrastructure."
        },
        {
          name: "[DEMO] Arterial Road Resurfacing and Asphalt Overlay",
          department: "Greater Hyderabad Municipal Corporation (GHMC)",
          category: "Roads",
          budget: 95000000,
          location: "Hyderabad, Telangana",
          deadline: "2026-09-12",
          eligibility: "Local Class-A or Class-B road contractors. Must own at least one mobile hot mix plant.",
          required_documents: JSON.stringify(["Class-A/B Local Registration", "Ownership proofs of Hot Mix Plant", "Bitumen procurement source letter", "Tax Clearance Certificate"]),
          description: "[SAMPLE DEMO TENDER] Milling and resurfacing of 12.4km of core arterial roads in Hyderabad using high-performance stone matrix asphalt and polymer modified bitumen to enhance road lifetime."
        },
        {
          name: "[DEMO] Smart Outer Ring Road Construction - Phase II",
          department: "Jaipur Development Authority (JDA)",
          category: "Roads",
          budget: 750000000,
          location: "Jaipur, Rajasthan",
          deadline: "2026-11-05",
          eligibility: "Registered Class-A civil engineering firms with experience in multi-lane ring roads construction.",
          required_documents: JSON.stringify(["Class-A Civil Registration", "Equipment holding statement", "Financial capacity certificate", "GST Registration Certificate"]),
          description: "[SAMPLE DEMO TENDER] Construction of 4-lane outer ring road section including service lanes, minor bridges, utility crossings, and solar-powered signage."
        },
        {
          name: "[DEMO] Cable-Stayed Bridge Construction over Thane Creek",
          department: "Mumbai Metropolitan Region Development Authority (MMRDA)",
          category: "Bridges",
          budget: 1200000000,
          location: "Mumbai, Maharashtra",
          deadline: "2026-11-01",
          eligibility: "Specialized Bridge Engineering Firms with successfully completed cable-stayed or suspension bridge projects of span greater than 200m.",
          required_documents: JSON.stringify(["Bridge Engineering Specialization Certificate", "List of Machinery and Equipment", "Bank Solvency Certificate", "Quality Assurance Plan (QAP)"]),
          description: "[SAMPLE DEMO TENDER] Design and construction of a cable-stayed bridge spanning across Thane Creek to improve connectivity. Project includes deck construction, concrete pylons, and access ramps on both ends."
        },
        {
          name: "[DEMO] Traffic Junction Underpass Construction",
          department: "Kolkata Metropolitan Development Authority (KMDA)",
          category: "Bridges",
          budget: 280000000,
          location: "Kolkata, West Bengal",
          deadline: "2026-10-25",
          eligibility: "Civil contractors with experience in deep excavations and diaphragm walls under active traffic.",
          required_documents: JSON.stringify(["Diaphragm Wall machinery ownership", "Traffic diversion/management scheme draft", "Structural engineer certifications", "Earnest Money Deposit (EMD) receipt"]),
          description: "[SAMPLE DEMO TENDER] Construction of a 4-lane vehicle underpass at a busy highway intersection to resolve heavy traffic congestion. Work includes RCC diaphragm walls, excavation, and structural illumination."
        },
        {
          name: "[DEMO] Signature Elevated Flyover Construction at Sector 62",
          department: "NOIDA Authority",
          category: "Bridges",
          budget: 350000000,
          location: "Noida, Uttar Pradesh",
          deadline: "2026-12-15",
          eligibility: "Registered Class-I contractors with successfully completed flyovers or elevated roads in high-density urban areas.",
          required_documents: JSON.stringify(["Class-I Contractor License", "Structural design approvals", "Audited financial statements for last 3 years", "GST clearance certificate"]),
          description: "[SAMPLE DEMO TENDER] Elevated flyover construction over a key traffic junction in Noida. Scope includes pile foundation, pier construction, precast girder launch, and safety barriers installation."
        },
        {
          name: "[DEMO] 100 MLD Centralized Water Treatment Plant",
          department: "Pune Municipal Corporation (PMC)",
          category: "Water Supply",
          budget: 850000000,
          location: "Pune, Maharashtra",
          deadline: "2026-09-30",
          eligibility: "Environmental Engineering Contractors with experience building water treatment plants of at least 50 MLD capacity.",
          required_documents: JSON.stringify(["Company Incorporation Documents", "Reference Letters from past Municipal Clients", "Technical Bid Details", "Environmental Clearance Certificate"]),
          description: "[SAMPLE DEMO TENDER] Turnkey design, engineering, construction, and commissioning of a new 100 Million Litres per Day (MLD) capacity Water Treatment Plant (WTP) at Parvati. Includes sand filtration and chlorination systems."
        },
        {
          name: "[DEMO] Rainwater Harvesting Systems for Government Buildings",
          department: "Jaipur Development Authority (JDA)",
          category: "Water Supply",
          budget: 45000000,
          location: "Jaipur, Rajasthan",
          deadline: "2026-09-08",
          eligibility: "Civil contractors or water management startups with experience in rainwater harvesting structure installations.",
          required_documents: JSON.stringify(["Company profile & experience list", "Design drawings of filtration unit", "Materials testing report", "GST clearance certificate"]),
          description: "[SAMPLE DEMO TENDER] Design, supply, and installation of rainwater harvesting systems across 65 government offices and municipal buildings in Jaipur to improve local groundwater recharge."
        },
        {
          name: "[DEMO] Greenfield Integrated Government Office Complex (IGOC)",
          department: "Central Public Works Department (CPWD)",
          category: "Buildings",
          budget: 1800000000,
          location: "New Delhi, Delhi",
          deadline: "2026-12-10",
          eligibility: "GRIHA certified green building developers or Class-I structural constructors.",
          required_documents: JSON.stringify(["Class-I CPWD Registration", "GRIHA/LEED Professional Credentials", "Structural Safety Certificate", "EPF and ESIC registration copies"]),
          description: "[SAMPLE DEMO TENDER] Construction of an eco-friendly, state-of-the-art office complex. The facility will utilize solar rooftop systems, double glazed windows, and advanced automated building management systems."
        },
        {
          name: "[DEMO] District Hospital 300-Bed Expansion Block",
          department: "Uttar Pradesh Public Works Department (UP-PWD)",
          category: "Buildings",
          budget: 750000000,
          location: "Lucknow, Uttar Pradesh",
          deadline: "2026-12-05",
          eligibility: "Class-A building contractors with experience constructing medical facilities containing HVAC and medical gas piping systems.",
          required_documents: JSON.stringify(["Class-A PWD Registration", "Medical Gas pipeline specialist sub-contractor details", "Fire safety clearance design approval", "3-year average turnover certificate"]),
          description: "[SAMPLE DEMO TENDER] Construction of a new G+5 storey block in the District Hospital campus to house 300 additional beds, ICU units, and advanced diagnostic labs."
        },
        {
          name: "[DEMO] Metro Line 4 - Elevated Viaduct and 4 Stations",
          department: "Mumbai Metropolitan Region Development Authority (MMRDA)",
          category: "Metro Projects",
          budget: 6800000000,
          location: "Thane, Maharashtra",
          deadline: "2026-10-30",
          eligibility: "Consortiums or individual companies specialized in urban mass transit rail systems with completed metro station or viaduct contracts.",
          required_documents: JSON.stringify(["Consortium Agreement (if applicable)", "Metro Construction Quality manual", "Financial capacity certificate from a nationalized bank", "No Deviation Certificate"]),
          description: "[SAMPLE DEMO TENDER] Construction of an elevated viaduct of length 4.5km and four elevated stations for Metro Line 4. Work includes pile foundations, pier caps, segment casting, and station finishes."
        },
        {
          name: "[DEMO] Smart City Integrated Command and Control Center (ICCC)",
          department: "Bhopal Smart City Development Corporation Limited (BSCDL)",
          category: "Smart City",
          budget: 420000000,
          location: "Bhopal, Madhya Pradesh",
          deadline: "2026-10-05",
          eligibility: "System Integrators with IT/OT capabilities. Must have successfully completed at least one Command Center or large scale security surveillance project.",
          required_documents: JSON.stringify(["OEM Authorization Letters (Server, Software, Display)", "Cybersecurity Compliance Certification", "CVs of Project Managers and Solution Architects", "CMMI Level 3/5 certification"]),
          description: "[SAMPLE DEMO TENDER] Setting up a centralized command center to monitor civic utilities, smart traffic cameras, environmental sensors, waste management trucks, and emergency response systems."
        }
      ];

      sampleTenders.forEach((t) => {
        db.run(
          `INSERT INTO tenders (name, department, category, budget, location, deadline, eligibility, required_documents, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.name, t.department, t.category, t.budget, t.location, t.deadline, t.eligibility, t.required_documents, t.description]
        );
      });
    }
  });
});

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
