const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { INDIAN_STATES } = require("../constants");
const { JWT_SECRET, authenticateUser } = require("../middleware/auth");

// 0. Public list of Indian States & UTs (for Admin tender forms and browse filters)
router.get("/states", (req, res) => {
  return res.json({ states: INDIAN_STATES });
});

// 1. Public User Registration (Contractor ONLY; Admin & Manager registration disabled)
router.post("/register", async (req, res) => {
  try {
    const {
      accountType,
      role,
      company,
      name,
      username,
      email,
      password,
      confirmPassword
    } = req.body;

    const requestedRole = (accountType || role || "contractor").trim().toLowerCase();

    if (requestedRole === "admin") {
      return res.status(403).json({
        message: "Central Admin registration is restricted and cannot be performed publicly."
      });
    }

    if (requestedRole !== "contractor") {
      return res.status(400).json({
        message: "Public registration is available for Contractor accounts only."
      });
    }

    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanUsername = (username || "").trim();
    const cleanCompany = (company || "").trim();

    if (!cleanName || !cleanEmail || !cleanUsername || !cleanCompany || !password) {
      return res.status(400).json({
        message: "Company Name, Full Name, Email, Username, and Password are required."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    if (cleanUsername.length < 3 || /\s/.test(cleanUsername)) {
      return res.status(400).json({ message: "Username must be at least 3 characters without spaces." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Password and Confirm Password do not match." });
    }

    const dupRows = await db.queryAsync(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
      [cleanUsername, cleanEmail]
    );
    if (dupRows.length > 0) {
      return res.status(409).json({ message: "An account with this username or email already exists." });
    }

    const maxIdRow = await db.getAsync("SELECT MAX(id) AS maxId FROM users");
    const nextNum = 1001 + (maxIdRow && maxIdRow.maxId ? maxIdRow.maxId : 0);
    const userCode = `CON${nextNum}`;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertRes = await db.queryAsync(
      `INSERT INTO users (username, user_code, name, company, department, email, password, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, 'contractor', 1, datetime('now'), datetime('now'))`,
      [cleanUsername, userCode, cleanName, cleanCompany, cleanEmail, hashedPassword]
    );

    const userId = insertRes.insertId;
    const token = jwt.sign(
      { id: userId, username: cleanUsername, role: "contractor", name: cleanName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: userId,
        username: cleanUsername,
        user_code: userCode,
        name: cleanName,
        company: cleanCompany,
        email: cleanEmail,
        role: "contractor",
        is_active: 1
      },
      message: "Contractor registration successful!"
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: err.message || "Registration failed." });
  }
});

// 2. User Login (Central Admin & Contractor only)
router.post("/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: "Please enter your email/username and password." });
    }

    const identifier = usernameOrEmail.trim();
    const user = await db.getAsync(
      `SELECT id, username, email, password, role, name, company, department, is_active, user_code, created_at
       FROM users
       WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(user_code) = LOWER(?)
       LIMIT 1`,
      [identifier, identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ message: "Incorrect username, email, or password." });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect username, email, or password." });
    }

    const role = (user.role || "contractor").toLowerCase();
    if (role !== "admin" && role !== "contractor") {
      return res.status(403).json({
        code: "ROLE_REMOVED",
        message: "This account role is no longer active."
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        code: "DEACTIVATED",
        message: "Your account is currently deactivated."
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
        name: user.name,
        company: user.company,
        department: user.department,
        is_active: user.is_active,
        user_code: user.user_code
      },
      message: "Login successful"
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: err.message || "Login failed." });
  }
});

// 3. Get Active User Profile
router.get("/me", authenticateUser, (req, res) => {
  return res.json(req.user);
});

module.exports = router;
