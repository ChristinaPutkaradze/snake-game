const { getPool, ensureSchema } = require("./db");

const MAX_NAME_LENGTH = 24;
const MAX_RESULTS = 50;
const MAX_STORE = 200;

function normalizeName(name) {
  return name.replace(/[\r\n\t]/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function respond(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.status(status).end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();
  } catch (err) {
    return respond(res, 500, { error: "Database not configured" });
  }

  if (req.method === "GET") {
    const db = getPool();
    const result = await db.query(
      `SELECT name, score, created_at AS "createdAt"
       FROM scores
       ORDER BY score DESC, created_at ASC
       LIMIT $1`,
      [MAX_RESULTS]
    );
    return respond(res, 200, { scores: result.rows });
  }

  if (req.method === "POST") {
    const { name, score } = req.body || {};
    if (typeof name !== "string" || typeof score !== "number") {
      return respond(res, 400, { error: "Invalid payload" });
    }

    const cleanName = normalizeName(name);
    if (!cleanName) {
      return respond(res, 400, { error: "Name required" });
    }

    const cleanScore = Math.max(0, Math.floor(score));
    const db = getPool();
    await db.query(
      `INSERT INTO scores (name, score) VALUES ($1, $2)`,
      [cleanName, cleanScore]
    );

    const cleanup = await db.query(
      `DELETE FROM scores
       WHERE id IN (
         SELECT id FROM scores
         ORDER BY score DESC, created_at ASC
         OFFSET $1
       )`,
      [MAX_STORE]
    );
    void cleanup;

    const result = await db.query(
      `SELECT name, score, created_at AS "createdAt"
       FROM scores
       ORDER BY score DESC, created_at ASC
       LIMIT $1`,
      [MAX_RESULTS]
    );

    return respond(res, 200, { ok: true, scores: result.rows });
  }

  res.setHeader("Allow", "GET, POST");
  return respond(res, 405, { error: "Method not allowed" });
};
