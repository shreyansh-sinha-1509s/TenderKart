require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/tenders", require("./routes/tenders"));
app.use("/api/saved", require("./routes/saved"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/inquiries", require("./routes/inquiries"));

// Gracefully redirect obsolete analytics page requests to homepage
app.get(["/analytics.html", "/analytics"], (req, res) => {
  res.redirect(301, "/");
});

// Serve static frontend files from the root directory
app.use(express.static(path.join(__dirname, "..")));

// Base route serves index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Fallback for missing frontend pages to avoid raw 404 error screens
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  res.redirect("/");
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TenderKart server running on port ${PORT}`);
  });
}

module.exports = app;
