// backend/middleware/auth.js
// Centralized JWT verification and fresh DB role/state authorization middleware

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
      `SELECT id, username, email, role, name, company, department, office_state,
              approval_status, is_active, user_code, created_at
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

        if (role === "manager") {
          if (user.approval_status === "Pending") {
            return res.status(403).json({
              code: "PENDING_APPROVAL",
              message: "Your manager account is pending Central Admin approval."
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
      if (req.user.role === "manager" && !req.user.office_state) {
        return res.status(403).json({
          message: "Manager account does not have an assigned office state."
        });
      }
      next();
    });
  };
}

const requireAdmin = requireRole("admin");
const requireManager = requireRole("manager");
const requireContractor = requireRole("contractor");
const requireManagerOrAdmin = requireRole("admin", "manager");

module.exports = {
  JWT_SECRET,
  authenticateUser,
  requireRole,
  requireAdmin,
  requireManager,
  requireContractor,
  requireManagerOrAdmin
};

