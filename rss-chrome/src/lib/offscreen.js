const OFFSCREEN_URL = 'src/offscreen.html';
const REASONS = ['AUDIO_PLAYBACK'];
const JUSTIFICATION = 'Plays a short unread-news alert: the service worker has no DOM or audio playback.';
const IDLE_CLOSE_MS = 20_000;

let creationPromise = null;
let activeRequests = 0;
let closeTimer = null;
let closingPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function hasOffscreenDocument() {
  if (chrome.offscreen?.hasDocument) {
    try {
      return await chrome.offscreen.hasDocument();
    } catch {
      // fall through to getContexts
    }
  }

  if (chrome.runtime?.getContexts) {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return contexts.length > 0;
  }

  return false;
}

export async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return true;

  if (!creationPromise) {
    creationPromise = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: REASONS,
        justification: JUSTIFICATION,
      })
      .catch((error) => {
        console.warn('rss-chrome could not create the offscreen document:', error?.message ?? error);
        return null;
      })
      .finally(() => {
        creationPromise = null;
      });
  }

  await creationPromise;
  return hasOffscreenDocument();
}

function cancelIdleClose() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function armIdleClose() {
  cancelIdleClose();
  closeTimer = setTimeout(() => {
    closeTimer = null;
    void closeWhenIdle();
  }, IDLE_CLOSE_MS);
}

async function closeWhenIdle() {
  if (activeRequests > 0) {
    armIdleClose();
    return;
  }

  closingPromise = closeOffscreenDocument()
    .catch((error) => {
      console.warn('rss-chrome could not close the offscreen document:', error?.message ?? error);
    })
    .finally(() => {
      closingPromise = null;
    });

  await closingPromise;
}

export async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument())) return;
  await chrome.offscreen.closeDocument();
}

export async function requestOffscreen(message, { attempts = 2, retryDelay = 150 } = {}) {
  if (closingPromise) await closingPromise;

  if (!(await ensureOffscreenDocument())) {
    throw new Error('offscreen document is unavailable');
  }

  activeRequests += 1;
  cancelIdleClose();

  try {
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const sent = await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (reply) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
            return;
          }
          resolve({ reply });
        });
      });

      if (sent && 'reply' in sent) return sent.reply;

      lastError = sent?.error ?? null;
      if (attempt < attempts) await sleep(retryDelay);
    }

    throw new Error(`offscreen page did not answer${lastError ? `: ${lastError}` : ''}`);
  } finally {
    activeRequests -= 1;
    armIdleClose();
  }
}
