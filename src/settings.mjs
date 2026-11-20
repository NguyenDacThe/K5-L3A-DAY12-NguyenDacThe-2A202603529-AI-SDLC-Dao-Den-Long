export const SETTINGS_KEY = 'dao-den-long.settings.v1';

export const DEFAULT_KEYBINDINGS = Object.freeze({
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  interact: 'KeyE',
  pulse: 'KeyF',
  pause: 'KeyP'
});

export function checkKeyConflict(bindings, action, newKey) {
  if (newKey === 'Escape' && action !== 'pause') return 'pause (Esc)';
  for (const [act, key] of Object.entries(bindings)) {
    if (act !== action && key === newKey) return act;
  }
  return null;
}

export function sanitizeSettings(value = {}) {
  const bindings = { ...DEFAULT_KEYBINDINGS };
  if (value?.keybindings && typeof value.keybindings === 'object') {
    for (const key of Object.keys(DEFAULT_KEYBINDINGS)) {
      if (typeof value.keybindings[key] === 'string' && value.keybindings[key].length > 0) {
        bindings[key] = value.keybindings[key];
      }
    }
  }
  if (new Set(Object.values(bindings)).size !== Object.keys(bindings).length) Object.assign(bindings, DEFAULT_KEYBINDINGS);
  return {
    volume: typeof value?.volume === 'number' && Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume)) : .5,
    sensitivity: typeof value?.sensitivity === 'number' && Number.isFinite(value.sensitivity) ? Math.max(.1, Math.min(3, value.sensitivity)) : 1,
    colorblind: value?.colorblind === true,
    reduceMotion: value?.reduceMotion === true,
    largeText: value?.largeText === true,
    keybindings: bindings
  };
}

export function loadSettings(storage) {
  try { return sanitizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY))); }
  catch { return sanitizeSettings(); }
}

export function saveSettings(storage, value) {
  const settings = sanitizeSettings(value);
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Private mode may disable storage. */ }
  return settings;
}
