export const SOUND_FILES = [
  'media/ariel.mp3',
  'media/beep.mp3',
  'media/carme.mp3',
  'media/ceres.mp3',
  'media/elara.mp3',
  'media/europa.mp3',
  'media/iapetus.mp3',
  'media/io.mp3',
  'media/iphone.mp3',
  'media/iphone2.mp3',
  'media/rhea.mp3',
  'media/salacia.mp3',
  'media/tethys.mp3',
  'media/titan.mp3',
];

export const DEFAULT_SETTINGS = {
  backendUrl: 'http://localhost:8080',
  frontendUrl: 'http://localhost:5173',
  userId: null,
  pollMinutes: 1,
  soundEnabled: true,
  soundFile: 'media/beep.mp3',
  soundVolume: 60,
  notificationsEnabled: true,
  lastUnread: null,
  lastCheckedAt: null,
  lastError: null,
};

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeUrl(value, fallback) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return fallback;
  }
}

export function normalizeSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const userId = Number(source.userId);
  const lastUnread = Number(source.lastUnread);

  return {
    backendUrl: normalizeUrl(source.backendUrl, DEFAULT_SETTINGS.backendUrl),
    frontendUrl: normalizeUrl(source.frontendUrl, DEFAULT_SETTINGS.frontendUrl),
    userId: Number.isFinite(userId) && userId > 0 ? userId : null,
    pollMinutes: clampInt(source.pollMinutes, 1, 60, DEFAULT_SETTINGS.pollMinutes),
    soundEnabled: source.soundEnabled !== false,
    soundFile: SOUND_FILES.includes(source.soundFile) ? source.soundFile : DEFAULT_SETTINGS.soundFile,
    soundVolume: clampInt(source.soundVolume, 0, 100, DEFAULT_SETTINGS.soundVolume),
    notificationsEnabled: source.notificationsEnabled !== false,
    lastUnread: Number.isFinite(lastUnread) && lastUnread >= 0 ? lastUnread : null,
    lastCheckedAt: typeof source.lastCheckedAt === 'string' ? source.lastCheckedAt : null,
    lastError: typeof source.lastError === 'string' ? source.lastError : null,
  };
}

export async function loadSettings() {
  const stored = await chrome.storage.local.get('settings');
  return normalizeSettings(stored.settings);
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings: normalizeSettings(settings) });
}
