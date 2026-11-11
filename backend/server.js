require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// API Routes (Two-Role System: Central Admin & Contractor)
app.use("/api/users", require("./routes/users"));
app.use("/api/tenders", require("./routes/tenders"));
app.use("/api/saved", require("./routes/saved"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/applications", require("./routes/applications"));

// Gracefully redirect obsolete page requests to homepage
app.get(["/analytics.html", "/analytics", "/manager.html", "/contact.html"], (req, res) => {
  res.redirect(301, "/");
});

// Serve static frontend files from the root directory
app.use(express.static(path.join(__dirname, "..")));

// Base route serves index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Fallback for missing API or frontend routes
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  res.redirect("/");
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`TenderKart server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const failPortInUse = () => {
        console.error(`Port ${PORT} is already in use. Stop the existing process or set PORT to another port.`);
        process.exit(1);
      };
      const req = http.get(`http://127.0.0.1:${PORT}/api/tenders`, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          console.log(`TenderKart server is already running on http://localhost:${PORT}`);
          process.exit(0);
        }
        failPortInUse();
      });
      req.setTimeout(1000, () => {
        req.destroy();
        failPortInUse();
      });
      req.on("error", failPortInUse);
      return;
    }
    console.error("Server startup error:", err.message);
    process.exit(1);
  });
}

module.exports = app;
