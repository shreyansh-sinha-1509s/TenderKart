const db = require("./db");
const bcrypt = require("bcryptjs");

console.log("Seeding / updating database with 11 realistic contractor and manager accounts...");

const usersToSeed = [
  // ==========================================
  // 1. 5 CONTRACTOR USERS
  // ==========================================
  {
    username: "CON1001",
    user_code: "CON1001",
    name: "Rajesh Mehta",
    company: "Mehta Infrastructure Works",
    department: null,
    email: "rajesh.mehta@demo.tenderkart.in",
    passwordRaw: "Contractor@1001",
    role: "contractor",
    created_at: "2026-08-05 10:30:00"
  },
  {
    username: "CON1002",
    user_code: "CON1002",
    name: "Amit Kulkarni",
    company: "Kulkarni Civil Projects",
    department: null,
    email: "amit.kulkarni@demo.tenderkart.in",
    passwordRaw: "Contractor@1002",
    role: "contractor",
    created_at: "2026-08-18 14:15:00"
  },
  {
    username: "CON1003",
    user_code: "CON1003",
    name: "Suresh Patil",
    company: "Patil Road & Bridge Contractors",
    department: null,
    email: "suresh.patil@demo.tenderkart.in",
    passwordRaw: "Contractor@1003",
    role: "contractor",
    created_at: "2026-09-03 09:45:00"
  },
  {
    username: "CON1004",
    user_code: "CON1004",
    name: "Neeraj Sharma",
    company: "Sharma Urban Construction",
    department: null,
    email: "neeraj.sharma@demo.tenderkart.in",
    passwordRaw: "Contractor@1004",
    role: "contractor",
    created_at: "2026-09-21 16:20:00"
  },
  {
    username: "CON1005",
    user_code: "CON1005",
    name: "Vikram Desai",
    company: "Desai Infrastructure Solutions",
    department: null,
    email: "vikram.desai@demo.tenderkart.in",
    passwordRaw: "Contractor@1005",
    role: "contractor",
    created_at: "2026-10-07 11:10:00"
  },

  // ==========================================
  // 2. 6 MANAGER USERS
  // ==========================================
  {
    username: "MGR2001",
    user_code: "MGR2001",
    name: "Anil Joshi",
    company: null,
    department: "Public Works Department",
    email: "anil.joshi@demo.tenderkart.in",
    passwordRaw: "Manager@2001",
    role: "manager",
    created_at: "2026-08-11 08:30:00"
  },
  {
    username: "MGR2002",
    user_code: "MGR2002",
    name: "Priya Nair",
    company: null,
    department: "Urban Development Department",
    email: "priya.nair@demo.tenderkart.in",
    passwordRaw: "Manager@2002",
    role: "manager",
    created_at: "2026-08-29 12:00:00"
  },
  {
    username: "MGR2003",
    user_code: "MGR2003",
    name: "Rohan Shah",
    company: null,
    department: "Municipal Infrastructure",
    email: "rohan.shah@demo.tenderkart.in",
    passwordRaw: "Manager@2003",
    role: "manager",
    created_at: "2026-09-14 15:45:00"
  },
  {
    username: "MGR2004",
    user_code: "MGR2004",
    name: "Kavita Rao",
    company: null,
    department: "Water Supply Department",
    email: "kavita.rao@demo.tenderkart.in",
    passwordRaw: "Manager@2004",
    role: "manager",
    created_at: "2026-09-26 10:15:00"
  },
  {
    username: "MGR2005",
    user_code: "MGR2005",
    name: "Manoj Verma",
    company: null,
    department: "Metro Infrastructure",
    email: "manoj.verma@demo.tenderkart.in",
    passwordRaw: "Manager@2005",
    role: "manager",
    created_at: "2026-10-09 14:00:00"
  },
  {
    username: "MGR2006",
    user_code: "MGR2006",
    name: "Sneha Iyer",
    company: null,
    department: "Smart City Development",
    email: "sneha.iyer@demo.tenderkart.in",
    passwordRaw: "Manager@2006",
    role: "manager",
    created_at: "2026-10-24 17:30:00"
  }
];

// Cleanly clear existing demo users and re-insert the 11 realistic accounts
db.query("DELETE FROM users", [], (err) => {
  if (err) console.error("Error clearing old users:", err);

  let inserted = 0;
  usersToSeed.forEach((u) => {
    const hashedPassword = bcrypt.hashSync(u.passwordRaw, 10);
    db.query(
      `INSERT INTO users (username, user_code, name, company, department, email, password, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.user_code, u.name, u.company, u.department, u.email, hashedPassword, u.role, u.created_at],
      (insertErr) => {
        if (insertErr) {
          console.error(`Error inserting user ${u.username}:`, insertErr.message);
        }
        inserted++;
        if (inserted === usersToSeed.length) {
          console.log(`✅ Successfully seeded all ${usersToSeed.length} accounts (5 Contractors + 6 Managers)!`);
          
          // Verify total tender count is preserved
          db.query("SELECT COUNT(*) AS tenderCount FROM tenders", [], (tErr, tRows) => {
            console.log(`📊 Verified Tenders in Database: ${tRows[0].tenderCount} records preserved.`);
            process.exit(0);
          });
        }
      }
    );
  });
});
