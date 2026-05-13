const fs = require("fs");
const path = require("path");
const { AVG_NAME } = require("./constants");

function safeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function ymdFromYear(year) {
  const yyyy = String(year);
  return `${yyyy}-01-01`;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

async function importTaipowerXls({ xlsPath, exec, run, manageTransaction = true }) {
  if (!xlsPath || typeof xlsPath !== "string") throw new Error("xlsPath is required");
  if (!fs.existsSync(xlsPath)) throw new Error(`XLS not found: ${xlsPath}`);

  // eslint-disable-next-line global-require
  const XLSX = require("xlsx");

  const wb = XLSX.readFile(xlsPath, { cellDates: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("Workbook has no sheets");

  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  // Expected layout:
  // headers around row 4/5, then rows like: [Year, Lighting, Power, Average]
  const createdAt = new Date().toISOString();
  let inserted = 0;

  if (manageTransaction) await exec("BEGIN TRANSACTION;");
  try {
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 4) continue;
      const year = safeNumber(row[0]);
      const avg = safeNumber(row[3]);

      if (!year || !Number.isInteger(year) || year < 1900 || year > 2100) continue;
      if (avg === null) continue;

      await run(
        "INSERT INTO prices (date, name, price, created_at) VALUES (?, ?, ?, ?);",
        [ymdFromYear(year), AVG_NAME, round4(avg), createdAt],
      );
      inserted += 1;
    }

    if (manageTransaction) await exec("COMMIT;");
    return { inserted, sheet: firstSheetName, xlsPath: path.resolve(xlsPath) };
  } catch (err) {
    if (manageTransaction) await exec("ROLLBACK;");
    throw err;
  }
}

module.exports = { importTaipowerXls };

