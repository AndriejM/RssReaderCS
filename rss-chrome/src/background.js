import { loadSettings, saveSettings } from './lib/settings.js';
import { playSound } from './lib/sound.js';
import { notifyUnread, wireNotificationClicks } from './lib/notify.js';
import { focusOrCreateTab } from './lib/tabs.js';

const ALARM_NAME = 'rss-chrome:poll';
const MSG_POLL_NOW = 'rss-chrome:poll-now';

wireNotificationClicks();

chrome.runtime.onInstalled.addListener(() => {
  void setup();
});

chrome.runtime.onStartup.addListener(() => {
  void setup();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void poll();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) void syncAlarm();
});

chrome.action.onClicked.addListener(async (tab) => {
  const settings = await loadSettings();
  const target = settings.frontendUrl || chrome.runtime.getURL('src/options.html');
  await focusOrCreateTab(target, tab.windowId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== MSG_POLL_NOW) return false;

  void poll()
    .then(loadSettings)
    .then((settings) => sendResponse({ ok: true, settings }))
    .catch((error) => sendResponse({ ok: false, error: error?.message ?? String(error) }));

  return true;
});

async function setup() {
  await syncAlarm();
  await poll();
}

async function syncAlarm() {
  const settings = await loadSettings();
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing?.periodInMinutes === settings.pollMinutes) return;

  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: settings.pollMinutes });
}

async function poll() {
  const settings = await loadSettings();

  if (!settings.userId || !settings.backendUrl) {
    await setBadge('');
    await saveSettings({ ...settings, lastError: null });
    return;
  }

  try {
    const response = await fetch(`${settings.backendUrl}/rss/unread-count/${settings.userId}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const unread = Number(payload?.unread ?? 0);
    const previous = settings.lastUnread;

    await saveSettings({
      ...settings,
      lastUnread: unread,
      lastCheckedAt: new Date().toISOString(),
      lastError: null,
    });
    await setBadge(unread);

    if (previous !== null && unread > previous) {
      await playSound(settings);
      if (settings.notificationsEnabled) await notifyUnread(unread - previous);
    }
  } catch (error) {
    await saveSettings({
      ...settings,
      lastCheckedAt: new Date().toISOString(),
      lastError: error?.message ?? String(error),
    });
    await setBadge('?');
  }
}

async function setBadge(value) {
  const text = formatBadge(value);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: text === '?' ? '#b91c1c' : '#2563eb' });
}

function formatBadge(value) {
  if (value === '?') return '?';

  const unread = Number(value);
  if (!Number.isFinite(unread) || unread <= 0) return '';
  if (unread > 99) return '*';
  return String(unread);
}
