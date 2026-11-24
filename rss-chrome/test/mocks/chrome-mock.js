export function spy(impl = () => undefined) {
  const fn = (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  fn.reset = () => {
    fn.calls = [];
  };
  return fn;
}

export function createChromeMock() {
  const chrome = {
    runtime: {
      onInstalled: {addListener: spy()},
      onStartup: {addListener: spy()},
      onMessage: {addListener: spy()},
      getURL: (path) => `chrome-extension://test/${path}`,
      sendMessage: spy((message, callback) => callback({reply: {ok: true}})),
      lastError: null,
    },
    alarms: {
      onAlarm: {addListener: spy()},
      get: spy(async () => undefined),
      create: spy(async () => {}),
      clear: spy(async () => {}),
    },
    storage: {
      local: {
        get: spy(async () => ({})),
        set: spy(async () => {}),
      },
      onChanged: {addListener: spy()},
    },
    action: {
      onClicked: {addListener: spy()},
      setBadgeText: spy(async () => {}),
      setBadgeBackgroundColor: spy(async () => {}),
    },
    tabs: {
      query: spy(async () => []),
      create: spy(async (props) => ({id: 99, ...props})),
      update: spy(async () => {}),
    },
    windows: {
      update: spy(async () => {}),
    },
    notifications: {
      getAll: spy(async () => ({})),
      create: spy(async () => {}),
      clear: spy(async () => {}),
      onClicked: {addListener: spy()},
    },
    offscreen: {
      hasDocument: spy(async () => true),
      createDocument: spy(async () => {}),
      closeDocument: spy(async () => {}),
    },
  };
  globalThis.chrome = chrome;
  return chrome;
}

export function queueFetch(...responses) {
  const fetchMock = spy(async () => {
    const response = responses.shift() ?? {ok: true, json: {unread: 0}};
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json,
    };
  });
  globalThis.fetch = fetchMock;
  return fetchMock;
}

let loadCounter = 0;

export async function loadBackground() {
  loadCounter += 1;
  await import(`../../src/background.js?load=${loadCounter}`);
  const handler = globalThis.chrome.runtime.onMessage.addListener.calls[0][0];
  return {
    chrome: globalThis.chrome,
    pollNow: () => new Promise((resolve) => handler({type: 'rss-chrome:poll-now'}, {}, resolve)),
  };
}
