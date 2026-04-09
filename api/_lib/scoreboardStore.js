import fs from 'node:fs/promises';
import path from 'node:path';
import { kv } from '@vercel/kv';

const MAX_ENTRIES = 30;
const SCOREBOARD_KEY = 'hathul:scoreboard';

const hasKvConfig = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const isVercelRuntime = Boolean(process.env.VERCEL);
const ROOT_DIR = process.cwd();
const DATA_PATH = path.join(ROOT_DIR, 'data', 'scoreboard.json');
const memoryStoreKey = '__hathulScoreboardMemoryStore';

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.level !== a.level) return b.level - a.level;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function normalizeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.floor(num));
}

export function validateName(name) {
  return /^[A-Za-z0-9 ]{1,24}$/.test(name);
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

export function computeQualification(entries, score, level) {
  const sorted = sortEntries(entries);
  const withCandidate = sortEntries([...sorted, buildCandidate(score, level)]);
  const rank = withCandidate.findIndex((entry) => entry.id === '__candidate__') + 1;

  return {
    qualifies: rank > 0 && rank <= MAX_ENTRIES,
    rank,
    totalEntries: sorted.length,
  };
}

async function readFromFile() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readFromMemory() {
  if (!globalThis[memoryStoreKey]) {
    globalThis[memoryStoreKey] = [];
  }
  return Array.isArray(globalThis[memoryStoreKey]) ? globalThis[memoryStoreKey] : [];
}

function writeToMemory(entries) {
  globalThis[memoryStoreKey] = entries;
}

async function writeToFile(entries) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

export async function loadEntries() {
  if (hasKvConfig) {
    const stored = await kv.get(SCOREBOARD_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  if (isVercelRuntime) {
    return readFromMemory();
  }

  return readFromFile();
}

export async function saveEntries(entries) {
  const sorted = sortEntries(entries).slice(0, MAX_ENTRIES);

  if (hasKvConfig) {
    await kv.set(SCOREBOARD_KEY, sorted);
    return sorted;
  }

  if (isVercelRuntime) {
    writeToMemory(sorted);
    return sorted;
  }

  await writeToFile(sorted);
  return sorted;
}

export function getMaxEntries() {
  return MAX_ENTRIES;
}

export function getSortedTopEntries(entries) {
  return sortEntries(entries).slice(0, MAX_ENTRIES);
}
