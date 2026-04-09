import {
  computeQualification,
  loadEntries,
  normalizeNumber,
} from '../_lib/scoreboardStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const score = normalizeNumber(req.query.score);
  const level = normalizeNumber(req.query.level);

  if (score === null || level === null) {
    return res.status(400).json({ error: 'score and level must be numbers' });
  }

  const entries = await loadEntries();
  return res.status(200).json(computeQualification(entries, score, level));
}
