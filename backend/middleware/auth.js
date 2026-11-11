// backend/middleware/auth.js
// Centralized JWT verification and fresh DB role authorization (Central Admin & Contractor)

const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "student_secret_key_12345";

function authenticateUser(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. Please login first." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded || !decoded.id) {
      return res.status(403).json({ message: "Session expired or invalid. Please login again." });
    }

    db.query(
      `SELECT id, username, email, role, name, company, department, user_code, is_active, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [decoded.id],
      (dbErr, rows) => {
        if (dbErr) {
          return res.status(500).json({ message: "Authentication lookup error." });
        }
        if (!rows || rows.length === 0) {
          return res.status(401).json({ message: "Account no longer exists. Please login again." });
        }

        const user = rows[0];
        const role = (user.role || "").toLowerCase();

        if (role !== "admin" && role !== "contractor") {
          return res.status(403).json({
            code: "ROLE_REMOVED",
            message: "This account role is no longer supported."
          });
        }

        if (!user.is_active) {
          return res.status(403).json({
            code: "DEACTIVATED",
            message: "Your account is currently inactive."
          });
        }

        req.user = {
          ...user,
          role
        };
        next();
      }
    );
  });
}

function requireRole(...allowedRoles) {
  const normalized = allowedRoles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    authenticateUser(req, res, () => {
      if (!normalized.includes(req.user.role)) {
        return res.status(403).json({
          message: "Access denied. You do not have permission to perform this action."
        });
      }
      next();
    });
  };
}

const requireAdmin = requireRole("admin");
const requireContractor = requireRole("contractor");

module.exports = {
  JWT_SECRET,
  authenticateUser,
  requireRole,
  requireAdmin,
  requireContractor
};
