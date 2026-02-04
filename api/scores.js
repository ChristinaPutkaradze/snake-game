const fs = require("fs");
const path = require("path");

const MAX_NAME_LENGTH = 24;
const MAX_RESULTS = 50;
const MAX_STORE = 200;

function getStorePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "scores.json");
  }
  return path.join(process.cwd(), "data", "scores.json");
}

function readScores() {
  const filePath = getStorePath();
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

function writeScores(scores) {
  const filePath = getStorePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(scores, null, 2), "utf8");
}

function normalizeName(name) {
  return name.replace(/[\r\n\t]/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function respond(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.status(status).end(JSON.stringify(payload));
}

module.exports = (req, res) => {
  if (req.method === "GET") {
    const scores = readScores()
      .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
      .slice(0, MAX_RESULTS);
    return respond(res, 200, { scores });
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
    const scores = readScores();
    scores.push({
      name: cleanName,
      score: cleanScore,
      createdAt: new Date().toISOString(),
    });

    const trimmed = scores
      .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
      .slice(0, MAX_STORE);

    writeScores(trimmed);

    return respond(res, 200, { ok: true, scores: trimmed.slice(0, MAX_RESULTS) });
  }

  res.setHeader("Allow", "GET, POST");
  return respond(res, 405, { error: "Method not allowed" });
};
