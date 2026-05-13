// Starlink Obligations Patcher - Firefox Background Script
// 1. Patch live de la reponse /obligations via webRequest.filterResponseData
// 2. Observation passive de tous les endpoints /api/* (methode + chemin + status)
// 3. Scan actif: probe GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS sur un chemin
//    pour decouvrir quelles methodes existent (status 200/401/403 vs 404/405).

var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var TAG = "[OblPatcher]";
var ENDPOINT_PATH = "/api/accounts/v1/accounts/customer-details/obligations";
var ENDPOINT_URL_FILTERS = [
  "https://starlink.com/api/accounts/v1/accounts/customer-details/obligations*",
  "https://*.starlink.com/api/accounts/v1/accounts/customer-details/obligations*"
];
var API_URL_FILTERS = [
  "https://starlink.com/api/*",
  "https://*.starlink.com/api/*"
];

var state = {
  enabled: false,
  verificationState: "Required",
  isRestricted: false,
  patchCount: 0,
  lastPatchAt: null
};

// observed[`${METHOD} ${PATH}`] = { method, path, statuses: {200:n,...}, count, firstSeen, lastSeen, sampleUrl }
var observed = {};
var lastSeenStatus = {}; // key requestId -> stored key to attribute status

// === INIT ===

async function initialize() {
  try {
    var stored = await browserAPI.storage.local.get([
      "enabled", "verificationState", "isRestricted", "patchCount", "observed"
    ]);
    if (typeof stored.enabled === "boolean") state.enabled = stored.enabled;
    if (typeof stored.verificationState === "string") state.verificationState = stored.verificationState;
    if (typeof stored.isRestricted === "boolean") state.isRestricted = stored.isRestricted;
    if (typeof stored.patchCount === "number") state.patchCount = stored.patchCount;
    if (stored.observed && typeof stored.observed === "object") observed = stored.observed;
    refreshBadge();
    console.log(TAG, "initialized", state, "observed endpoints:", Object.keys(observed).length);
  } catch (e) {
    console.error(TAG, "init failed", e);
  }
}
initialize();

// === STRIP Accept-Encoding sur /obligations (pour avoir du JSON en clair) ===

browserAPI.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (!state.enabled) return {};
    var headers = details.requestHeaders || [];
    for (var i = headers.length - 1; i >= 0; i--) {
      if (headers[i].name.toLowerCase() === "accept-encoding") {
        headers.splice(i, 1);
      }
    }
    return { requestHeaders: headers };
  },
  { urls: ENDPOINT_URL_FILTERS },
  ["blocking", "requestHeaders"]
);

// === PATCH /obligations ===

browserAPI.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (!state.enabled) return {};
    if (!details.url || details.url.indexOf(ENDPOINT_PATH) === -1) return {};

    console.log(TAG, "intercepting", details.url);

    var filter = browserAPI.webRequest.filterResponseData(details.requestId);
    var decoder = new TextDecoder("utf-8");
    var encoder = new TextEncoder();
    var chunks = [];

    filter.ondata = function (event) { chunks.push(event.data); };

    filter.onstop = function () {
      var total = 0;
      for (var i = 0; i < chunks.length; i++) total += chunks[i].byteLength;
      var merged = new Uint8Array(total);
      var offset = 0;
      for (var j = 0; j < chunks.length; j++) {
        merged.set(new Uint8Array(chunks[j]), offset);
        offset += chunks[j].byteLength;
      }
      try {
        var text = decoder.decode(merged);
        var data = JSON.parse(text);
        applyPatch(data);
        filter.write(encoder.encode(JSON.stringify(data)));
        state.patchCount++;
        state.lastPatchAt = new Date().toISOString();
        browserAPI.storage.local.set({ patchCount: state.patchCount });
        refreshBadge();
        browserAPI.runtime.sendMessage({ type: "PATCHED", state: state }).catch(function () {});
        console.log(TAG, "patched", { verificationState: state.verificationState, isRestricted: state.isRestricted });
      } catch (e) {
        console.warn(TAG, "patch failed, passing through", e);
        filter.write(merged);
      }
      filter.close();
    };

    filter.onerror = function () { console.warn(TAG, "filter error", filter.error); };
    return {};
  },
  { urls: ENDPOINT_URL_FILTERS },
  ["blocking"]
);

function applyPatch(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (!Array.isArray(obj.content)) return obj;
  for (var i = 0; i < obj.content.length; i++) {
    var item = obj.content[i];
    if (item && typeof item === "object") {
      item.verificationState = state.verificationState;
      item.isRestricted = state.isRestricted;
    }
  }
  return obj;
}

// === OBSERVATION PASSIVE DES ENDPOINTS /api/* ===

browserAPI.webRequest.onBeforeRequest.addListener(
  function (details) {
    try {
      if (!details.url) return;
      var u = new URL(details.url);
      if (u.pathname.indexOf("/api/") !== 0) return;
      var key = details.method + " " + u.pathname;
      var entry = observed[key];
      var now = Date.now();
      if (!entry) {
        entry = {
          method: details.method,
          path: u.pathname,
          statuses: {},
          count: 0,
          firstSeen: now,
          lastSeen: now,
          sampleUrl: details.url
        };
        observed[key] = entry;
      }
      entry.count++;
      entry.lastSeen = now;
      entry.sampleUrl = details.url;
      lastSeenStatus[details.requestId] = key;
    } catch (e) {}
  },
  { urls: API_URL_FILTERS }
);

browserAPI.webRequest.onCompleted.addListener(
  function (details) {
    try {
      var key = lastSeenStatus[details.requestId];
      if (!key) return;
      var entry = observed[key];
      if (!entry) return;
      var s = String(details.statusCode);
      entry.statuses[s] = (entry.statuses[s] || 0) + 1;
      delete lastSeenStatus[details.requestId];
      saveObservedDebounced();
    } catch (e) {}
  },
  { urls: API_URL_FILTERS }
);

browserAPI.webRequest.onErrorOccurred.addListener(
  function (details) {
    var key = lastSeenStatus[details.requestId];
    if (key) {
      var entry = observed[key];
      if (entry) {
        entry.statuses["error"] = (entry.statuses["error"] || 0) + 1;
      }
      delete lastSeenStatus[details.requestId];
    }
  },
  { urls: API_URL_FILTERS }
);

var saveTimer = null;
function saveObservedDebounced() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    browserAPI.storage.local.set({ observed: observed }).catch(function () {});
    browserAPI.runtime.sendMessage({ type: "OBSERVED_UPDATED" }).catch(function () {});
  }, 500);
}

// === SCAN ACTIF: probe methodes HTTP sur un path ===

async function probeMethod(targetUrl, method, body) {
  var opts = {
    method: method,
    credentials: "include",
    cache: "no-store",
    redirect: "manual"
  };
  if (body !== undefined && body !== null && method !== "GET" && method !== "HEAD") {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  var start = Date.now();
  try {
    var res = await fetch(targetUrl, opts);
    var duration = Date.now() - start;
    var contentLength = res.headers.get("content-length");
    var contentType = res.headers.get("content-type");
    var allowHeader = res.headers.get("allow");
    var bodySnippet = null;
    if (contentType && contentType.indexOf("application/json") === 0) {
      try {
        var txt = await res.text();
        bodySnippet = txt.length > 400 ? txt.substring(0, 400) + "..." : txt;
      } catch (e) {}
    } else if (contentType && contentType.indexOf("text/") === 0) {
      try {
        var t = await res.text();
        bodySnippet = t.length > 200 ? t.substring(0, 200) + "..." : t;
      } catch (e) {}
    }
    return {
      ok: true,
      method: method,
      url: targetUrl,
      status: res.status,
      statusText: res.statusText,
      contentLength: contentLength,
      contentType: contentType,
      allow: allowHeader,
      duration: duration,
      bodySnippet: bodySnippet
    };
  } catch (e) {
    return {
      ok: false,
      method: method,
      url: targetUrl,
      error: e && e.message ? e.message : String(e),
      duration: Date.now() - start
    };
  }
}

async function scanPath(path, methods, body) {
  if (!path) return [];
  var base = path.indexOf("http") === 0 ? path : ("https://starlink.com" + (path.indexOf("/") === 0 ? path : "/" + path));
  var results = [];
  for (var i = 0; i < methods.length; i++) {
    var r = await probeMethod(base, methods[i], body);
    results.push(r);
  }
  return results;
}

// === MESSAGES ===

browserAPI.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) return;

  if (message.type === "GET_STATE") {
    sendResponse({
      enabled: state.enabled,
      verificationState: state.verificationState,
      isRestricted: state.isRestricted,
      patchCount: state.patchCount,
      lastPatchAt: state.lastPatchAt
    });
    return true;
  }

  if (message.type === "SET_STATE") {
    if (typeof message.enabled === "boolean") state.enabled = message.enabled;
    if (typeof message.verificationState === "string") state.verificationState = message.verificationState;
    if (typeof message.isRestricted === "boolean") state.isRestricted = message.isRestricted;
    browserAPI.storage.local.set({
      enabled: state.enabled,
      verificationState: state.verificationState,
      isRestricted: state.isRestricted
    });
    refreshBadge();
    sendResponse({ ok: true, state: state });
    return true;
  }

  if (message.type === "RESET_COUNT") {
    state.patchCount = 0;
    state.lastPatchAt = null;
    browserAPI.storage.local.set({ patchCount: 0 });
    refreshBadge();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_OBSERVED") {
    sendResponse({ observed: observed });
    return true;
  }

  if (message.type === "CLEAR_OBSERVED") {
    observed = {};
    browserAPI.storage.local.set({ observed: {} });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "SCAN") {
    scanPath(message.path, message.methods || ["GET"], message.body)
      .then(function (r) { sendResponse({ ok: true, results: r }); })
      .catch(function (e) { sendResponse({ ok: false, error: e.message }); });
    return true;
  }

  if (message.type === "SCAN_BATCH") {
    (async function () {
      var all = [];
      for (var i = 0; i < message.paths.length; i++) {
        var results = await scanPath(message.paths[i], message.methods || ["GET"], message.body);
        all.push({ path: message.paths[i], results: results });
      }
      sendResponse({ ok: true, batch: all });
    })().catch(function (e) { sendResponse({ ok: false, error: e.message }); });
    return true;
  }

  if (message.type === "OPEN_SCANNER") {
    browserAPI.tabs.create({ url: browserAPI.runtime.getURL("scanner.html") });
    sendResponse({ ok: true });
    return true;
  }
});

// === BADGE ===

function refreshBadge() {
  try {
    if (state.enabled) {
      var label = state.patchCount > 0 ? String(state.patchCount) : "ON";
      browserAPI.browserAction.setBadgeText({ text: label });
      browserAPI.browserAction.setBadgeBackgroundColor({ color: "#2da44e" });
      browserAPI.browserAction.setTitle({ title: "Obligations Patcher - ACTIF" });
    } else {
      browserAPI.browserAction.setBadgeText({ text: "" });
      browserAPI.browserAction.setTitle({ title: "Obligations Patcher - inactif" });
    }
  } catch (e) {}
}

console.log(TAG, "background loaded");
