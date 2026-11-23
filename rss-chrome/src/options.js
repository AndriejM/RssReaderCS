import { SOUND_FILES, loadSettings, saveSettings } from './lib/settings.js';

const MSG_POLL_NOW = 'rss-chrome:poll-now';

const els = {
  backendUrl: document.getElementById('backendUrl'),
  frontendUrl: document.getElementById('frontendUrl'),
  userId: document.getElementById('userId'),
  pollMinutes: document.getElementById('pollMinutes'),
  soundEnabled: document.getElementById('soundEnabled'),
  soundFile: document.getElementById('soundFile'),
  soundVolume: document.getElementById('soundVolume'),
  soundVolumeValue: document.getElementById('soundVolumeValue'),
  notificationsEnabled: document.getElementById('notificationsEnabled'),
  lastCheckedAt: document.getElementById('lastCheckedAt'),
  lastUnread: document.getElementById('lastUnread'),
  lastError: document.getElementById('lastError'),
  status: document.getElementById('status'),
  save: document.getElementById('save'),
  check: document.getElementById('check'),
  open: document.getElementById('open'),
  testSound: document.getElementById('testSound'),
};

let settings = await loadSettings();

els.soundFile.innerHTML = SOUND_FILES.map((file) => {
  const label = file.replace('media/', '').replace('.mp3', '');
  return `<option value="${escapeHtml(file)}">${escapeHtml(label)}</option>`;
}).join('');

render(settings);
await loadUsers(settings.backendUrl);

els.save.addEventListener('click', async () => {
  const next = readForm();
  await saveSettings(next);
  settings = next;
  render(settings);
  await loadUsers(next.backendUrl);
  setStatus('Saved.');
});

els.check.addEventListener('click', async () => {
  const next = readForm();
  await saveSettings(next);
  settings = next;
  setStatus('Checking...');

  const response = await chrome.runtime.sendMessage({ type: MSG_POLL_NOW });
  if (response?.ok) {
    settings = response.settings;
    render(settings);
    setStatus('Checked.');
  } else {
    setStatus(response?.error ?? 'Check failed.');
  }
});

els.open.addEventListener('click', async () => {
  const next = readForm();
  await saveSettings(next);
  settings = next;
  await chrome.tabs.create({ url: settings.frontendUrl || chrome.runtime.getURL('src/options.html') });
});

els.testSound.addEventListener('click', () => {
  const audio = new Audio(chrome.runtime.getURL(els.soundFile.value));
  audio.volume = Number(els.soundVolume.value) / 100;
  void audio.play().catch((error) => setStatus(`Sound failed: ${error.message}`));
});

els.backendUrl.addEventListener('change', () => {
  void loadUsers(els.backendUrl.value);
});

els.soundVolume.addEventListener('input', () => {
  els.soundVolumeValue.value = `${els.soundVolume.value}%`;
});

function render(next) {
  els.backendUrl.value = next.backendUrl;
  els.frontendUrl.value = next.frontendUrl;
  els.pollMinutes.value = next.pollMinutes;
  els.soundEnabled.checked = next.soundEnabled;
  els.soundFile.value = next.soundFile;
  els.soundVolume.value = next.soundVolume;
  els.soundVolumeValue.value = `${next.soundVolume}%`;
  els.notificationsEnabled.checked = next.notificationsEnabled;
  els.lastCheckedAt.textContent = next.lastCheckedAt ? new Date(next.lastCheckedAt).toLocaleString() : '—';
  els.lastUnread.textContent = next.lastUnread ?? '—';
  els.lastError.textContent = next.lastError ?? '—';
}

function readForm() {
  return {
    ...settings,
    backendUrl: els.backendUrl.value,
    frontendUrl: els.frontendUrl.value,
    userId: els.userId.value ? Number(els.userId.value) : null,
    pollMinutes: Number(els.pollMinutes.value),
    soundEnabled: els.soundEnabled.checked,
    soundFile: els.soundFile.value,
    soundVolume: Number(els.soundVolume.value),
    notificationsEnabled: els.notificationsEnabled.checked,
  };
}

async function loadUsers(backendUrl) {
  const previous = String(settings.userId ?? els.userId.value ?? '');
  els.userId.innerHTML = '<option value="">—</option>';

  if (!backendUrl) return;

  try {
    const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/user/find`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const users = await response.json();
    els.userId.innerHTML =
      '<option value="">—</option>' +
      users
        .map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.userName ?? String(user.id))}</option>`)
        .join('');

    if ([...els.userId.options].some((option) => option.value === previous)) {
      els.userId.value = previous;
    }
  } catch (error) {
    setStatus(`Users failed: ${error.message}`);
  }
}

function setStatus(message) {
  els.status.textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
