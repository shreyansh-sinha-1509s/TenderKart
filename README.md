# TenderKart - Urban Infrastructure Opportunities Tracker

A centralized GovTech platform helping contractors, suppliers, and municipal departments discover and manage active urban infrastructure tenders (roads, bridges, water supply, metro, smart city, etc.).

This project is built using a traditional, student-friendly Node.js + Express + SQLite stack, featuring a clean HTML5/CSS3/Vanilla JS frontend on the same port.

## Technology Stack
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (Vanilla ES6)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (managed with standard `sqlite3` driver)
- **Authentication**: JWT (JSON Web Tokens) stored in localStorage and checked via headers
- **AI digest**: Gemini API call (optional) with automatic smart local summary fallback

## Folder Structure
```
TenderKart/
  backend/
    routes/
      users.js
      tenders.js
      saved.js
      admin.js
    db.js
    server.js
    seed.js
    tenderkart.db
    package.json
  images/
    logo.jpg
  index.html
  login.html
  register.html
  dashboard.html
  tenders.html
  tenderDetails.html
  admin.html
  about.html
  contact.html
  style.css
  app.js
  README.md
```

## Running Locally

1. **Navigate to the backend directory and install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Seed the database**:
   ```bash
   node seed.js
   ```
   This will initialize `tenderkart.db` and insert:
   - 15 realistic tenders spanning 8 categories
   - Default Administrator Account: `admin` (password: `admin123`)
   - Default Contractor Account: `contractor` (password: `contractor123`)

3. **Start the Express server**:
   ```bash
   npm start
   # or for hot reloading:
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:5000](http://localhost:5000) in your web browser.
