// backend/demo_dataset.js
// Structured demo dataset definitions for TenderKart enrichment

const newTenders = [
  // --- ROADS (5 New Tenders) ---
  {
    name: "Widening and Concrete Resurfacing of Ghodbunder Link Road & Golden Nest Corridor",
    department: "Mira-Bhayandar Municipal Corporation (MBMC)",
    category: "Roads",
    budget: 1450000000,
    location: "Mira-Bhayandar, Maharashtra",
    deadline: "2026-11-30",
    eligibility: "Class-I PWD / Municipal registered road contractors with experience of executing at least 15km of rigid concrete pavement in high-density urban areas.",
    required_documents: JSON.stringify([
      "MBMC Class-I Civil Enlistment Certificate",
      "Ready-Mix Concrete (RMC) Plant Batching Tie-up",
      "Last 3 Fiscal Years Audited Turnover Balance Sheets",
      "EMD Bank Guarantee Receipt",
      "GST Registration & Valid PAN Card"
    ]),
    description: "Widening from 4 to 6 lanes and heavy-duty M40 cement concrete resurfacing of the 8.4km arterial Ghodbunder Link Road connecting Western Express Highway to Golden Nest Circle. Scope includes reinforced stormwater roadside drains, utility service ducting, LED street lighting, pedestrian paver footpaths, and modern median crash barriers.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Construction of 4-Lane High Capacity Mass Transit Route (HCMTR) Inner Ring Road (Package II)",
    department: "Pune Municipal Corporation (PMC)",
    category: "Roads",
    budget: 7800000000,
    location: "Pune, Maharashtra",
    deadline: "2026-10-28",
    eligibility: "Tier-1 Highway & Infrastructure Developers with EPC experience in access-controlled urban elevated corridors exceeding INR 300 Cr in the last 5 years.",
    required_documents: JSON.stringify([
      "PMC Class-A Infrastructure License",
      "Heavy Paving & Precast Girder Gantry Machinery Proof",
      "Bank Solvency Certificate of INR 200 Cr",
      "Environmental & Noise Barrier Compliance Undertaking",
      "Valid Labor License & EPF Registration"
    ]),
    description: "Engineering, Procurement, and Construction (EPC) of Package II of Pune's High Capacity Mass Transit Route (HCMTR) between Senapati Bapat Road and Paud Road. Work comprises elevated dual-carriageway viaduct, grade-level slip roads, dedicated Bus Rapid Transit (BRT) lanes, automated toll plaza, and advanced intelligent traffic signaling.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Four-Laning of Nagpur Outer Ring Road Phase-III with Grade Separators and Service Roads",
    department: "National Highways Authority of India (NHAI)",
    category: "Roads",
    budget: 5400000000,
    location: "Nagpur, Maharashtra",
    deadline: "2026-11-15",
    eligibility: "National Highway Contractors with proven track record of constructing access-controlled ring roads or expressways of at least 25km length within 5 years.",
    required_documents: JSON.stringify([
      "NHAI EPC Developer Qualification Certificate",
      "Hot-Mix Asphalt Plant & Sensor Paver Holding Statement",
      "Audited Annual Financial Reports for FY 2022-25",
      "Earnest Money Deposit (EMD) Bank Guarantee",
      "Quality Control Lab Certification"
    ]),
    description: "Four-laning and strengthening of Outer Ring Road Phase-III from Jamtha to Fetri junction (32km) under Bharatmala Pariyojana. Involves high-embankment earthwork, dense bituminous macadam (DBM), 3 major vehicular underpasses, 8 minor bridges, highway illumination, and wildlife-friendly acoustic shielding.",
    source_url: "https://eprocure.gov.in/eprocure/app"
  },
  {
    name: "Bengaluru Peripheral Ring Road (PRR) Access-Controlled Corridor Between Tumakuru Road and Hosur Road",
    department: "Bangalore Development Authority (BDA)",
    category: "Roads",
    budget: 18500000000,
    location: "Bengaluru, Karnataka",
    deadline: "2026-12-05",
    eligibility: "International and National Mega-Infrastructure Consortiums with net worth exceeding INR 600 Cr and prior experience in greenfield 8-lane expressway construction.",
    required_documents: JSON.stringify([
      "BDA Special Class Civil Engineering License",
      "Consortium Joint Venture (JV) Legal Deed",
      "Bank Solvency Certificate of INR 400 Cr from Scheduled Commercial Bank",
      "Pollution Control Board Clearance Compliance Letter",
      "ISO 9001:2015 Quality Certification"
    ]),
    description: "Turnkey EPC construction of a 65km, 8-lane access-controlled Peripheral Ring Road (PRR) corridor encircling northern and eastern Bengaluru. Project incorporates full cloverleaf interchanges at NH-44 and NH-75, cloverleaf underpasses, smart electronic tolling gantries, solar median lighting, and smart rainwater harvesting retention reservoirs.",
    source_url: "https://kppp.karnataka.gov.in"
  },
  {
    name: "Widening and Cement Concrete Pavement of Trimbak Road Corridor with Stormwater Culverts",
    department: "Nashik Municipal Corporation (NMC)",
    category: "Roads",
    budget: 980000000,
    location: "Nashik, Maharashtra",
    deadline: "2026-10-18",
    eligibility: "Registered Class-I Maharashtra PWD / NMC contractors with at least two completed municipal arterial road projects valued over INR 40 Cr.",
    required_documents: JSON.stringify([
      "NMC Class-I Civil Registration",
      "Concrete Paving Equipment Ownership Document",
      "3 Years CA-Certified Balance Sheets",
      "Bid Security Declaration",
      "GST Certificate"
    ]),
    description: "Widening of existing 2-lane corridor to 4-lane divided cement concrete carriageway along the 7.2km Trimbak Road sector. Scope covers reinforced concrete box culverts, shifting of water pipelines and electric utilities, bus shelters, roadside greenery plantation, and pedestrian walkways.",
    source_url: "https://mahatenders.gov.in"
  },

  // --- BRIDGES (4 New Tenders) ---
  {
    name: "Design and Construction of 4-Lane Vehicular Creek Bridge Connecting Bhayandar West and Naigaon",
    department: "Mumbai Metropolitan Region Development Authority (MMRDA) & MBMC",
    category: "Bridges",
    budget: 3650000000,
    location: "Mira-Bhayandar, Maharashtra",
    deadline: "2026-11-22",
    eligibility: "Specialized Bridge Engineering contractors with prior experience in marine piling, tidal creek bridge foundations, and segmental prestressed concrete spans > 40m.",
    required_documents: JSON.stringify([
      "MMRDA Special Class Bridge License",
      "Marine Hydraulic Piling Rig & Barge Ownership Proof",
      "CRZ (Coastal Regulation Zone) Environmental Clearance Undertaking",
      "Solvency Certificate of INR 100 Cr",
      "EMD Bank Guarantee"
    ]),
    description: "Turnkey EPC contract for constructing a 4-lane, 4.8km creek bridge over Panju Island creek connecting Bhayandar West to Naigaon East. Project features cast-in-situ bored marine piles with corrosion-resistant epoxy rebars, precast segmental box girder spans, navigation channel clearance spans, and anti-crash barriers.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Cable-Stayed Bridge across Tapi River Connecting Adajan and Palanpur Patia",
    department: "Surat Municipal Corporation (SMC)",
    category: "Bridges",
    budget: 4200000000,
    location: "Surat, Gujarat",
    deadline: "2026-10-25",
    eligibility: "Class-AA Civil Bridge Engineering firms with track record of constructing cable-stayed or continuous prestressed concrete cantilever bridges over perennial rivers.",
    required_documents: JSON.stringify([
      "Gujarat PWD / SMC Class-AA License",
      "Stay-Cable Specialist Technology Tie-up Agreement",
      "Audited Financial Turnover for Last 3 Years",
      "ISO 14001 Environmental Certification",
      "EMD Draft"
    ]),
    description: "Design and construction of an iconic 6-lane cable-stayed bridge spanning 950 meters across the Tapi River. Highlights include 85m tall twin concrete pylons, stay cables with multi-strand corrosion protection, seismic shock dampers, decorative dynamic architectural LED lighting, and approach viaducts.",
    source_url: "https://tender.nprocure.com"
  },
  {
    name: "Construction of Multi-Tier Flyover at University Junction on Ganeshkhind Road",
    department: "Pune Metropolitan Region Development Authority (PMRDA)",
    category: "Bridges",
    budget: 2850000000,
    location: "Pune, Maharashtra",
    deadline: "2026-09-30", // Closed tender (for past application testing)
    eligibility: "Registered Class-I Bridge and Flyover Contractors with experience in urban flyover construction over heavily trafficked intersections without total road closure.",
    required_documents: JSON.stringify([
      "PMRDA Class-I Enlistment Certificate",
      "Traffic Management and Safety Plan",
      "Composite Steel-Concrete Girder Fabrication Yard MOU",
      "Bank Solvency Letter of INR 80 Cr",
      "Valid GST & PAN"
    ]),
    description: "Integrated double-decker flyover and metro viaduct support system at Pune University Chowk on Ganeshkhind Road. Work comprises steel-concrete composite pier caps, segmental deck slabs, vehicular grade-separators toward Aundh, Baner, and Pashan, sound-damping barriers, and junction aesthetic enhancement.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Six-Lane Elevated Corridor and Rail Over Bridge (ROB) over Ahmedabad-Vadodara Railway Line",
    department: "Ahmedabad Urban Development Authority (AUDA)",
    category: "Bridges",
    budget: 3100000000,
    location: "Ahmedabad, Gujarat",
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

  // --- WATER SUPPLY (5 New Tenders) ---
  {
    name: "Surya Regional Bulk Water Supply Scheme - 218 MLD Feeder Pipeline Network and Master Reservoirs",
    department: "Mira-Bhayandar Municipal Corporation (MBMC)",
    category: "Water Supply",
    budget: 4850000000,
    location: "Mira-Bhayandar, Maharashtra",
    deadline: "2026-11-05",
    eligibility: "Class-A Water & Public Health Engineering (PHE) contractors with experience in laying minimum 60km of Mild Steel (MS) / Ductile Iron (DI) potable pipelines of diameter >= 1200mm.",
    required_documents: JSON.stringify([
      "MBMC / MJP Class-A Registration",
      "Mild Steel (MS) Pipe Factory Fabrication & Coating License",
      "Hydraulic Pressure Testing Equipment Statement",
      "3 Years Audited Turnover Statement > INR 150 Cr",
      "Bid Security Declaration"
    ]),
    description: "EPC execution of regional bulk potable water transmission network to draw 218 MLD water from Surya Dam for Mira-Bhayandar. Involves 88km MS pipeline with internal food-grade epoxy lining, 4 ground-level break pressure balancing reservoirs, automated chlorination stations, and central SCADA telemetry monitoring.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Expansion of 100 MLD Temghar Water Filtration Facility and Transmission Main up to Ghodbunder",
    department: "Thane Municipal Corporation (TMC)",
    category: "Water Supply",
    budget: 2950000000,
    location: "Thane, Maharashtra",
    deadline: "2026-10-22",
    eligibility: "Water Treatment Plant (WTP) EPC specialists who have commissioned at least one 60+ MLD rapid sand filtration plant and associated booster pump houses.",
    required_documents: JSON.stringify([
      "TMC Class-A Public Health License",
      "SCADA System OEM Tie-up Letter",
      "Bank Solvency Certificate of INR 75 Cr",
      "ISO 9001 Quality Certification",
      "GST Registration"
    ]),
    description: "Turnkey augmentation of the Temghar Water Works by 100 MLD capacity. Scope includes clariflocculators, dual-media rapid sand filters, chemical dosing house, sludge handling centrifuge, 18km high-pressure DI K9 transmission main, and integration into TMC centralized water management dashboard.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Narmada Phase-IV Bulk Potable Water Intake Well, Pumping Substation, and Feeder Mains",
    department: "Indore Municipal Corporation (IMC)",
    category: "Water Supply",
    budget: 6400000000,
    location: "Indore, Madhya Pradesh",
    deadline: "2026-11-18",
    eligibility: "Class-A PHE Contractors with prior execution of river intake wells, multi-stage 33kV high-head pumping substations, and large-diameter water transmission conduits.",
    required_documents: JSON.stringify([
      "MP Urban Development / IMC Class-A Registration",
      "High-Tension Electrical Substation Contractor License (Grade-A)",
      "Pump Manufacturer OEM Authorized Collaboration Deed",
      "Last 3 Years Audited Turnover Balance Sheets",
      "EMD Bank Guarantee"
    ]),
    description: "Fourth phase augmentation of the Narmada River bulk water supply scheme for Indore metropolitan area. Encompasses river intake well at Mandleshwar, 132kV dedicated electrical substation, 3-stage high-pressure pump houses, 54km 1800mm diameter MS pipeline, and 12 master balancing reservoirs.",
    source_url: "https://mptenders.gov.in"
  },
  {
    name: "Cauvery Water Supply Scheme Stage V - 775 MLD Transmission Main and Booster Pumping Stations",
    department: "Bangalore Water Supply and Sewerage Board (BWSSB)",
    category: "Water Supply",
    budget: 9200000000,
    location: "Bengaluru, Karnataka",
    deadline: "2026-10-16",
    eligibility: "Large-scale Water Engineering Consortiums with experience in laying transmission pipelines exceeding 100km and commissioning water treatment complexes > 300 MLD.",
    required_documents: JSON.stringify([
      "BWSSB Special Class Contractor License",
      "Pipeline Corrosion Protection Ultrasonic Testing Protocol",
      "Bank Solvency Certificate of INR 250 Cr",
      "Joint Venture Agreement (if applicable)",
      "Labor Welfare Clearance"
    ]),
    description: "Turnkey EPC package for Cauvery Stage V potable water project catering to 110 peripheral villages of Bengaluru. Scope involves laying 2750mm diameter MS transmission mains from T.K. Halli to Harohalli, construction of intermediate high-lift pump stations, surge suppression vessels, and electromagnetic flow meters.",
    source_url: "https://kppp.karnataka.gov.in"
  },
  {
    name: "Morbe Dam Raw Water Pipeline Duplication and SCADA-Controlled Break Pressure Tanks",
    department: "Navi Mumbai Municipal Corporation (NMMC)",
    category: "Water Supply",
    budget: 3350000000,
    location: "Navi Mumbai, Maharashtra",
    deadline: "2026-09-20", // Closed tender (for past application testing)
    eligibility: "Class-I Water Supply Contractors with experience in executing gravity raw water pipelines in challenging hill terrains.",
    required_documents: JSON.stringify([
      "NMMC Class-I Registration",
      "Tunneling & Trenchless Pipe Jacking Machinery Proof",
      "Audited Annual Financials for FY 2022-25",
      "EMD Verification Letter",
      "Valid PAN and GST"
    ]),
    description: "Duplication of the raw water gravity pipeline from Morbe Dam reservoir to Bhokarpada Water Treatment Plant (28km). Involves 1600mm diameter spiral welded steel pipeline, construction of two break pressure tanks, micro-tunneling under railway tracks, and real-time acoustic leak detection telemetry.",
    source_url: "https://mahatenders.gov.in"
  },

  // --- BUILDINGS (4 New Tenders) ---
  {
    name: "Modernization and Structural Retrofitting of KEM Hospital Academic Complex and Resident Hostel Block",
    department: "Brihanmumbai Municipal Corporation (BMC)",
    category: "Buildings",
    budget: 3250000000,
    location: "Mumbai, Maharashtra",
    deadline: "2026-10-29",
    eligibility: "Class-I Building Contractors with proven track record in hospital infrastructure, seismic retrofitting, and high-rise institutional campus construction.",
    required_documents: JSON.stringify([
      "BMC Class-I Civil Enlistment",
      "Seismic Retrofitting Specialist Subcontractor Agreement",
      "HVAC & Central Fire Safety System OEM Certification",
      "3 Years Balance Sheets with Average Turnover > INR 120 Cr",
      "EMD Bank Guarantee"
    ]),
    description: "Comprehensive structural retrofitting, architectural modernization, and new construction of G+14 Resident Doctors Hostel Tower at KEM Hospital Parel campus. Work features carbon-fiber jacket retrofitting, central VRF air conditioning, medical library automation, 400-bed hostel suites, and fire-sprinkler safety systems.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Construction of 12-Storey International Diamond & Trade Facilitation Center at GIFT City",
    department: "Gujarat International Finance Tec-City (GIFT City)",
    category: "Buildings",
    budget: 7500000000,
    location: "Ahmedabad, Gujarat",
    deadline: "2026-11-28",
    eligibility: "Tier-1 Commercial Real Estate Developers with IGBC Platinum green building experience and composite steel-concrete construction history of towers >= 50m height.",
    required_documents: JSON.stringify([
      "GIFT City Accredited Builder License",
      "IGBC / LEED Platinum Certified Team Roster",
      "IBMS (Integrated Building Management System) Capability Statement",
      "Bank Solvency Certificate of INR 200 Cr",
      "EPF, ESI and Labor Clearances"
    ]),
    description: "Turnkey EPC construction of a twin-tower G+12 International Diamond and Trade Complex with 3 basement parking levels. Involves high-performance low-E structural glazing, automated pneumatic waste collection integration, district cooling piping hook-up, smart biometric access control, and 1.2 MW rooftop solar solar canopy.",
    source_url: "https://tender.nprocure.com"
  },
  {
    name: "Construction of Central Administrative Headquarters Building (G+10) with Integrated Solar Facade",
    department: "City and Industrial Development Corporation (CIDCO)",
    category: "Buildings",
    budget: 4600000000,
    location: "Navi Mumbai, Maharashtra",
    deadline: "2026-10-20",
    eligibility: "Class-I Commercial Civil Contractors with GRIHA 4-star experience and expertise in pre-stressed post-tensioned RCC slab construction.",
    required_documents: JSON.stringify([
      "CIDCO Class-I Civil Registration",
      "GRIHA Green Building Compliance Manual",
      "Post-Tensioning System Equipment Ownership Proof",
      "Audited Financial Balance Sheets (FY 2022-25)",
      "EMD Bank Guarantee Receipt"
    ]),
    description: "Construction of CIDCO's new zonal administrative headquarters in Kharghar. Project comprises G+10 reinforced concrete structure with 600-seat digital auditorium, building-integrated photovoltaics (BIPV) solar glass facade, rainwater harvesting, central building automation, and high-speed destination-dispatch elevators.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Construction of Devi Ahilya Integrated Convention and Cultural Exhibition Centre",
    department: "Indore Development Authority (IDA)",
    category: "Buildings",
    budget: 2800000000,
    location: "Indore, Madhya Pradesh",
    deadline: "2026-09-25", // Closed tender (for past application testing)
    eligibility: "Class-A Civil Contractors with track record in wide-span column-free space frame structures, exhibition halls, and acoustic auditorium construction.",
    required_documents: JSON.stringify([
      "IDA Class-A Civil Registration",
      "Long-Span Steel Truss Specialist Fabrication Agreement",
      "Acoustic & AV System Integration Capability Statement",
      "Bank Solvency of INR 70 Cr",
      "GST & PAN Credentials"
    ]),
    description: "Design and construction of an iconic 3,000-delegate convention hall and exhibition center on Super Corridor Indore. Features 60-meter column-free tubular steel roof truss, acoustic wall paneling, multi-cuisine banquet pavilion, underground parking for 1,200 cars, and solar power array.",
    source_url: "https://mptenders.gov.in"
  },

  // --- METRO PROJECTS (3 New Tenders) ---
  {
    name: "Mumbai Metro Line 9 (Dahisar East to Mira-Bhayandar) Elevated Viaduct and 8 Elevated Stations",
    department: "Mumbai Metropolitan Region Development Authority (MMRDA)",
    category: "Metro Projects",
    budget: 11200000000,
    location: "Mira-Bhayandar, Maharashtra",
    deadline: "2026-11-12",
    eligibility: "Specialized Mass Rapid Transit (MRTS) Infrastructure Contractors with prior execution of at least 8km elevated metro viaduct and precast segmental launching experience.",
    required_documents: JSON.stringify([
      "MMRDA MRTS Civil Enlistment Certificate",
      "Precast Segment Casting Yard Ownership / Lease Deed",
      "Launching Gantry Heavy Equipment Test Certificate",
      "Bank Solvency Certificate of INR 250 Cr",
      "Joint Venture (JV) Legal Deed"
    ]),
    description: "Turnkey civil construction of 10.58km elevated metro viaduct and 8 elevated stations along Mumbai Metro Line 9 from Dahisar East to Bhayandar West. Work comprises pier foundations, precast U-girder and I-girder erection with launching gantries, station structural steel roof trusses, architectural station finishes, and MEP works.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Namma Metro Phase-2A Outer Ring Road (Silk Board to KR Puram) Viaduct & 6 Stations (Package 1)",
    department: "Bangalore Metro Rail Corporation Limited (BMRCL)",
    category: "Metro Projects",
    budget: 13400000000,
    location: "Bengaluru, Karnataka",
    deadline: "2026-10-31",
    eligibility: "Metro Rail EPC developers with minimum experience of executing at least one 10km elevated metro line in active metropolitan road medians.",
    required_documents: JSON.stringify([
      "BMRCL Civil Registration",
      "Urban Traffic Diversion & Safety Management Plan",
      "Turnover Statement for Last 5 Years > INR 400 Cr",
      "Environmental Management Plan (EMP) Undertaking",
      "EMD Bank Guarantee"
    ]),
    description: "Civil package for 9.85km elevated metro viaduct and 6 elevated stations (Central Silk Board, HSR Layout, Agara, Ibbalur, Bellandur, Kadubeesanahalli) on Bengaluru ORR. Includes road widening, utility shifting, viaduct pier construction, U-girder erection, and integrated foot overbridges to tech parks.",
    source_url: "https://kppp.karnataka.gov.in"
  },
  {
    name: "Pune Metro Line 3 Extension from Hinjawadi Phase-III to Shivajinagar Junction (Package E3)",
    department: "Pune Metropolitan Region Development Authority (PMRDA)",
    category: "Metro Projects",
    budget: 8900000000,
    location: "Pune, Maharashtra",
    deadline: "2026-11-25",
    eligibility: "Class-A MRTS Contractors or Consortiums with prior track record in elevated guideway, pre-stressed concrete spans, and urban transit station construction.",
    required_documents: JSON.stringify([
      "PMRDA Metro Enlistment",
      "Concrete Batching Plant & Segment Transporter Ownership Proof",
      "Bank Solvency Certificate of INR 180 Cr",
      "ISO 45001 Occupational Health & Safety Certificate",
      "Valid GST & PAN"
    ]),
    description: "EPC execution of 8.2km elevated metro viaduct and 5 stations connecting Hinjawadi IT Park to Balewadi Sports Complex. Encompasses bored pile foundations, portal beam piers across Pune-Mumbai Expressway junction, station concourse and platform level RCC construction, and stormwater drainage systems.",
    source_url: "https://mahatenders.gov.in"
  },

  // --- SMART CITY (3 New Tenders) ---
  {
    name: "Surat Smart City Artificial Intelligence IoT Flood Early Warning & Stormwater Sensor Grid",
    department: "Surat Smart City Development Limited (SSCDL)",
    category: "Smart City",
    budget: 1850000000,
    location: "Surat, Gujarat",
    deadline: "2026-11-15",
    eligibility: "Smart City System Integrators and IT/OT Infrastructure providers with CMMI Level 3+ certification and experience in deploying IoT sensor networks in coastal or flood-prone municipal zones.",
    required_documents: JSON.stringify([
      "CMMI Level 3+ & ISO 27001 Information Security Certifications",
      "Hydraulic Flow & Water Level Sensor OEM Authorization Letters",
      "3 Years Audited Financial Turnover > INR 50 Cr",
      "Cybersecurity Data Encryption Compliance Deed",
      "EMD Draft"
    ]),
    description: "Turnkey supply, deployment, and 5-year maintenance of city-wide IoT stormwater monitoring network and AI flood early-warning platform. Features 450 ultrasonic water level sensors, 12 weather radar stations, automated sluice gate telemetry, hydrodynamic simulation software, and citizen SMS flood alert system.",
    source_url: "https://tender.nprocure.com"
  },
  {
    name: "Pune Smart City Adaptive Traffic Control System (ATCS) and 24x7 Integrated Surveillance Expansion",
    department: "Pune Smart City Development Corporation (PSCDCL)",
    category: "Smart City",
    budget: 2450000000,
    location: "Pune, Maharashtra",
    deadline: "2026-10-24",
    eligibility: "Intelligent Transportation Systems (ITS) and Smart City Tech Contractors with experience in deploying camera-based ATCS at minimum 150 urban traffic junctions.",
    required_documents: JSON.stringify([
      "PSCDCL System Integrator Enlistment",
      "ATCS Controller & Camera OEM Warranty Agreements",
      "City Optical Fiber Network Maintenance Capability Statement",
      "Bank Solvency Certificate of INR 60 Cr",
      "Bid Security Declaration"
    ]),
    description: "Expansion of Pune Smart City Integrated Command and Control Centre (ICCC) across 260 major traffic junctions. Scope covers AI-based adaptive traffic signals, 1,800 red-light violation detection (RLVD) cameras, automatic license plate readers (ANPR), and high-bandwidth optical fiber connectivity.",
    source_url: "https://mahatenders.gov.in"
  },
  {
    name: "Nagpur Smart Mobility Intelligent Transport Management System (ITMS) and City Fiber Optic Backbone",
    department: "Nagpur Smart and Sustainable City Development Corporation (NSSCDCL)",
    category: "Smart City",
    budget: 2150000000,
    location: "Nagpur, Maharashtra",
    deadline: "2026-12-10",
    eligibility: "Smart Infrastructure and Telecommunications Contractors with track record in laying at least 200km underground optical fiber cable (OFC) and smart transit fleet tracking.",
    required_documents: JSON.stringify([
      "NSSCDCL System Integrator Registration",
      "Underground Horizontal Directional Drilling (HDD) Machinery Proof",
      "Audited Turnover for FY 2022-25 > INR 60 Cr",
      "OEM Certifications for GPS Transit Units & GIS Software",
      "EMD Bank Guarantee"
    ]),
    description: "Turnkey implementation of Intelligent Transport Management System (ITMS) for 600 city buses and 320km underground high-capacity optical fiber communications ring. Involves real-time bus arrival displays (PIS), automated fare collection (AFCS) smart cards, and live driver monitoring telemetry.",
    source_url: "https://mahatenders.gov.in"
  }
];

// Additional 5 Fictional Demo Contractors (CON1006 - CON1010)
const newContractors = [
  {
    username: "CON1006",
    user_code: "CON1006",
    name: "Arvind Patel",
    company: "Patel Earthmovers & Infra",
    department: null,
    email: "arvind.patel@demo.tenderkart.in",
    passwordRaw: "Contractor@1006",
    role: "contractor",
    created_at: "2026-08-01 09:00:00"
  },
  {
    username: "CON1007",
    user_code: "CON1007",
    name: "Deepak Verma",
    company: "Verma Metro & Tunneling",
    department: null,
    email: "deepak.verma@demo.tenderkart.in",
    passwordRaw: "Contractor@1007",
    role: "contractor",
    created_at: "2026-08-10 11:30:00"
  },
  {
    username: "CON1008",
    user_code: "CON1008",
    name: "Ananya Sen",
    company: "Sen Urban Engineering",
    department: null,
    email: "ananya.sen@demo.tenderkart.in",
    passwordRaw: "Contractor@1008",
    role: "contractor",
    created_at: "2026-08-15 14:00:00"
  },
  {
    username: "CON1009",
    user_code: "CON1009",
    name: "Tarun Aggarwal",
    company: "Aggarwal Smart Utilities",
    department: null,
    email: "tarun.aggarwal@demo.tenderkart.in",
    passwordRaw: "Contractor@1009",
    role: "contractor",
    created_at: "2026-09-10 10:15:00"
  },
  {
    username: "CON1010",
    user_code: "CON1010",
    name: "Pooja Hegde",
    company: "Hegde Water Works & Pipelines",
    department: null,
    email: "pooja.hegde@demo.tenderkart.in",
    passwordRaw: "Contractor@1010",
    role: "contractor",
    created_at: "2026-09-28 16:45:00"
  }
];

module.exports = {
  newTenders,
  newContractors
};
