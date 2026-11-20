import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { LEADERBOARD_FILE, sortLeaderboard, sanitizeEntry } from './leaderboard.mjs';
export { addLeaderboardEntry } from './leaderboard.mjs';
export function loadLeaderboardFromFile(filePath = process.env.LEADERBOARD_FILE ?? LEADERBOARD_FILE) {
  try {
    if (!existsSync(filePath)) return [];
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    const list = Array.isArray(content) ? content : (Array.isArray(content?.entries) ? content.entries : []);
    return sortLeaderboard(list.map(sanitizeEntry).filter(Boolean));
  } catch {
    return [];
  }
}

export function saveLeaderboardToFile(entries, filePath = process.env.LEADERBOARD_FILE ?? LEADERBOARD_FILE) {
  const sorted = sortLeaderboard(entries.map(sanitizeEntry).filter(Boolean));
  const dir = dirname(resolve(filePath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify({ entries: sorted }, null, 2) + '\n', 'utf8');
  return sorted;
}

export function exportLeaderboard(outPath, filePath = process.env.LEADERBOARD_FILE ?? LEADERBOARD_FILE) {
  const entries = loadLeaderboardFromFile(filePath);
  const outDir = dirname(resolve(outPath));
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify({ entries }, null, 2) + '\n', 'utf8');
  return entries;
}
