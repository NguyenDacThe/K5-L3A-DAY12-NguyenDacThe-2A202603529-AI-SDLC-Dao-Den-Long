import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateName,
  sortLeaderboard,
  sanitizeEntry,
  addLeaderboardEntry
} from '../src/leaderboard.mjs';
import { loadLeaderboardFromFile, saveLeaderboardToFile, exportLeaderboard } from '../src/leaderboard-file.mjs';

test('leaderboard name validation requires 3-12 characters and allows letters, numbers, underscores, and Vietnamese accents', () => {
  assert.equal(validateName('May'), true);
  assert.equal(validateName('Mây'), true);
  assert.equal(validateName('Nguyen_Van_A'), true);
  assert.equal(validateName('Hi'), false); // Too short (< 3)
  assert.equal(validateName('ThisNameIsWayTooLong123'), false); // Too long (> 12)
  assert.equal(validateName('May@123!'), false); // Special characters not allowed
  assert.equal(validateName(''), false);
  assert.equal(validateName(null), false);
});

test('leaderboard sorts by score descending, breaking ties by earlier timestamp, keeping top 10', () => {
  const entries = [
    { name: 'Player1', score: 100, achieved_at: '2026-11-20T10:00:00Z', nights_won: 1, seed: 1 },
    { name: 'Player2', score: 300, achieved_at: '2026-11-20T10:05:00Z', nights_won: 3, seed: 2 },
    { name: 'Player3', score: 200, achieved_at: '2026-11-20T10:02:00Z', nights_won: 2, seed: 3 },
    { name: 'Player4', score: 200, achieved_at: '2026-11-20T10:01:00Z', nights_won: 2, seed: 4 } // Earlier tie
  ];
  const sorted = sortLeaderboard(entries);
  assert.equal(sorted[0].name, 'Player2'); // score 300
  assert.equal(sorted[1].name, 'Player4'); // score 200, 10:01
  assert.equal(sorted[2].name, 'Player3'); // score 200, 10:02
  assert.equal(sorted[3].name, 'Player1'); // score 100

  // Verify capping at 10
  const many = Array.from({ length: 15 }, (_, i) => ({
    name: `User_${i}`,
    score: i * 10,
    achieved_at: new Date(Date.now() + i * 1000).toISOString(),
    nights_won: 1,
    seed: i
  }));
  const top10 = sortLeaderboard(many);
  assert.equal(top10.length, 10);
  assert.equal(top10[0].score, 140);
  assert.equal(top10[9].score, 50);
});

test('leaderboard file saving, loading and exporting', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leaderboard-test-'));
  try {
    const file = join(dir, 'leaderboard.json');
    const exportFile = join(dir, 'out.json');

    const initial = loadLeaderboardFromFile(file);
    assert.deepEqual(initial, []);

    const updated = addLeaderboardEntry([], {
      name: 'Mây_Pro',
      score: 1500,
      nights_won: 3,
      achieved_at: '2026-11-20T12:00:00Z',
      seed: 42
    });
    saveLeaderboardToFile(updated, file);

    const loaded = loadLeaderboardFromFile(file);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].name, 'Mây_Pro');
    assert.equal(loaded[0].score, 1500);

    exportLeaderboard(exportFile, file);
    const exported = JSON.parse(readFileSync(exportFile, 'utf8'));
    assert.equal(exported.entries.length, 1);
    assert.equal(exported.entries[0].name, 'Mây_Pro');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
