# 🏛️ TenderKart — Discover & Track Urban Infrastructure Tenders. Intelligently.

🌐 **Live Demo:** 👉 [https://tender-kart.vercel.app/](https://tender-kart.vercel.app/)  
📊 **Contractor Dashboard:** 👉 [https://tender-kart.vercel.app/dashboard.html](https://tender-kart.vercel.app/dashboard.html)  
🛡️ **Admin Governance Portal:** 👉 [https://tender-kart.vercel.app/admin.html](https://tender-kart.vercel.app/admin.html)  
🔗 **GitHub Repository:** 👉 [https://github.com/shreyansh-sinha-1509s/TenderKart](https://github.com/shreyansh-sinha-1509s/TenderKart)  

---

## 📌 Overview

**TenderKart** is an intelligent, centralized GovTech procurement intelligence platform designed to bridge the gap between municipal authorities, government departments, contractors, and infrastructure suppliers.

It indexes active urban infrastructure tenders across major sectors (highways, bridges, metro rail, water supply, smart cities, and green energy), provides instant **AI-powered executive summaries of complex Notice Inviting Tender (NIT) documents**, enables structured document checklist tracking, and delivers end-to-end tender governance for both bidding contractors and department administrators.

$$\mathbf{\text{Ingest Government Notices}} \;\longrightarrow\; \mathbf{\text{AI Procurement Digest}} \;\longrightarrow\; \mathbf{\text{Multi-Parameter Matching}} \;\longrightarrow\; \mathbf{\text{Contractor Bidding Workflow}}$$

The platform is engineered to eliminate tender discovery friction, prevent disqualification due to overlooked compliance documents, and provide real-time budget outlay analytics across municipal infrastructure projects.

> [!NOTE]  
> **Serverless Cloud Persistence**: TenderKart comes pre-seeded with 12 verified Indian government infrastructure tenders and default credentials for instant evaluation. On Vercel, it utilizes an automated self-initializing SQLite instance ensuring zero-configuration cloud execution.

---

## 🎯 Problem Statement

Public procurement and infrastructure contracting represent hundreds of billions of dollars annually, yet contractors and municipal agencies face significant operational friction:

- **Fragmented Portals**: Tenders are scattered across disparate central (CPPP, GeM), state, and municipal corporation websites with inconsistent search mechanisms.
- **100+ Page NIT Overload**: Contractors spend days manually parsing massive Notice Inviting Tender (NIT) documents to extract basic eligibility, scope of work, and Earnest Money Deposit (EMD) requirements.
- **Disqualification from Missing Documents**: Up to 35% of technical bids are rejected simply due to missing compliance certificates, expired solvency proofs, or overlooked tender-specific annexures.
- **Lack of Centralized Tracking**: Small and mid-size contractors lack enterprise ERP tools to track upcoming deadlines, monitor shortlisted tenders, and estimate capital commitments.
- **Opaque Departmental Outlays**: Municipal administrators lack high-level dashboards displaying aggregate budget allocations across project categories, locations, and active tenders.

TenderKart solves these challenges through a unified discovery engine, automated AI-assisted NIT summarization, live compliance checklists, and role-based contractor/admin portals.

---

## 💡 Solution

TenderKart replaces manual, fragmented procurement workflows with a streamlined 8-stage intelligence pipeline:

```text
       Government Tender Published
                 │
                 ▼
         Ingest & Categorize
                 │
                 ▼
     Multi-Parameter Search & Match
                 │
                 ▼
        AI Executive Digest
   (Gemini 1.5 Flash + Local Fallback)
                 │
                 ▼
    Interactive Document Checklist
                 │
                 ▼
      Contractor Watchlist / Save
                 │
         ────────┴────────
        │                 │
        ▼                 ▼
  CONTRACTOR BID     ADMIN GOVERNANCE
    PREPARATION       & MACRO STATS
```

> [!IMPORTANT]  
> **Reliable AI Architecture with Guaranteed Fallback**: TenderKart integrates Google Gemini 1.5 Flash for high-speed tender analysis while maintaining a deterministic local procurement parser. If an API key is absent or rate-limited, the system seamlessly generates structured executive digests offline without breaking user workflows.

---

## 🚀 Key Features

- 🔍 **Multi-Parameter Tender Discovery**  
  Filter and search active tenders instantly by category (Roads, Bridges, Water, Metro, Smart City, Energy), department, location, minimum/maximum budget range, and submission deadline.

- 🧠 **AI-Powered Tender Digest & Summarizer**  
  Extracts 3-point executive work scopes, eligibility prerequisites, required document lists, and budget conversions from dense descriptions in under a second using Gemini 1.5 Flash.

- 📋 **Interactive Document Checklist & Compliance Tracker**  
  Live interactive checklist for mandatory tender submissions (Class-A Contractor Registration, GST & PAN, Audited Balance Sheets, Solvency Certificates, EMD Drafts) to eliminate bid rejection.

- 📊 **Contractor Watchlist & Personal Dashboard**  
  Registered contractors can bookmark tenders to their private watchlist, track total capital outlay at risk, monitor approaching deadlines, and remove completed bids.

- 🛡️ **Administrative Governance Portal**  
  Full operational control center for municipal officers: publish new tenders with dynamic document requirements, delete expired notices, view macro budget charts, and inspect real-time audit activity logs.

- 🌗 **High-Contrast Dark / Light Theme Engine**  
  Clean, accessible GovTech UI designed with custom CSS variables, supporting seamless theme toggling with persistent user preference storage.

- 📱 **Mobile-First Responsive Layout**  
  Fully optimized responsive design with collapsible mobile navigation, touch-friendly filter bars, auto-rotating hero showcases, and adaptive modal dialogs.

- ⚡ **Zero-Framework High-Speed Stack**  
  Ultra-lightweight vanilla HTML5, CSS3, and ES6 JavaScript frontend communicating with a streamlined Node.js + Express + SQLite backend for near-instant page loads.

---

## 🔄 Procurement Workflow

```text
01 Discover ──► 02 Filter & Match ──► 03 AI Digest ──► 04 Validate Checklist ──► 05 Watchlist ──► 06 Bid / Manage
```

### 01 — Discover
Browse active urban infrastructure notices across all municipal departments and state development authorities.

### 02 — Filter & Match
Narrow down tenders matching specific technical capabilities, regional jurisdictions, or budget thresholds (from ₹50 Lakhs to ₹5,000 Crores).

### 03 — AI Executive Digest
Click **"Summarize with AI"** on any tender page to get an immediate executive summary of the scope, eligibility criteria, and key milestones.

### 04 — Validate Checklist
Review and check off required submission documents interactively to ensure 100% technical bid compliance prior to document submission.

### 05 — Watchlist & Track
Save shortlisted opportunities to the personal Contractor Dashboard to monitor deadlines and calculate aggregate project pipeline value.

### 06 — Admin Governance & Publishing
Municipal officers can publish new tenders, manage existing listings, and monitor real-time procurement statistics via the Admin Console.

---

## 🛡️ AI & System Architecture

TenderKart is structured with clear separation of concerns between client presentation, REST routing, AI diagnostics, and persistent data storage:

```text
  ┌──────────────────────────────────────────────────────────┐
  │                 Frontend (Vercel Edge)                   │
  │  • Homepage & Auto-Rotating Hero (index.html)            │
  │  • Full Tenders Catalog & Filter Bar (tenders.html)      │
  │  • Tender Deep-Dive & Checklist (tenderDetails.html)     │
  │  • Contractor Watchlist Dashboard (dashboard.html)       │
  │  • Administrative Governance Center (admin.html)         │
  │  • Custom Vanilla CSS System (style.css)                 │
  └────────────────────────────┬─────────────────────────────┘
                               │ HTTPS / REST API
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │              Backend API Server (Node.js/Express)        │
  │  • Users & JWT Authentication (/api/users)               │
  │  • Tenders Querying & Filtering (/api/tenders)           │
  │  • Contractor Saved Tenders (/api/saved)                 │
  │  • Admin Stats & Operations (/api/admin)                 │
  └──────────────┬────────────────────────────┬──────────────┘
                 │                            │
                 ▼                            ▼
  ┌──────────────────────────┐ ┌─────────────────────────────┐
  │   AI Intelligence Engine │ │    Embedded Database Layer   │
  │  • Gemini 1.5 Flash API  │ │  • SQLite (tenderkart.db)   │
  │  • Local Rule-Based      │ │  • Auto-replicated to /tmp  │
  │    Fallback Summarizer   │ │    for Serverless Runs      │
  └──────────────────────────┘ └─────────────────────────────┘
```

---

## 🏛️ Active Infrastructure Sectors

| Category | Typical Scope | Sample Budget Range | Key Authorities |
| :--- | :--- | :--- | :--- |
| **Roads & Highways** | Expressways, arterial resurfacing, flyovers | ₹5 Cr – ₹4,500 Cr | NHAI, State PWDs, GHMC |
| **Bridges & Flyovers** | Cable-stayed bridges, river crossings, ROBs | ₹80 Cr – ₹1,200 Cr | MMRDA, State PWD, Rail Vikas Nigam |
| **Water Supply & Drainage** | 24x7 water grids, STPs, stormwater channels | ₹20 Cr – ₹600 Cr | Jal Jeevan Mission, DJB, BWSSB |
| **Metro & Rail Transit** | Elevated viaducts, underground tunneling, signaling | ₹300 Cr – ₹8,000 Cr | DMRC, BMRCL, Maha-Metro |
| **Smart City & IoT** | Traffic command centers, CCTV networks, smart grids | ₹10 Cr – ₹250 Cr | Smart Cities Mission, Municipal Corps |
| **Renewable Energy** | Rooftop solar, municipal solar parks, EV charging | ₹5 Cr – ₹150 Cr | SECI, State Discoms, Municipalities |
| **Health Infrastructure** | Multi-speciality hospital blocks, medical colleges | ₹40 Cr – ₹800 Cr | CPWD, State Health Departments |
| **Waste Management** | Solid waste processing plants, bio-methanation | ₹15 Cr – ₹200 Cr | Swachh Bharat Urban, Municipalities |

---

## 🔗 Live Links & API Endpoints

| Resource | URL / Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Live Portal** | [https://tender-kart.vercel.app/](https://tender-kart.vercel.app/) | `GET` | Public | Public landing page with live hero showcase |
| **Tenders Explorer** | [https://tender-kart.vercel.app/tenders.html](https://tender-kart.vercel.app/tenders.html) | `GET` | Public | Searchable, filterable tender directory |
| **Contractor Dashboard** | [https://tender-kart.vercel.app/dashboard.html](https://tender-kart.vercel.app/dashboard.html) | `GET` | Contractor | Contractor personal watchlist & metrics |
| **Admin Console** | [https://tender-kart.vercel.app/admin.html](https://tender-kart.vercel.app/admin.html) | `GET` | Admin | Administrative metrics, publishing & logs |
| **List Tenders API** | `/api/tenders` | `GET` | Public | Filter by search, category, budget, deadline |
| **Tender Details API** | `/api/tenders/:id` | `GET` | Public | Retrieve complete tender record and documents |
| **AI Summarizer API** | `/api/tenders/:id/summarize` | `POST` | Public | Generate executive AI summary of tender |
| **User Registration** | `/api/users/register` | `POST` | Public | Register new contractor company account |
| **User Login** | `/api/users/login` | `POST` | Public | Authenticate user & issue JWT bearer token |
| **Saved Tenders API** | `/api/saved` | `GET/POST/DELETE` | JWT User | Manage contractor watchlist items |
| **Admin Stats API** | `/api/admin/stats` | `GET` | JWT Admin | Retrieve platform totals, charts, and activity logs |
| **GitHub Repository** | [https://github.com/shreyansh-sinha-1509s/TenderKart](https://github.com/shreyansh-sinha-1509s/TenderKart) | — | — | Official source code & issue tracker |

---

## 📁 Repository Structure

```text
TenderKart/
├── index.html                 # Landing page with interactive hero showcase & quick search
├── tenders.html               # Full tenders explorer with dynamic multi-parameter filters
├── tenderDetails.html         # Detailed tender view with AI summarizer & compliance checklist
├── dashboard.html             # Contractor personal dashboard & saved tenders tracker
├── admin.html                 # Municipal administration control center & macro analytics
├── login.html                 # Unified authentication portal for contractors and admins
├── register.html              # Contractor self-registration portal
├── about.html                 # Platform mission, governance details, and sector overview
├── contact.html               # Departmental support and inquiry portal
├── app.js                     # Core frontend logic (API adapter, DOM rendering, AI trigger)
├── style.css                  # Production design system (tokens, themes, responsive grids)
├── vercel.json                # Vercel serverless deployment routing configuration
├── package.json               # Root manifest for full-stack Vercel deployment
├── api/
│   └── index.js               # Serverless entrypoint exporting Express app
├── backend/
│   ├── server.js              # Express application server and middleware setup
│   ├── db.js                  # SQLite connection helper with serverless /tmp auto-sync & helpdesk schema
│   ├── seed.js                # Database master seeding script
│   ├── seed_helpdesk.js       # Idempotent helpdesk tickets & two-way conversation seed script
│   ├── test_helpdesk_acceptance.js # Comprehensive 33-step automated role & API test suite
│   ├── tenderkart.db          # Pre-built SQLite database file
│   ├── package.json           # Backend dependencies and scripts
│   └── routes/
│       ├── users.js           # Auth routes (register, login, profile validation)
│       ├── tenders.js         # Tender CRUD and Gemini AI summarizer endpoints
│       ├── saved.js           # Contractor watchlist persistence endpoints
│       ├── inquiries.js       # Centralized Helpdesk tickets, conversation replies & role-guarded APIs
│       └── admin.js           # Protected administrative statistics & governance routes
└── images/
    └── logo.jpg               # Official TenderKart branding emblem
```

---

## 🎧 Centralized Helpdesk & Inquiry Management System

TenderKart features an enterprise-grade, role-isolated **Centralized Helpdesk and Inquiry Management Architecture**:

```text
  ┌───────────────────────────┐         ┌───────────────────────────┐
  │   Contractor Portal       │         │     Manager Portal        │
  │   (Rajesh, Amit, etc.)    │         │   (Anil, Priya, etc.)     │
  └─────────────┬─────────────┘         └─────────────┬─────────────┘
                │                                     │
                │  1. Submit Shared Helpdesk Inquiry  │
                └──────────────────┬──────────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │    POST /api/inquiries              │
                │    Auto-Assigned to 'admin'         │
                └──────────────────┬──────────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │   🛡️ Central Administrator Queue    │
                │   (admin / Admin@1001)              │
                │   - Full Inquiries Triage           │
                │   - Priority & Status Transition    │
                │   - Two-Way Threaded Replies        │
                └──────────────────┬──────────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
  ┌───────────────────────────┐         ┌───────────────────────────┐
  │ Contractor "My Tickets"   │         │ Manager "My Tickets"      │
  │ - Isolated to Owner       │         │ - Isolated to Owner       │
  │ - Reply & Reopen Support  │         │ - Reply & Reopen Support  │
  └───────────────────────────┘         └───────────────────────────┘
```

### Key Helpdesk Features
- **Shared Inquiry Form (`contact.html`)**: Automatically identifies authenticated user profile, locks sender role, prefills company/department, provides 9 official inquiry classifications, supports optional tender linkage and phone number.
- **Strict Role Isolation**: Contractors only view their own tickets. Managers only view their own tickets (ordinary managers do NOT have access to the central admin queue). Only the central `admin` user has access to the full queue, status transitions, and priority controls.
- **Chronological Threaded Conversations**: Every ticket supports bidirectional replies. The original message and all follow-up replies are preserved in chronological order with audit timestamps.
- **Reopen Workflow**: Senders can reopen resolved tickets if further clarification is required.

### Helpdesk API Endpoints
- `POST /api/inquiries` — Create a new inquiry (Authenticated Contractor or Manager).
- `GET /api/inquiries/mine` — Retrieve authenticated user's own tickets and metric summary.
- `GET /api/inquiries/:id` — View ticket details and full conversation history (Owner or Admin only; 403 Forbidden otherwise).
- `POST /api/inquiries/:id/messages` — Dispatch follow-up reply message (Owner or Admin only).
- `PATCH /api/inquiries/:id/reopen` — Reopen a resolved ticket (Owner or Admin only).
- `GET /api/inquiries/admin/all` — Retrieve centralized helpdesk queue with multi-parameter filtering (Strictly `admin` role).
- `PATCH /api/inquiries/admin/:id` — Update ticket priority and status (Strictly `admin` role).
- `POST /api/inquiries/admin/:id/reply` — Send admin response with automatic status adjustment (Strictly `admin` role).

---

## 🧪 Local Setup & Verification

### Prerequisites
- Node.js v18.x or later
- npm v9.x or later

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/shreyansh-sinha-1509s/TenderKart.git
cd TenderKart

# 2. Install backend dependencies
cd backend
npm install

# 3. Seed the SQLite database (Tenders, Realistic Users, Applications, and Helpdesk Tickets)
node seed.js

# 4. Run automated acceptance test suite (33 assertions verifying role security & helpdesk flows)
node test_helpdesk_acceptance.js

# 5. Start the Express server
npm start
# or with nodemon for live development:
npm run dev
```

Access the application in your browser:
- **Homepage:** [http://localhost:5000/](http://localhost:5000/)
- **Shared Helpdesk:** [http://localhost:5000/contact.html](http://localhost:5000/contact.html)
- **Contractor Dashboard:** [http://localhost:5000/dashboard.html](http://localhost:5000/dashboard.html)
- **Manager & Admin Portal:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## 🔑 Realistic Demo Accounts & Testing Credentials

The SQLite database is pre-seeded with dedicated accounts across all three platform roles:

### 🛡️ Central Website Administrator (Helpdesk Queue Master)

| User ID / Login | Role | Name | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`admin`** (`ADM1001`) | **`admin`** | Main Website Admin | `admin@demo.tenderkart.in` | `Admin@1001` | **Full Governance & Centralized Helpdesk Queue Access** |

### 🏛️ Municipal & Departmental Manager Accounts (Can Submit & Track Inquiries)

| User ID | Manager Name | Department | Password |
| :--- | :--- | :--- | :--- |
| **`MGR2001`** | Anil Joshi | Public Works Department (PWD) | `Manager@2001` |
| **`MGR2002`** | Priya Nair | Urban Development Department | `Manager@2002` |
| **`MGR2003`** | Rohan Shah | Municipal Infrastructure | `Manager@2003` |
| **`MGR2004`** | Kavita Rao | Water Supply Department | `Manager@2004` |
| **`MGR2005`** | Manoj Verma | Metro Rail Infrastructure | `Manager@2005` |
| **`MGR2006`** | Sneha Iyer | Smart City Development | `Manager@2006` |

### 👷 Contractor Accounts (Can Submit & Track Inquiries)

| User ID | Contractor Name & Company | Password | Application Pattern | Win Rate |
| :--- | :--- | :--- | :--- | :--- |
| **`CON1001`** | Rajesh Mehta (Mehta Infrastructure Works) | `Contractor@1001` | **High Activity** (10 bids: 4 Won, 3 Lost, 2 Pending, 1 Withdrawn) | **57.1%** |
| **`CON1002`** | Amit Kulkarni (Kulkarni Civil Projects) | `Contractor@1002` | **Moderate Performance** (7 bids: 2 Won, 3 Lost, 2 Pending) | **40.0%** |
| **`CON1003`** | Suresh Patil (Patil Road & Bridge Contractors) | `Contractor@1003` | **Specialized Contractor** (5 bids: 2 Won, 2 Lost, 1 Pending) | **50.0%** |
| **`CON1004`** | Neeraj Sharma (Sharma Urban Construction) | `Contractor@1004` | **Improving Contractor** (6 bids: 1 Won, 3 Lost, 2 Pending) | **25.0%** |
| **`CON1005`** | Vikram Desai (Desai Infrastructure Solutions) | `Contractor@1005` | **Zero History** (0 applications — tests empty state) | *N/A (Empty)* |
| **`CON1006`** | Arvind Patel (Patel Earthmovers & Infra) | `Contractor@1006` | **Strong Performance** (8 bids: 4 Won, 2 Lost, 2 Pending) | **66.7%** |
| **`CON1007`** | Deepak Verma (Verma Metro & Tunneling) | `Contractor@1007` | **Inconsistent / Complex** (5 bids: 1 Won, 3 Lost, 1 Pending) | **25.0%** |
| **`CON1008`** | Ananya Sen (Sen Urban Engineering) | `Contractor@1008` | **Moderate Performance** (7 bids: 2 Won, 3 Lost, 2 Pending) | **40.0%** |
| **`CON1009`** | Tarun Aggarwal (Aggarwal Smart Utilities) | `Contractor@1009` | **New Contractor** (2 bids: 0 Won, 0 Lost, 2 Pending) | *N/A (Pending)* |
| **`CON1010`** | Pooja Hegde (Hegde Water Works & Pipelines) | `Contractor@1010` | **Only Pending** (3 bids: 0 Won, 0 Lost, 3 Pending) | *N/A (Pending)* |

---

### 🎫 Seeded Demo Helpdesk Tickets

The database is pre-seeded with 5 realistic demo tickets spanning both contractor and manager personas:

| Ticket ID | Sender Role & Name | Category | Subject | Status | Admin Reply |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TKT-2026-001`** | **Contractor** (Rajesh Mehta) | Technical / Platform Support | Unable to save a bridge tender | **In Progress** | Recorded issue; investigating saved-tender function. |
| **`TKT-2026-002`** | **Contractor** (Amit Kulkarni) | Tender Information / NIT Clarification | Clarification about a road project deadline | **Awaiting User Response** | Requested tender ID and document deadline. |
| **`TKT-2026-003`** | **Manager** (Anil Joshi - PWD) | Data Correction | Incorrect water supply tender information | **In Progress** | Acknowledged report; requested source values. |
| **`TKT-2026-004`** | **Manager** (Priya Nair - UDD) | Manager Dashboard / Tender Management | Tender status not updating correctly | **Resolved** | Fixed deadline calculation; ready for reopen if needed. |
| **`TKT-2026-005`** | **Contractor** (Suresh Patil) | AI Tender Summary Feedback | Tender summary is missing an important requirement | **New** | *Awaiting Admin response* |

---

## ⚙️ Environment Variables (Optional)

To enable live Google Gemini 1.5 Flash AI summarization (instead of the automatic built-in offline summarizer):

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
JWT_SECRET=your_custom_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🏆 Project Impact & GovTech Mission

- **Transparency in Public Procurement**: Making municipal infrastructure tenders easily discoverable by contractors of all tiers.
- **AI-Accelerated Compliance**: Reducing NIT parsing time from days to seconds, allowing faster bidding cycles.
- **Zero Disqualification Goal**: Ensuring contractors never submit non-compliant bids by enforcing interactive document verification before application.
