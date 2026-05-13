const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { AVG_NAME, DEFAULT_XLS_PATH } = require("./constants");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "prices.sqlite");

/** @type {sqlite3.Database | null} */
let db = null;

function getDb() {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return db;
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  fs.mkdirSync(dataDir, { recursive: true });

  db = new sqlite3.Database(dbPath);
  await run("PRAGMA foreign_keys = ON;");

  await run(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const row = await get("SELECT COUNT(*) AS count FROM prices;");
  if (Number(row?.count || 0) > 0) return;

  // Prefer importing the user's downloaded Taipower XLS if available.
  const xlsPath = process.env.TAIPOWER_XLS_PATH || DEFAULT_XLS_PATH;
  try {
    // eslint-disable-next-line global-require
    const { importTaipowerXls } = require("./taipower_import");
    if (fs.existsSync(xlsPath)) {
      await importTaipowerXls({ xlsPath, exec, run });
      return;
    }
  } catch {
    // ignore and fall back to seed rows
  }

  // Fallback: three demo rows (A6) if XLS isn't available.
  const now = new Date().toISOString();
  await run("INSERT INTO prices (date, name, price, created_at) VALUES (?, ?, ?, ?);", [
    "2024-01-01",
    AVG_NAME,
    2.625,
    now,
  ]);
  await run("INSERT INTO prices (date, name, price, created_at) VALUES (?, ?, ?, ?);", [
    "2025-01-01",
    AVG_NAME,
    2.78,
    now,
  ]);
  await run("INSERT INTO prices (date, name, price, created_at) VALUES (?, ?, ?, ?);", [
    "2026-01-01",
    AVG_NAME,
    2.9,
    now,
  ]);
}

module.exports = {
  initDb,
  all,
  exec,
  get,
  run,
};

