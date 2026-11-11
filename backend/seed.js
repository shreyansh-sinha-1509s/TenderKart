// backend/seed.js
// Idempotent two-role database verification & baseline bootstrapper

const db = require("./db");

async function main() {
  await new Promise((r) => setTimeout(r, 400));
  const roles = await db.queryAsync(
    "SELECT LOWER(role) AS role, COUNT(*) AS count FROM users GROUP BY LOWER(role)"
  );
  const tenders = await db.getAsync("SELECT COUNT(*) AS count FROM tenders");
  console.log("TenderKart database check complete:");
  console.log("Users:", roles);
  console.log("Tenders:", tenders ? tenders.count : 0);
  db.rawDb.close();
}

main().catch((err) => {
  console.error("Seed check failed:", err);
  process.exit(1);
});
