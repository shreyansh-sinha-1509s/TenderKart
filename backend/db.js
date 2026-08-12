const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Open (or create) the SQLite database file next to this script
const db = new sqlite3.Database(path.join(__dirname, "tenderkart.db"), (err) => {
  if (err) {
    console.error("Error opening SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database – ready at tenderkart.db");
  }
});

// Auto-create tables on startup
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      category TEXT NOT NULL,
      budget REAL NOT NULL,
      location TEXT NOT NULL,
      deadline TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      required_documents TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_tenders (
      user_id INTEGER NOT NULL,
      tender_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, tender_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(tender_id) REFERENCES tenders(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
});

// MySQL-compatible query shim wrapping standard sqlite3 callbacks
const connection = {
  query(sql, params, cb) {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith("INSERT")) {
      db.run(sql, params, function (err) {
        if (err) return cb(err);
        // callback signature returns results with insertId
        cb(null, { insertId: this.lastID });
      });
    } else if (trimmed.startsWith("UPDATE") || trimmed.startsWith("DELETE")) {
      db.run(sql, params, function (err) {
        if (err) return cb(err);
        // callback signature returns results with affectedRows
        cb(null, { affectedRows: this.changes });
      });
    } else {
      // SELECT queries
      db.all(sql, params, (err, rows) => {
        if (err) return cb(err);
        cb(null, rows);
      });
    }
  }
};

module.exports = connection;
