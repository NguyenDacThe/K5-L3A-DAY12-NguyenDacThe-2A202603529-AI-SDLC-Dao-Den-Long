export const LEADERBOARD_FILE = 'data/leaderboard.json';
export const LEADERBOARD_KEY = 'dao-den-long.leaderboard.v1';
export const MAX_LEADERBOARD_ENTRIES = 10;

// Valid name: 3-12 characters, alphanumeric, underscores and Vietnamese characters
export const NAME_REGEX = /^[A-Za-z0-9_À-ỹ\s]{3,12}$/u;

export function validateName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim().normalize('NFC');
  return trimmed.length >= 3 && trimmed.length <= 12 && NAME_REGEX.test(trimmed);
}

export function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime();
  }).slice(0, MAX_LEADERBOARD_ENTRIES);
}

export function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = typeof entry.name === 'string' ? entry.name.trim().normalize('NFC') : 'Mây';
  if (!validateName(name)) return null;
  const score = typeof entry.score === 'number' && Number.isFinite(entry.score) ? Math.max(0, Math.floor(entry.score)) : 0;
  const nights_won = Number.isFinite(entry.nights_won) ? Math.max(0, Math.min(3, Math.floor(entry.nights_won))) : 0;
  const seed = Number.isSafeInteger(entry.seed) ? entry.seed : 42;
  const achieved_at = typeof entry.achieved_at === 'string' && !isNaN(Date.parse(entry.achieved_at))
    ? new Date(entry.achieved_at).toISOString()
    : new Date().toISOString();
  return { name, score, nights_won, achieved_at, seed };
}

export function addLeaderboardEntry(entries, newEntry) {
  const sanitized = sanitizeEntry(newEntry);
  if (!sanitized) return entries;
  return sortLeaderboard([...entries, sanitized]);
}

