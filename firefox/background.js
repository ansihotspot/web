// Starlink Obligations Patcher - Firefox Background Script
// Utilise webRequest.filterResponseData pour reecrire la reponse au niveau
// reseau, sans dependre de la CSP de la page.

var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var TAG = "[OblPatcher]";
var ENDPOINT_PATH = "/api/accounts/v1/accounts/customer-details/obligations";
var URL_FILTERS = [
  "https://starlink.com/api/accounts/v1/accounts/customer-details/obligations*",
  "https://*.starlink.com/api/accounts/v1/accounts/customer-details/obligations*"
];

var state = {
  enabled: false,
  verificationState: "Required",
  isRestricted: false,
  patchCount: 0,
  lastPatchAt: null
};

// === INITIALISATION ===

async function initialize() {
  try {
    var stored = await browserAPI.storage.local.get([
      "enabled", "verificationState", "isRestricted", "patchCount"
    ]);
    if (typeof stored.enabled === "boolean") state.enabled = stored.enabled;
    if (typeof stored.verificationState === "string") state.verificationState = stored.verificationState;
    if (typeof stored.isRestricted === "boolean") state.isRestricted = stored.isRestricted;
    if (typeof stored.patchCount === "number") state.patchCount = stored.patchCount;
    refreshBadge();
    console.log(TAG, "initialized", state);
  } catch (e) {
    console.error(TAG, "init failed", e);
  }
}
initialize();

// === STRIP Accept-Encoding pour avoir une reponse en clair ===

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
  { urls: URL_FILTERS },
  ["blocking", "requestHeaders"]
);

// === INTERCEPTION ET PATCH DE LA REPONSE ===

browserAPI.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (!state.enabled) return {};
    if (!details.url || details.url.indexOf(ENDPOINT_PATH) === -1) return {};

    console.log(TAG, "intercepting", details.url);

    var filter = browserAPI.webRequest.filterResponseData(details.requestId);
    var decoder = new TextDecoder("utf-8");
    var encoder = new TextEncoder();
    var chunks = [];

    filter.ondata = function (event) {
      chunks.push(event.data);
    };

    filter.onstop = function () {
      var totalLength = 0;
      for (var i = 0; i < chunks.length; i++) totalLength += chunks[i].byteLength;
      var merged = new Uint8Array(totalLength);
      var offset = 0;
      for (var j = 0; j < chunks.length; j++) {
        merged.set(new Uint8Array(chunks[j]), offset);
        offset += chunks[j].byteLength;
      }

      try {
        var text = decoder.decode(merged);
        var data = JSON.parse(text);
        var modified = applyPatch(data);
        var out = JSON.stringify(modified);
        filter.write(encoder.encode(out));
        state.patchCount++;
        state.lastPatchAt = new Date().toISOString();
        browserAPI.storage.local.set({ patchCount: state.patchCount });
        refreshBadge();
        browserAPI.runtime.sendMessage({ type: "PATCHED", state: state }).catch(function () {});
        console.log(TAG, "patched response", { verificationState: state.verificationState, isRestricted: state.isRestricted });
      } catch (e) {
        console.warn(TAG, "patch failed, passing through", e);
        filter.write(merged);
      }

      filter.close();
    };

    filter.onerror = function () {
      console.warn(TAG, "filter error", filter.error);
    };

    return {};
  },
  { urls: URL_FILTERS },
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

// === MESSAGES POPUP ===

browserAPI.runtime.onMessage.addListener(function (message, sender, sendResponse) {
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

console.log(TAG, "background loaded, watching", ENDPOINT_PATH);
