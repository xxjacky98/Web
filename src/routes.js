const { all, exec, get, run } = require("./db");
const { isValidIsoDateYmd, parsePositiveNumber } = require("./validation");
const { importTaipowerXls } = require("./taipower_import");
const { AVG_NAME, DEFAULT_XLS_PATH } = require("./constants");

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function registerApiRoutes(app) {
  app.get("/api/prices", async (req, res) => {
    try {
      const searchRaw = typeof req.query.search === "string" ? req.query.search : "";
      const search = searchRaw.trim();

      /** @type {any[]} */
      let rows;
      if (search) {
        rows = await all(
          "SELECT id, date, name, price, created_at FROM prices WHERE name LIKE ? ORDER BY date DESC, id DESC;",
          [`%${search}%`],
        );
      } else {
        rows = await all(
          "SELECT id, date, name, price, created_at FROM prices ORDER BY date DESC, id DESC;",
        );
      }

      const rounded = rows.map((r) => ({ ...r, price: round4(Number(r.price)) }));
      res.json(rounded);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Import Taipower XLS (historical average rate).
  app.post("/api/taipower/import", async (_req, res) => {
    try {
      const xlsPath = process.env.TAIPOWER_XLS_PATH || DEFAULT_XLS_PATH;
      const result = await importTaipowerXls({ xlsPath, exec, run });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Clear then import (avoid duplicates).
  app.post("/api/taipower/reset-import", async (_req, res) => {
    const xlsPath = process.env.TAIPOWER_XLS_PATH || DEFAULT_XLS_PATH;

    try {
      await exec("BEGIN TRANSACTION;");
      await run("DELETE FROM prices;");
      const result = await importTaipowerXls({ xlsPath, exec, run, manageTransaction: false });
      await exec("COMMIT;");
      res.json({ ...result, cleared: true });
    } catch (err) {
      try {
        await exec("ROLLBACK;");
      } catch {
        // ignore
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/prices", async (req, res) => {
    try {
      const { date, name, price } = req.body || {};

      if (!isValidIsoDateYmd(date)) {
        return res.status(400).json({ error: "date must be YYYY-MM-DD" });
      }

      // Keep input field for assignment (A3), but normalize to the only supported series.
      const finalName =
        typeof name === "string" && name.trim().length > 0 ? AVG_NAME : AVG_NAME;

      const parsedPrice = parsePositiveNumber(price);
      if (parsedPrice === null || parsedPrice <= 0) {
        return res.status(400).json({ error: "price must be a positive number" });
      }

      const roundedPrice = round4(parsedPrice);
      const createdAt = new Date().toISOString();
      const result = await run(
        "INSERT INTO prices (date, name, price, created_at) VALUES (?, ?, ?, ?);",
        [date, finalName, roundedPrice, createdAt],
      );

      const inserted = await get(
        "SELECT id, date, name, price, created_at FROM prices WHERE id = ?;",
        [result.lastID],
      );

      res.status(201).json({ ...inserted, price: round4(Number(inserted.price)) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

module.exports = { registerApiRoutes };

