import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SCOREBOARD_PATH = path.join(DATA_DIR, 'scoreboard.json');
const PORT = Number(process.env.SCOREBOARD_PORT || 8787);
const MAX_ENTRIES = 30;

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCOREBOARD_PATH)) {
    fs.writeFileSync(SCOREBOARD_PATH, '[]', 'utf8');
  }
}

function readEntries() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(SCOREBOARD_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) =>
      typeof entry?.name === 'string' &&
      Number.isFinite(entry?.score) &&
      Number.isFinite(entry?.level)
    );
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  ensureDataFile();
  fs.writeFileSync(SCOREBOARD_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.level !== a.level) return b.level - a.level;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function normalizeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.floor(num));
}

function buildCandidate(score, level) {
  return {
    id: '__candidate__',
    name: '__candidate__',
    score,
    level,
    createdAt: new Date(0).toISOString(),
  };
}

function computeQualification(entries, score, level) {
  const sorted = sortEntries(entries);
  const withCandidate = sortEntries([...sorted, buildCandidate(score, level)]);
  const rank = withCandidate.findIndex((entry) => entry.id === '__candidate__') + 1;
  return {
    qualifies: rank > 0 && rank <= MAX_ENTRIES,
    rank,
    totalEntries: sorted.length,
  };
}

const app = express();
app.use(express.json());

app.get('/api/scoreboard', (_req, res) => {
  const entries = sortEntries(readEntries()).slice(0, MAX_ENTRIES);
  res.json({ entries });
});

app.get('/api/scoreboard/qualify', (req, res) => {
  const score = normalizeNumber(req.query.score);
  const level = normalizeNumber(req.query.level);

  if (score === null || level === null) {
    return res.status(400).json({ error: 'score and level must be numbers' });
  }

  const entries = readEntries();
  const qualification = computeQualification(entries, score, level);
  return res.json(qualification);
});

app.post('/api/scoreboard', (req, res) => {
  const score = normalizeNumber(req.body?.score);
  const level = normalizeNumber(req.body?.level);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (score === null || level === null) {
    return res.status(400).json({ error: 'score and level must be numbers' });
  }

  if (!/^[A-Za-z0-9 ]{1,24}$/.test(name)) {
    return res.status(400).json({ error: 'name must contain only letters, numbers, and spaces (max 24)' });
  }

  const entries = readEntries();
  const qualification = computeQualification(entries, score, level);

  if (!qualification.qualifies) {
    return res.status(400).json({ error: 'score does not qualify for top 30' });
  }

  const newEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    score,
    level,
    createdAt: new Date().toISOString(),
  };

  const sorted = sortEntries([...entries, newEntry]).slice(0, MAX_ENTRIES);
  writeEntries(sorted);

  const rank = sorted.findIndex((entry) => entry.id === newEntry.id) + 1;
  return res.status(201).json({ entry: newEntry, rank, entries: sorted });
});

app.listen(PORT, () => {
  console.log(`Scoreboard API running on http://localhost:${PORT}`);
});
