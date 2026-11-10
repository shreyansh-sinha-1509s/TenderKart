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
> **12-Tender Role-Based Platform & Persistence Note**: TenderKart ships with a curated **12-tender demonstration dataset** across 6 sectors (`Roads: 3`, `Bridges: 3`, `Water Supply: 2`, `Buildings: 2`, `Metro Projects: 1`, `Smart City: 1`) and a 3-tier Role-Based Architecture (`Central Admin`, `State-wise Manager`, `Contractor`). When running locally (`node backend/server.js`), SQLite (`backend/tenderkart.db`) provides full persistence; on serverless platforms like Vercel, `/tmp` SQLite is ephemeral per container instance unless connected to a persistent remote database.

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

### 06 — Central Governance & State-wise Management
- **Central Admin (`admin.html`)**: Nationwide supervision of all 12 tenders, state & category analytics, contractor activity, inquiry tracking (including unassigned queues), and manager registration approvals/deactivations.
- **State-wise Managers (`manager.html`)**: Dedicated portal scoped strictly to the manager's assigned Indian state for updating state tenders, evaluating state applications, and replying to state-routed contractor inquiries.

---

## 🛡️ AI & System Architecture

TenderKart is structured with clear separation of concerns between client presentation, role- and state-guarded REST APIs, AI diagnostics, and data storage:

```text
  ┌──────────────────────────────────────────────────────────┐
  │                 Frontend (HTML / CSS / JS)               │
  │  • Homepage & Hero Showcase (index.html)                 │
  │  • Tenders Search & State/Category Filter (tenders.html) │
  │  • Tender Deep-Dive & Checklist (tenderDetails.html)     │
  │  • Contractor Dashboard (dashboard.html)                 │
  │  • State Manager Portal (manager.html)                   │
  │  • Central Admin Console (admin.html)                    │
  │  • Role Registration & Manual Login (register/login.html)│
  │  • Public Info & Contractor Inquiry Form (contact.html)  │
  └────────────────────────────┬─────────────────────────────┘
                               │ HTTPS / REST API
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │              Backend API Server (Node.js/Express)        │
  │  • Auth & JWT/Role Middleware (middleware/auth.js)       │
  │  • Users & Manager Approval State (/api/users)           │
  │  • Tenders Querying, Views & AI Summary (/api/tenders)   │
  │  • Contractor Saved & Applications (/api/saved, /apps)   │
  │  • State-Scoped Manager APIs (/api/manager)              │
  │  • Central Admin Monitoring & Approvals (/api/admin)     │
  │  • State-Routed Inquiries (/api/inquiries)               │
  └──────────────┬────────────────────────────┬──────────────┘
                 │                            │
                 ▼                            ▼
  ┌──────────────────────────┐ ┌─────────────────────────────┐
  │   AI Intelligence Engine │ │    Relational Data Layer    │
  │  • Gemini 1.5 Flash API  │ │  • SQLite (tenderkart.db)   │
  │  • Local Rule-Based      │ │  • Strict 12-tender trigger │
  │    Fallback Summarizer   │ │  • Activity telemetry log   │
  └──────────────────────────┘ └─────────────────────────────┘
```

---

## 🏛️ Active Demonstration Dataset (Strictly 12 Tenders)

| Category | Count | Typical Scope | Key Authorities |
| :--- | :---: | :--- | :--- |
| **Roads** | 3 | National highways, expressway widening | NHAI, State PWDs |
| **Bridges** | 3 | River crossings, flyovers, ROBs | PWD, MMRDA, State Bridges |
| **Water Supply** | 2 | 24x7 urban water supply grids, WTPs | DJB, UP Jal Nigam |
| **Buildings** | 2 | Civic hubs, educational & institutional buildings | Haryana PWD, R&B Gujarat |
| **Metro Projects** | 1 | Elevated corridor & depot infrastructure | DMRC |
| **Smart City** | 1 | Integrated urban surveillance & command centers | Smart Cities Mission |

---

## 🔗 Portals & API Endpoints

| Resource | URL / Endpoint | Method | Access Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Home & Explorer** | `/index.html`, `/tenders.html` | `GET` | Public | Landing showcase, search, and state/category filtering |
| **Contact / Inquiries** | `/contact.html` | `GET` | Public / Contractor | Public info + compact inquiry form for authenticated contractors |
| **Auth Portals** | `/login.html`, `/register.html` | `GET` | Public | Manual credential login & Contractor / Manager registration |
| **Contractor Dashboard** | `/dashboard.html` | `GET` | Contractor | Saved tenders, submitted applications, outcomes & inquiries |
| **State Manager Portal** | `/manager.html` | `GET` | Approved Manager | Assigned-state tenders, inquiry responses, application reviews |
| **Central Admin Console** | `/admin.html` | `GET` | Central Admin | Nationwide stats, manager approvals, inquiry & activity monitoring |
| **Auth APIs** | `/api/users/*` | `GET/POST` | Public / Auth | States list, role registration, manual login, notifications |
| **Tenders & Summary** | `/api/tenders`, `/api/tenders/:id/summarize` | `GET/POST` | Public | Filter by state/category/location/budget/deadline, views & AI digest |
| **Contractor APIs** | `/api/saved/*`, `/api/applications/*`, `/api/inquiries` | `GET/POST/PUT` | Contractor | Watchlist, bidding workflow, auto-routed tender inquiries |
| **Manager APIs** | `/api/manager/*` | `GET/POST/PUT/PATCH` | Approved Manager | Strictly scoped to `req.user.office_state` & 12-tender cap |
| **Admin APIs** | `/api/admin/*` | `GET/POST/PATCH` | Central Admin | Nationwide DB metrics, manager approvals & state overrides |

---

## 📁 Repository Structure

```text
TenderKart/
├── index.html                   # Landing page with showcase & quick search
├── tenders.html                 # Tenders explorer with state/category/budget filters
├── tenderDetails.html           # Detailed tender view with AI summarizer & checklist
├── dashboard.html               # Contractor dashboard (apps, saved tenders, inquiries)
├── manager.html                 # State-wise Manager operational dashboard
├── admin.html                   # Central Admin nationwide monitoring & approvals console
├── login.html                   # Manual credential login with role-based redirection
├── register.html                # Dual Contractor / State-wise Manager registration
├── contact.html                 # Public info/FAQs + Contractor-only compact inquiry form
├── about.html                   # Platform mission & 6-category governance overview
├── app.js                       # Frontend application adapter & UI controllers
├── style.css                    # Design system (tokens, themes, responsive grids)
├── vercel.json                  # Vercel routing & serverless API rewrites
├── package.json                 # Root manifest for full-stack runtime
├── api/
│   └── index.js                 # Vercel serverless entrypoint exporting Express app
└── backend/
    ├── server.js                # Express server & API router mounting
    ├── constants.js             # Canonical roles, 6 categories, inquiry categories, states
    ├── db.js                    # SQLite connection, schema migrations, 12-tender trigger
    ├── migrate_role_system.js   # Idempotent transition to 12-tender & role/state schema
    ├── test_role_system.js      # Automated 12-group (16-check) role & isolation suite
    ├── middleware/auth.js       # JWT authentication + live role/approval/state checks
    └── routes/
        ├── users.js             # Contractor & pending Manager registration, manual login
        ├── tenders.js           # Filtering, view tracking, AI/local tender summarization
        ├── saved.js             # Contractor saved tenders
        ├── applications.js      # Application workflow & state isolation
        ├── inquiries.js         # Automatic state-based inquiry routing & threads
        ├── manager.js           # State-scoped tender edits, inquiry replies, bid evaluation
        └── admin.js             # Central Admin analytics, manager approvals & supervision
```

---

## 🎧 Automatic State-Based Inquiry Routing

When an authenticated contractor submits an inquiry via `contact.html` (`POST /api/inquiries`):
1. The system resolves the selected tender's `state` from the database.
2. It looks up an approved, active **State Manager** assigned to that `office_state`.
3. If found, the inquiry is automatically assigned (`Assigned`) to that manager and surfaced in `manager.html`.
4. If no approved manager exists for that state, it is retained as `Unassigned / Pending Admin Assignment` and surfaced on `admin.html` for Central Admin triage.

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

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Run the automated verification suite (12 tenders, role isolation & routing)
node backend/test_role_system.js

# 4. Start the Express server
npm start
```

Access locally:
- **Homepage:** `http://localhost:5000/`
- **Login:** `http://localhost:5000/login.html`
- **Register:** `http://localhost:5000/register.html`
- **Contractor Dashboard:** `http://localhost:5000/dashboard.html`
- **State Manager Portal:** `http://localhost:5000/manager.html`
- **Central Admin Console:** `http://localhost:5000/admin.html`

---

## ⚙️ Environment Variables

Set these variables in `.env` locally (never commit `.env` to version control) and in your deployment environment:

```env
PORT=5000
JWT_SECRET=your_strong_random_jwt_secret
GEMINI_API_KEY=your_optional_gemini_api_key
```

> [!WARNING]  
> **Production Database Persistence Notice**: `backend/tenderkart.db` uses file-based SQLite (`sqlite3`). On serverless platforms like Vercel where `/tmp` is ephemeral and isolated per container instance, runtime mutations (registrations, manager approvals, tender edits, inquiries, applications) will not persist reliably across cold starts or multiple serverless instances unless backed by an external persistent database service.

---

## 🏆 Project Impact & GovTech Mission

- **Transparency in Public Procurement**: Making municipal infrastructure tenders easily discoverable by contractors of all tiers.
- **AI-Accelerated Compliance**: Reducing NIT parsing time from days to seconds, allowing faster bidding cycles.
- **Zero Disqualification Goal**: Ensuring contractors never submit non-compliant bids by enforcing interactive document verification before application.
