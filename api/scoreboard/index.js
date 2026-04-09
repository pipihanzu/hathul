import {
  computeQualification,
  getSortedTopEntries,
  loadEntries,
  normalizeNumber,
  saveEntries,
  validateName,
} from '../_lib/scoreboardStore.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const entries = getSortedTopEntries(await loadEntries());
    return res.status(200).json({ entries });
  }

  if (req.method === 'POST') {
    const score = normalizeNumber(req.body?.score);
    const level = normalizeNumber(req.body?.level);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (score === null || level === null) {
      return res.status(400).json({ error: 'score and level must be numbers' });
    }

    if (!validateName(name)) {
      return res.status(400).json({ error: 'name must contain only letters, numbers, and spaces (max 24)' });
    }

    const entries = await loadEntries();
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

    const updated = await saveEntries([...entries, newEntry]);
    const rank = updated.findIndex((entry) => entry.id === newEntry.id) + 1;

    return res.status(201).json({ entry: newEntry, rank, entries: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
