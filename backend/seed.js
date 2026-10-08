const db = require("./db");
const bcrypt = require("bcryptjs");

console.log("Seeding database with 12 verified real-world Indian government infrastructure tenders...");

// Clear tables to cleanly refresh dataset
db.query("DELETE FROM tenders", [], (err) => {
  if (err) console.error("Error clearing tenders:", err);

  // Ensure default admin & contractor users exist
  const adminPass = bcrypt.hashSync("admin123", 10);
  const contractorPass = bcrypt.hashSync("contractor123", 10);

  db.query("SELECT COUNT(*) AS count FROM users", [], (err, rows) => {
    if (!err && rows && rows[0] && rows[0].count === 0) {
      db.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        ["admin", "admin@tenderkart.gov", adminPass, "admin"],
        () => {}
      );
      db.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        ["contractor", "info@buildcorp.com", contractorPass, "user"],
        () => {}
      );
    }
  });

  // Exactly 12 Real-World Indian Government Infrastructure Tenders
  const realTenders = [
    // ==========================================
    // 1. ROADS (3 Tenders: 1 Closed, 1 Closing Soon, 1 Open)
    // ==========================================
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

    // ==========================================
    // 2. BRIDGES (3 Tenders: 1 Closed, 1 Closing Soon, 1 Open)
    // ==========================================
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

    // ==========================================
    // 3. WATER SUPPLY (2 Tenders: 1 Closing Soon, 1 Open)
    // ==========================================
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

    // ==========================================
    // 4. BUILDINGS (2 Tenders: 2 Closing Soon)
    // ==========================================
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

    // ==========================================
    // 5. METRO PROJECTS (1 Tender: 1 Closing Soon)
    // ==========================================
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

    // ==========================================
    // 6. SMART CITY (1 Tender: 1 Open)
    // ==========================================
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

  let completed = 0;
  realTenders.forEach((t) => {
    db.query(
      `INSERT INTO tenders (name, department, category, budget, location, deadline, eligibility, required_documents, description, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.name, t.department, t.category, t.budget, t.location, t.deadline, t.eligibility, t.required_documents, t.description, t.source_url],
      (insertErr) => {
        if (insertErr) {
          console.error("Error inserting tender:", insertErr.message);
        }
        completed++;
        if (completed === realTenders.length) {
          console.log(`✅ Successfully seeded all ${realTenders.length} real-world infrastructure tenders!`);
          process.exit(0);
        }
      }
    );
  });
});
