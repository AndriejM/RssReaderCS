import { loadSettings } from './settings.js';
import { focusOrCreateTab } from './tabs.js';

const ID_PREFIX = 'rss-chrome:unread:';
const TTL_MS = 10_000;

let sequence = 0;
let wired = false;

async function clearExistingNotifications() {
  try {
    const all = await chrome.notifications.getAll();
    for (const id of Object.keys(all ?? {})) {
      if (id.startsWith(ID_PREFIX)) await chrome.notifications.clear(id);
    }
  } catch {
    // Notification cleanup is best effort.
  }
}

export async function notifyUnread(delta) {
  if (!(delta > 0)) return false;

  await clearExistingNotifications();

  const id = `${ID_PREFIX}${Date.now()}:${(sequence += 1)}`;
  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'RssReader',
      message: `${delta} new unread item${delta === 1 ? '' : 's'}`,
    });
    setTimeout(() => void chrome.notifications.clear(id).catch(() => {}), TTL_MS);
    return true;
  } catch (error) {
    console.warn('rss-chrome notification did not show:', error?.message ?? error);
    return false;
  }
}

export function wireNotificationClicks() {
  if (wired) return;
  wired = true;

  chrome.notifications.onClicked.addListener(async (id) => {
    if (!id.startsWith(ID_PREFIX)) return;

    await chrome.notifications.clear(id).catch(() => {});
    const settings = await loadSettings();
    await focusOrCreateTab(settings.frontendUrl);
  });
}
