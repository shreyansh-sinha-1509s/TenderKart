const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { INDIAN_STATES, normalizeState } = require("../constants");
const { JWT_SECRET, authenticateUser } = require("../middleware/auth");

// 0. Public list of Indian States & UTs for registration and filtering
router.get("/states", (req, res) => {
  return res.json({ states: INDIAN_STATES });
});

// 1. User Registration (Contractor or State Manager ONLY; Admin registration is blocked)
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
      confirmPassword,
      office_state
    } = req.body;

    const requestedRole = (accountType || role || "contractor").trim().toLowerCase();

    if (requestedRole === "admin") {
      return res.status(403).json({ message: "Central Admin registration is restricted and cannot be performed publicly." });
    }

    if (requestedRole !== "contractor" && requestedRole !== "manager") {
      return res.status(400).json({ message: "Invalid account type. Must be Contractor or Manager." });
    }

    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanUsername = (username || "").trim();
    const cleanCompany = (company || "").trim();
    const cleanState = normalizeState(office_state || "");

    if (!cleanName || !cleanEmail || !cleanUsername || !password) {
      return res.status(400).json({ message: "All required fields must be filled in." });
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

    if (requestedRole === "contractor" && !cleanCompany) {
      return res.status(400).json({ message: "Company Name is required for contractor registration." });
    }

    if (requestedRole === "manager") {
      if (!cleanState || !INDIAN_STATES.includes(cleanState)) {
        return res.status(400).json({ message: "Please select a valid Indian Office State." });
      }
    }

    // Prevent duplicate usernames or emails (case-insensitive)
    const dupRows = await db.queryAsync(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1",
      [cleanUsername, cleanEmail]
    );

    if (dupRows.length > 0) {
      return res.status(409).json({ message: "Username or email address is already registered." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Generate deterministic unique user_code
    const countRow = await db.getAsync(
      "SELECT COUNT(*) AS count FROM users WHERE LOWER(role) = ?",
      [requestedRole]
    );
    const seq = (countRow ? countRow.count : 0) + 1;
    const prefix = requestedRole === "manager" ? "MGR" : "CON";
    const baseNum = requestedRole === "manager" ? 2000 : 1000;
    const userCode = `${prefix}${baseNum + seq}_${Date.now().toString().slice(-3)}`.slice(0, 12);

    if (requestedRole === "contractor") {
      const insertRes = await db.queryAsync(
        `INSERT INTO users (username, user_code, name, company, department, office_state, email, password, role, approval_status, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 'contractor', 'Approved', 1, datetime('now'), datetime('now'))`,
        [cleanUsername, `${prefix}${baseNum + seq}`, cleanName, cleanCompany, cleanEmail, hashedPassword]
      );

      const userId = insertRes.insertId;
      const token = jwt.sign(
        { id: userId, username: cleanUsername, role: "contractor", name: cleanName },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      await db.queryAsync(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [userId, "Welcome to TenderKart!", "Explore active urban infrastructure tenders across India and track your applications."]
      );

      db.logActivity({
        actor_user_id: userId,
        actor_role: "contractor",
        action_type: "contractor_registered",
        entity_type: "user",
        entity_id: userId,
        details: `Contractor "${cleanName}" (${cleanCompany}) registered.`
      });

      return res.status(201).json({
        token,
        user: {
          id: userId,
          username: cleanUsername,
          user_code: `${prefix}${baseNum + seq}`,
          name: cleanName,
          company: cleanCompany,
          email: cleanEmail,
          role: "contractor",
          office_state: null,
          approval_status: "Approved",
          is_active: 1
        },
        message: "Contractor registration successful!"
      });
    } else {
      // Manager registration -> Pending Central Admin approval
      const dept = `${cleanState} Procurement Division`;
      const insertRes = await db.queryAsync(
        `INSERT INTO users (username, user_code, name, company, department, office_state, email, password, role, approval_status, is_active, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'manager', 'Pending', 1, datetime('now'), datetime('now'))`,
        [cleanUsername, userCode, cleanName, dept, cleanState, cleanEmail, hashedPassword]
      );

      const userId = insertRes.insertId;

      // Notify Central Admin of new pending manager registration
      const adminUser = await db.getAsync("SELECT id FROM users WHERE LOWER(role) = 'admin' LIMIT 1");
      if (adminUser) {
        await db.queryAsync(
          "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
          [
            adminUser.id,
            "New State Manager Registration Pending",
            `${cleanName} (${cleanUsername}) registered as Manager for ${cleanState} and awaits your approval.`
          ]
        );
      }

      db.logActivity({
        actor_user_id: userId,
        actor_role: "manager",
        action_type: "manager_registered",
        entity_type: "user",
        entity_id: userId,
        state: cleanState,
        details: `Manager "${cleanName}" registered for ${cleanState} (Pending Approval).`
      });

      return res.status(201).json({
        pendingApproval: true,
        user: {
          id: userId,
          username: cleanUsername,
          name: cleanName,
          email: cleanEmail,
          role: "manager",
          office_state: cleanState,
          approval_status: "Pending",
          is_active: 1
        },
        message: `Manager registration submitted for ${cleanState}. Your account is pending Central Admin approval before you can sign in.`
      });
    }
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: err.message || "Registration failed." });
  }
});

// 2. User Login (Automatic role identification from DB)
router.post("/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: "Please enter your email/username and password." });
    }

    const identifier = usernameOrEmail.trim();
    const user = await db.getAsync(
      `SELECT id, username, email, password, role, name, company, department, office_state,
              approval_status, is_active, user_code, created_at
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

    if (role === "manager") {
      if (user.approval_status === "Pending") {
        return res.status(403).json({
          code: "PENDING_APPROVAL",
          message: "Your manager account is currently pending Central Admin approval. Please wait for approval before accessing your state dashboard."
        });
      }
      if (user.approval_status === "Rejected") {
        return res.status(403).json({
          code: "REJECTED",
          message: "Your manager registration was rejected by Central Admin."
        });
      }
      if (!user.is_active) {
        return res.status(403).json({
          code: "DEACTIVATED",
          message: "Your manager account has been deactivated by Central Admin."
        });
      }
    } else if (!user.is_active) {
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
        office_state: user.office_state,
        approval_status: user.approval_status,
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

// 4. Get Notifications
router.get("/notifications", authenticateUser, (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC",
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      return res.json(results);
    }
  );
});

// 5. Mark Notification as Read
router.put("/notifications/:id/read", authenticateUser, (req, res) => {
  db.query(
    "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      return res.json({ message: "Notification marked as read" });
    }
  );
});

// 6. Search history compatibility routes
router.get("/searches", authenticateUser, (req, res) => res.json([]));
router.post("/searches", authenticateUser, (req, res) => res.json({ message: "Search saved locally" }));
router.delete("/searches", authenticateUser, (req, res) => res.json({ message: "Search history cleared" }));

module.exports = router;
