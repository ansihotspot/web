// Starlink Form Submitter - Background Service Worker (Chrome MV3)
// Minimal: only the submit endpoint + auto-capture of the account
// number from /api/webagg/v1/referrals/account-info/ACC-...

var browserAPI = typeof browser !== "undefined" ? browser : chrome;
var TAG = "[FormSubmit]";

// --- Capture du numero de compte depuis l'URL referrals/account-info ---

var ACCOUNT_INFO_FILTERS = [
  "https://starlink.com/api/webagg/v1/referrals/account-info/*",
  "https://*.starlink.com/api/webagg/v1/referrals/account-info/*"
];

var ACC_REGEX = /\/account-info\/(ACC[A-Z0-9-]+)/i;

browserAPI.webRequest.onBeforeRequest.addListener(
  function (details) {
    try {
      var m = details.url.match(ACC_REGEX);
      if (m && m[1]) {
        var acc = m[1];
        browserAPI.storage.local.set({ accountNumber: acc });
        try {
          var p = browserAPI.runtime.sendMessage({ type: "ACCOUNT_DETECTED", accountNumber: acc });
          if (p && typeof p.catch === "function") p.catch(function () {});
        } catch (e) {}
        console.log(TAG, "account detected:", acc);
      }
    } catch (e) {}
  },
  { urls: ACCOUNT_INFO_FILTERS }
);

// --- Submit handler (POST/PUT/PATCH/DELETE/GET avec cookies) ---

async function submitRequest(url, method, rawBody) {
  var start = Date.now();
  var opts = {
    method: method || "POST",
    credentials: "include",
    cache: "no-store",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  };
  if (method !== "GET" && method !== "HEAD") {
    opts.body = rawBody || "";
  }
  var res = await fetch(url, opts);
  var text = "";
  try { text = await res.text(); } catch (e) {}
  var bodySnippet = text.length > 5000 ? text.substring(0, 5000) + "\n... (tronque)" : text;
  return {
    url: url,
    method: method,
    status: res.status,
    statusText: res.statusText,
    contentType: res.headers.get("content-type"),
    contentLength: res.headers.get("content-length"),
    duration: Date.now() - start,
    bodySnippet: bodySnippet
  };
}

browserAPI.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) return;

  if (message.type === "SUBMIT") {
    submitRequest(message.url, message.method, message.body)
      .then(function (r) { sendResponse({ ok: true, result: r }); })
      .catch(function (e) { sendResponse({ ok: false, error: e.message || String(e) }); });
    return true;
  }

  if (message.type === "GET_ACCOUNT") {
    browserAPI.storage.local.get(["accountNumber"], function (s) {
      sendResponse({ accountNumber: s.accountNumber || null });
    });
    return true;
  }

  if (message.type === "OPEN_FORM") {
    browserAPI.tabs.create({ url: browserAPI.runtime.getURL("form.html") });
    sendResponse({ ok: true });
    return true;
  }
});

// MV3: action.onClicked (au lieu de browserAction.onClicked)
browserAPI.action.onClicked.addListener(function () {
  browserAPI.tabs.create({ url: browserAPI.runtime.getURL("form.html") });
});

console.log(TAG, "background loaded");
