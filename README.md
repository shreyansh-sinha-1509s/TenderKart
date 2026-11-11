# 🏛️ TenderKart — Infrastructure Tender Discovery & Application Tracker

**TenderKart** is a streamlined web platform for discovering urban infrastructure tenders across India, reviewing AI-assisted tender summaries, bookmarking opportunities, and recording bid applications submitted through official government portals.

> [!NOTE]  
> **Two-Role Architecture**: TenderKart operates with exactly **two user roles** — **Central Admin** (`admin`) and **Contractor** (`contractor`). Actual bid submission, document verification, and procurement decisions take place on external official government tender portals.

---

## 🎯 Core Features

### 1. Central Admin Dashboard (`admin.html`)
- **Manage Tenders**: Add new tenders, edit existing tender information, close tenders, reopen closed tenders (with valid future deadlines), remove tenders with confirmation, and search/filter the tender catalog.
- **Tender Distribution by Category – Pie Chart**: Live Chart.js pie chart + total tender count calculated directly from SQLite across the six permitted categories:
  - **Roads** (`3` initial)
  - **Bridges** (`3` initial)
  - **Water Supply** (`2` initial)
  - **Buildings** (`2` initial)
  - **Metro Projects** (`1` initial)
  - **Smart City** (`1` initial)

### 2. Contractor Workspace (`dashboard.html`, `tenders.html`, `tenderDetails.html`, `saved.html`)
- **Browse Tenders (`tenders.html`)**: Search by title, location, state, or Tender ID and filter by Category, State, and Status (`Open`, `Closing Soon`, `Closed`).
- **AI Tender Summary (`tenderDetails.html`)**: Uses Google Gemini (`GEMINI_API_KEY`, when configured) with a factual source-grounded local fallback summarizer to extract budget, deadline, eligibility, and key scope points without inventing missing details.
- **Saved Tenders (`saved.html`)**: Bookmark/unbookmark tenders isolated per contractor account.
- **My Applications (`dashboard.html`)**: `+ Add Application` form to log external portal submissions (tender, submission date, portal name, reference number, status `Submitted` / `Under Review` / `Won` / `Lost`, optional bid amount and notes), edit status updates, and view personal dashboard statistics.

### 3. How It Works (`about.html`)
- Clear 3-step guide (*Discover opportunities* → *Understand with AI-assisted summaries* → *Visit official government portal*) with platform scope disclaimer.

---

## 📁 Repository Structure

```text
TenderKart/
├── index.html             # Homepage & quick category search
├── tenders.html           # Search & filter tender catalog
├── tenderDetails.html     # Tender specs, official portal link, AI summary & Record Application
├── saved.html             # Dedicated contractor Saved Tenders page
├── dashboard.html         # Contractor Dashboard, personal stats & My Applications history
├── admin.html             # Central Admin Tender Management & Category Pie Chart
├── about.html             # How It Works & Platform Disclaimer
├── login.html             # Email/username login with role-based redirection
├── register.html          # Contractor registration (Admin registration restricted)
├── app.js                 # Frontend application logic & navigation renderer
├── style.css              # Design tokens, dark/light themes & responsive layout
├── vercel.json            # Vercel rewrites & obsolete-route redirects
├── package.json           # Root scripts
├── api/
│   └── index.js           # Serverless Express adapter
└── backend/
    ├── server.js          # Express server serving APIs + static frontend
    ├── constants.js       # Two-role constants, categories, states, date/status helpers
    ├── db.js              # SQLite connection & schema initializer
    ├── seed.js            # Idempotent two-role database verification helper
    ├── test_role_system.js# Two-role automated verification suite
    ├── tenderkart.db      # SQLite database (1 Admin, 5 Contractors, 12 initial tenders)
    ├── middleware/auth.js # JWT authentication & Admin/Contractor role guards
    └── routes/
        ├── users.js       # Contractor registration, login, /me, /states
        ├── tenders.js     # Public tender search/filter & AI summary
        ├── saved.js       # Contractor bookmark toggle & list
        ├── applications.js# Contractor application CRUD & summary stats
        └── admin.js       # Admin tender CRUD, Close/Reopen & Category Pie Chart stats
```

---

## 🧪 Local Setup & Verification

```powershell
# 1. Install dependencies (if not already installed)
npm install
cd backend; npm install; cd ..

# 2. Run automated two-role test suite
node backend/test_role_system.js

# 3. Start backend + frontend locally
node backend/server.js
```

Local URLs:
- **Home:** `http://localhost:5000/`
- **Login:** `http://localhost:5000/login.html`
- **Register (Contractor):** `http://localhost:5000/register.html`
- **Browse Tenders:** `http://localhost:5000/tenders.html`
- **Saved Tenders:** `http://localhost:5000/saved.html`
- **Contractor Dashboard:** `http://localhost:5000/dashboard.html`
- **Central Admin Dashboard:** `http://localhost:5000/admin.html`
- **How It Works:** `http://localhost:5000/about.html`

> [!WARNING]  
> **Persistence Notice**: Locally (`node backend/server.js`), SQLite (`backend/tenderkart.db`) persists changes to disk. On serverless deployments such as Vercel where `/tmp` is ephemeral across cold instances, runtime edits are not persistent across container restarts.
