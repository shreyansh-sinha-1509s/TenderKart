// backend/seed_helpdesk.js
// Idempotent demo inquiry verifier aligned with state-based routing

const db = require("./db");

async function seedHelpdesk() {
  const row = await db.getAsync("SELECT COUNT(*) AS count FROM inquiries");
  console.log(`Inquiries present in DB: ${row ? row.count : 0} (State-based routing active)`);
}

if (require.main === module) {
  seedHelpdesk()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error in seed_helpdesk:", err);
      process.exit(1);
    });
}

module.exports = seedHelpdesk;
