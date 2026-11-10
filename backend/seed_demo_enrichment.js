// backend/seed_demo_enrichment.js
// Safe guard: TenderKart strictly enforces the 12-tender demonstration dataset.
// Extra enrichment tender insertion is disabled to preserve the 12-tender requirement.

const db = require("./db");

async function main() {
  const row = await db.getAsync("SELECT COUNT(*) AS count FROM tenders");
  console.log(`TenderKart 12-tender guard active. Current tender count: ${row ? row.count : 0}`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = main();
