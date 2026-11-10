// backend/constants.js
// Canonical TenderKart domain constants

const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
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

const INQUIRY_CATEGORIES = [
  "Tender Clarification",
  "Deadline Related",
  "Document Related",
  "Technical Issue",
  "Other"
];

const INQUIRY_STATUSES = ["Pending", "In Progress", "Resolved"];

const TENDER_STATUSES = ["Open", "Closing Soon", "Closed", "Under Evaluation", "Awarded"];

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

const MAX_DEMO_TENDERS = 12;

function normalizeState(input) {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.trim().toLowerCase();
  const abbr = {
    mh: "Maharashtra",
    gj: "Gujarat",
    mp: "Madhya Pradesh",
    dl: "Delhi",
    "new delhi": "Delhi",
    "central delhi": "Delhi",
    up: "Uttar Pradesh",
    pb: "Punjab",
    hr: "Haryana",
    as: "Assam",
    wb: "West Bengal",
    ka: "Karnataka",
    rj: "Rajasthan",
    tn: "Tamil Nadu"
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
  INQUIRY_CATEGORIES,
  INQUIRY_STATUSES,
  TENDER_STATUSES,
  INDIAN_STATES,
  MAX_DEMO_TENDERS,
  normalizeState
};

