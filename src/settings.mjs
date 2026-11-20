export const SETTINGS_KEY = 'dao-den-long.settings.v1';
export function sanitizeSettings(value = {}) {
  return {
    volume: typeof value?.volume === 'number' && Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume)) : .5,
    sensitivity: typeof value?.sensitivity === 'number' && Number.isFinite(value.sensitivity) ? Math.max(.1, Math.min(3, value.sensitivity)) : 1,
    colorblind: value?.colorblind === true
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
