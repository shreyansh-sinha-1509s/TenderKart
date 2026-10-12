const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "tenderkart.db");
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function seedHelpdesk() {
  console.log("==================================================");
  console.log("Seeding Centralized Helpdesk & Inquiries Demo Data");
  console.log("==================================================");

  // 1. Ensure central admin account exists
  let admin = await getAsync("SELECT id, username, email FROM users WHERE role = 'admin' OR username = 'admin'");
  if (!admin) {
    const adminHash = bcrypt.hashSync("Admin@1001", 10);
    const res = await runAsync(
      `INSERT INTO users (username, user_code, name, company, department, email, password, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ["admin", "ADM1001", "TenderKart Central Admin", "TenderKart Administration", "System Administration & Helpdesk", "admin@demo.tenderkart.in", adminHash, "admin"]
    );
    admin = { id: res.lastID, username: "admin", email: "admin@demo.tenderkart.in" };
    console.log("Created central admin account: admin (ADM1001)");
  } else {
    console.log(`Using existing central admin account: ${admin.username} (ID: ${admin.id})`);
  }

  // 2. Fetch required users for demo tickets
  const con1 = await getAsync("SELECT * FROM users WHERE user_code = 'CON1001' OR username = 'CON1001'");
  const con2 = await getAsync("SELECT * FROM users WHERE user_code = 'CON1002' OR username = 'CON1002'");
  const con3 = await getAsync("SELECT * FROM users WHERE user_code = 'CON1003' OR username = 'CON1003'");
  const mgr1 = await getAsync("SELECT * FROM users WHERE user_code = 'MGR2001' OR username = 'MGR2001'");
  const mgr2 = await getAsync("SELECT * FROM users WHERE user_code = 'MGR2002' OR username = 'MGR2002'");

  if (!con1 || !con2 || !con3 || !mgr1 || !mgr2) {
    console.error("Required demo user accounts (CON1001-CON1003, MGR2001-MGR2002) not found!");
    return;
  }

  // 3. Fetch tenders for linking
  const bridgeTender = await getAsync("SELECT id, name FROM tenders WHERE category = 'Bridges' ORDER BY id ASC LIMIT 1");
  const roadTender = await getAsync("SELECT id, name FROM tenders WHERE category = 'Roads' ORDER BY id ASC LIMIT 1");
  const waterTender = await getAsync("SELECT id, name FROM tenders WHERE category = 'Water Supply' ORDER BY id ASC LIMIT 1");
  const buildingTender = await getAsync("SELECT id, name FROM tenders WHERE category = 'Buildings' ORDER BY id ASC LIMIT 1");

  // 4. Define the 5 demo tickets
  const demoTickets = [
    {
      ticket_number: "TKT-2026-001",
      user: con1,
      role: "Contractor",
      org: con1.company || "Mehta Infrastructure Works",
      category: "Technical / Platform Support",
      subject: "Unable to save a bridge tender",
      tender_id: bridgeTender ? bridgeTender.id : null,
      message: "I can view the bridge tender details, but the tender is not appearing in my saved tenders after I click Save. Please help me resolve this issue.",
      priority: "Medium",
      status: "In Progress",
      created_at: "2026-09-15 11:20:00",
      admin_reply: "We have recorded your issue and are checking the saved-tender functionality. Please refresh the page and try again while we investigate.",
      admin_reply_time: "2026-09-15 14:45:00",
      resolved_at: null
    },
    {
      ticket_number: "TKT-2026-002",
      user: con2,
      role: "Contractor",
      org: con2.company || "Kulkarni Civil Projects",
      category: "Tender Information / NIT Clarification",
      subject: "Clarification about a road project deadline",
      tender_id: roadTender ? roadTender.id : null,
      message: "The deadline displayed on the tender card appears different from the date in the project details. Please confirm which date is recorded in TenderKart.",
      priority: "High",
      status: "Awaiting User Response",
      created_at: "2026-09-22 09:30:00",
      admin_reply: "The inquiry has been reviewed. Please share the tender ID and the deadline shown in your project document so we can compare the recorded details.",
      admin_reply_time: "2026-09-22 11:15:00",
      resolved_at: null
    },
    {
      ticket_number: "TKT-2026-003",
      user: mgr1,
      role: "Manager",
      org: mgr1.department || "Public Works Department",
      category: "Data Correction",
      subject: "Incorrect water supply tender information",
      tender_id: waterTender ? waterTender.id : null,
      message: "The location or estimated budget recorded for a water supply tender needs verification. Please help check the record and confirm the correction process.",
      priority: "High",
      status: "In Progress",
      created_at: "2026-09-28 14:00:00",
      admin_reply: "Thank you for reporting this. We are reviewing the stored tender information. Please provide the corrected value and its source before any change is made.",
      admin_reply_time: "2026-09-28 16:30:00",
      resolved_at: null
    },
    {
      ticket_number: "TKT-2026-004",
      user: mgr2,
      role: "Manager",
      org: mgr2.department || "Urban Development Department",
      category: "Manager Dashboard / Tender Management",
      subject: "Tender status not updating correctly",
      tender_id: buildingTender ? buildingTender.id : null,
      message: "I updated a tender record, but the displayed status does not appear to match the current deadline. Please investigate the status calculation.",
      priority: "Medium",
      status: "Resolved",
      created_at: "2026-10-02 10:15:00",
      admin_reply: "The stored deadline and status calculation have been checked in the demo environment. The record now displays the expected status. Please reopen this ticket if you observe the problem again.",
      admin_reply_time: "2026-10-02 13:00:00",
      resolved_at: "2026-10-02 13:00:00"
    },
    {
      ticket_number: "TKT-2026-005",
      user: con3,
      role: "Contractor",
      org: con3.company || "Patil Road & Bridge Contractors",
      category: "AI Tender Summary Feedback",
      subject: "Tender summary is missing an important requirement",
      tender_id: bridgeTender ? bridgeTender.id : null,
      message: "The generated summary does not clearly mention one of the requirements in the tender description. Please review whether the summary needs improvement.",
      priority: "Medium",
      status: "New",
      created_at: "2026-10-08 16:40:00",
      admin_reply: null,
      admin_reply_time: null,
      resolved_at: null
    }
  ];

  let insertedCount = 0;
  let updatedCount = 0;

  for (const t of demoTickets) {
    const existing = await getAsync("SELECT id, ticket_number FROM inquiries WHERE ticket_number = ?", [t.ticket_number]);

    let inquiryId;
    if (!existing) {
      const res = await runAsync(
        `INSERT INTO inquiries (
          ticket_number, sender_user_id, sender_role, organization_name,
          sender_name, sender_email, contact_number, inquiry_category,
          related_tender_id, subject, description, assigned_to,
          priority, status, resolved_at, created_at, updated_at, demo_record
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?, 1)`,
        [
          t.ticket_number,
          t.user.id,
          t.role,
          t.org,
          t.user.name || t.user.username,
          t.user.email,
          "+91 98765 43210",
          t.category,
          t.tender_id,
          t.subject,
          t.message,
          t.priority,
          t.status,
          t.resolved_at,
          t.created_at,
          t.admin_reply_time || t.created_at
        ]
      );
      inquiryId = res.lastID;
      insertedCount++;
      console.log(`Inserted demo ticket ${t.ticket_number} (ID: ${inquiryId})`);
    } else {
      inquiryId = existing.id;
      // Update metadata to maintain consistency
      await runAsync(
        `UPDATE inquiries
         SET sender_user_id = ?, sender_role = ?, organization_name = ?,
             sender_name = ?, sender_email = ?, inquiry_category = ?,
             related_tender_id = ?, subject = ?, description = ?,
             priority = ?, status = ?, resolved_at = ?, demo_record = 1
         WHERE id = ?`,
        [
          t.user.id,
          t.role,
          t.org,
          t.user.name || t.user.username,
          t.user.email,
          t.category,
          t.tender_id,
          t.subject,
          t.message,
          t.priority,
          t.status,
          t.resolved_at,
          inquiryId
        ]
      );
      updatedCount++;
      console.log(`Updated existing demo ticket ${t.ticket_number} (ID: ${inquiryId})`);
    }

    // 5. Ensure initial user message exists
    const initialMsg = await getAsync(
      "SELECT id FROM inquiry_messages WHERE inquiry_id = ? AND sender_user_id = ? AND message_body = ?",
      [inquiryId, t.user.id, t.message]
    );
    if (!initialMsg) {
      await runAsync(
        `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [inquiryId, t.user.id, t.role, t.message, t.created_at]
      );
    }

    // 6. Ensure admin reply exists if specified
    if (t.admin_reply) {
      const adminMsg = await getAsync(
        "SELECT id FROM inquiry_messages WHERE inquiry_id = ? AND sender_user_id = ? AND message_body = ?",
        [inquiryId, admin.id, t.admin_reply]
      );
      if (!adminMsg) {
        await runAsync(
          `INSERT INTO inquiry_messages (inquiry_id, sender_user_id, sender_role, message_body, created_at)
           VALUES (?, ?, 'Admin', ?, ?)`,
          [inquiryId, admin.id, t.admin_reply, t.admin_reply_time]
        );
      }
    }
  }

  const allTickets = await allAsync("SELECT id, ticket_number, sender_role, status, priority FROM inquiries");
  console.log(`\nDemo seeding complete. Total inquiries in DB: ${allTickets.length}`);
  console.table(allTickets);
}

if (require.main === module) {
  seedHelpdesk()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error seeding helpdesk:", err);
      db.close();
      process.exit(1);
    });
}

module.exports = seedHelpdesk;
