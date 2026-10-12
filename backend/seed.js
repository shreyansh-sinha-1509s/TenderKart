// backend/seed.js
// TenderKart Demo Database Seeder
// Executes idempotent demo enrichment for tenders, applications, and centralized helpdesk

async function main() {
  await require("./seed_demo_enrichment");
  const seedHelpdesk = require("./seed_helpdesk");
  await seedHelpdesk();
}

if (require.main === module) {
  main().then(() => {
    console.log("Master seed completed successfully.");
    process.exit(0);
  }).catch((err) => {
    console.error("Master seed error:", err);
    process.exit(1);
  });
}

module.exports = main;
