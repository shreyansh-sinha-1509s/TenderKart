// backend/constants.js
// Canonical TenderKart domain constants (Two-Role Architecture: Central Admin & Contractor)

const ROLES = {
  ADMIN: "admin",
  CONTRACTOR: "contractor"
};

const ALLOWED_CATEGORIES = [
  "Roads",
  "Bridges",
  "Water Supply",
  "Buildings",
  "Metro Projects",
  "Smart City"
];

const TENDER_STATUSES = ["Open", "Closing Soon", "Closed"];

const CONTRACTOR_APPLICATION_STATUSES = ["Submitted", "Under Review", "Won", "Lost"];

const ALL_APPLICATION_STATUSES = [
  "Submitted",
  "Under Review",
  "Won",
  "Lost",
  "Not Awarded",
  "Rejected",
  "Withdrawn"
];

function getLocalDateStr(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidDateStr(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    !isNaN(dt.getTime()) &&
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isValidHttpUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function computeStatusFromDeadline(deadlineStr) {
  if (!isValidDateStr(deadlineStr)) return "Open";
  const todayStr = getLocalDateStr();
  if (deadlineStr < todayStr) return "Closed";

  const [dy, dm, dd] = deadlineStr.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const deadlineUtc = Date.UTC(dy, dm - 1, dd);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((deadlineUtc - todayUtc) / (1000 * 60 * 60 * 24));
  return diffDays <= 7 ? "Closing Soon" : "Open";
}

function computeEffectiveTenderStatus(deadlineStr, dbStatus) {
  const explicit = (dbStatus || "").trim();
  if (explicit === "Closed") return "Closed";
  return computeStatusFromDeadline(deadlineStr);
}

function mapApplicationOutcome(status) {
  const clean = (status || "").trim();
  if (clean === "Won") return "Won";
  if (["Lost", "Not Awarded", "Rejected", "Withdrawn"].includes(clean)) return clean;
  return "Pending";
}

function summarizeApplications(rows = []) {
  const stats = {
    total: rows.length,
    submitted: 0,
    underReview: 0,
    won: 0,
    lost: 0,
    notAwarded: 0,
    pending: 0,
    withdrawn: 0
  };
  for (const row of rows) {
    const st = (row.application_status || "").trim();
    const out = (row.outcome || "").trim();
    if (st === "Won" || out === "Won") {
      stats.won++;
    } else if (
      ["Lost", "Not Awarded", "Rejected"].includes(st) ||
      ["Lost", "Not Awarded", "Rejected"].includes(out)
    ) {
      stats.lost++;
      stats.notAwarded++;
    } else if (st === "Withdrawn" || out === "Withdrawn") {
      stats.withdrawn++;
    } else {
      stats.pending++;
      if (st === "Under Review") stats.underReview++;
      else stats.submitted++;
    }
  }
  return stats;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

function normalizeLocationText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[\u2012-\u2015\u2212\-/,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STATE_ABBR_EXACT = {
  mh: "Maharashtra",
  gj: "Gujarat",
  mp: "Madhya Pradesh",
  dl: "Delhi",
  up: "Uttar Pradesh",
  pb: "Punjab",
  hr: "Haryana",
  as: "Assam",
  wb: "West Bengal",
  ka: "Karnataka",
  rj: "Rajasthan",
  tn: "Tamil Nadu"
};

function findExactState(token) {
  if (!token || typeof token !== "string") return "";
  const cleaned = normalizeLocationText(token);
  if (!cleaned) return "";
  if (STATE_ABBR_EXACT[cleaned]) return STATE_ABBR_EXACT[cleaned];
  const matched = INDIAN_STATES.find((s) => normalizeLocationText(s) === cleaned);
  return matched || "";
}

function parseLocationFilter(rawLocation) {
  const localityTerms = [];
  const stateTokens = [];
  if (!rawLocation || typeof rawLocation !== "string") {
    return { localityTerms, stateTokens };
  }

  const segments = rawLocation
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    const exactSt = findExactState(seg);
    if (exactSt) {
      if (!stateTokens.includes(exactSt)) stateTokens.push(exactSt);
      continue;
    }

    let norm = normalizeLocationText(seg);
    if (!norm) continue;

    // Also handle "Ratnagiri Maharashtra" typed without a comma
    // while keeping "New Delhi" / "Central Delhi" intact as specific localities.
    let extractedState = "";
    for (const s of INDIAN_STATES) {
      const sNorm = normalizeLocationText(s);
      if (sNorm !== "delhi" && norm.endsWith(` ${sNorm}`)) {
        const prefix = norm.slice(0, norm.length - sNorm.length - 1).trim();
        if (prefix) {
          norm = prefix;
          extractedState = s;
          break;
        }
      }
    }
    if (extractedState && !stateTokens.includes(extractedState)) {
      stateTokens.push(extractedState);
    }
    if (norm && !localityTerms.includes(norm)) {
      localityTerms.push(norm);
    }
  }

  return { localityTerms, stateTokens };
}

function normalizeState(input) {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.trim().toLowerCase();
  const abbr = {
    ...STATE_ABBR_EXACT,
    "new delhi": "Delhi",
    "central delhi": "Delhi"
  };
  if (abbr[cleaned]) return abbr[cleaned];
  const matched = INDIAN_STATES.find(
    (s) => s.toLowerCase() === cleaned || cleaned.includes(s.toLowerCase())
  );
  return matched || "";
}

module.exports = {
  ROLES,
  ALLOWED_CATEGORIES,
  TENDER_STATUSES,
  CONTRACTOR_APPLICATION_STATUSES,
  ALL_APPLICATION_STATUSES,
  getLocalDateStr,
  isValidDateStr,
  isValidHttpUrl,
  computeStatusFromDeadline,
  computeEffectiveTenderStatus,
  mapApplicationOutcome,
  summarizeApplications,
  INDIAN_STATES,
  normalizeLocationText,
  parseLocationFilter,
  normalizeState
};
