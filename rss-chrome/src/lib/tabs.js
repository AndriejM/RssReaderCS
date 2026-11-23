export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function focusOrCreateTab(url, preferWindowId = null) {
  if (!isHttpUrl(url)) return null;

  const candidates = (await chrome.tabs.query({})).filter((tab) => tab.url === url);
  if (candidates.length === 0) return chrome.tabs.create({ url });

  const target = candidates.find((tab) => tab.windowId === preferWindowId) ?? candidates[candidates.length - 1];

  try {
    await chrome.tabs.update(target.id, { active: true });
    await chrome.windows.update(target.windowId, { focused: true });
    return target;
  } catch {
    return chrome.tabs.create({ url });
  }
}
