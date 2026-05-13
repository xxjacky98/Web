const path = require("path");
const express = require("express");
const morgan = require("morgan");

const { initDb } = require("./src/db");
const { registerApiRoutes } = require("./src/routes");

async function main() {
  await initDb();

  const app = express();
  app.use(morgan("dev"));
  app.use(express.json({ limit: "100kb" }));

  const publicDir = path.join(__dirname, "public");
  app.use(express.static(publicDir));

  registerApiRoutes(app);

  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

