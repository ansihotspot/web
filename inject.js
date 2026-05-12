(() => {
  const TAG = "[ObligationsModifier:main]";
  const ENDPOINT_PATH = "/api/accounts/v1/accounts/customer-details/obligations";

  if (window.__obligationsModifierInstalled) {
    console.info(TAG, "already installed, skipping");
    return;
  }
  window.__obligationsModifierInstalled = true;

  const state = {
    enabled: false,
    patch: { verificationState: "Required", isRestricted: false }
  };

  window.addEventListener("obligations-modifier:config", (event) => {
    const detail = event.detail || {};
    state.enabled = !!detail.enabled;
    if (detail.patch && typeof detail.patch === "object") {
      state.patch = {
        verificationState: detail.patch.verificationState ?? "Required",
        isRestricted: !!detail.patch.isRestricted
      };
    }
    console.info(TAG, "config updated", { ...state });
  });

  window.dispatchEvent(new CustomEvent("obligations-modifier:request-config"));

  function isTargetUrl(url) {
    if (!url) return false;
    try {
      const u = typeof url === "string"
        ? new URL(url, location.origin)
        : new URL(url.url || url.toString(), location.origin);
      return u.pathname === ENDPOINT_PATH;
    } catch {
      return typeof url === "string" && url.includes(ENDPOINT_PATH);
    }
  }

  function applyPatch(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (!Array.isArray(obj.content)) return obj;
    for (const item of obj.content) {
      if (item && typeof item === "object") {
        item.verificationState = state.patch.verificationState;
        item.isRestricted = state.patch.isRestricted;
      }
    }
    return obj;
  }

  function rebuildResponse(originalResponse, modifiedBody) {
    const headers = new Headers(originalResponse.headers);
    headers.delete("Content-Length");
    headers.delete("Content-Encoding");
    headers.set("Content-Type", "application/json; charset=utf-8");
    return new Response(modifiedBody, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers
    });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    const matches = isTargetUrl(url);
    if (matches) {
      console.info(TAG, "fetch detected on target", url, "enabled =", state.enabled);
    }
    if (!state.enabled || !matches) {
      return originalFetch(input, init);
    }
    const response = await originalFetch(input, init);
    try {
      const cloned = response.clone();
      const text = await cloned.text();
      const data = JSON.parse(text);
      applyPatch(data);
      const newBody = JSON.stringify(data);
      console.info(TAG, "fetch patched", state.patch);
      return rebuildResponse(response, newBody);
    } catch (e) {
      console.warn(TAG, "patch failed, returning original", e);
      return response;
    }
  };

  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    let targetUrl = null;
    let intercept = false;
    let forcedText = null;

    const open = xhr.open;
    xhr.open = function (method, url, ...rest) {
      targetUrl = url;
      intercept = isTargetUrl(url);
      if (intercept) {
        console.info(TAG, "XHR open on target", url, "enabled =", state.enabled);
      }
      return open.call(xhr, method, url, ...rest);
    };

    xhr.addEventListener("readystatechange", () => {
      if (!intercept || !state.enabled) return;
      if (xhr.readyState !== 4) return;
      try {
        const raw = xhr.responseText;
        const data = JSON.parse(raw);
        applyPatch(data);
        forcedText = JSON.stringify(data);
        Object.defineProperty(xhr, "responseText", { configurable: true, get: () => forcedText });
        Object.defineProperty(xhr, "response", { configurable: true, get: () => forcedText });
        console.info(TAG, "XHR patched", state.patch);
      } catch (e) {
        console.warn(TAG, "XHR patch failed", e);
      }
    });

    return xhr;
  }
  PatchedXHR.prototype = OriginalXHR.prototype;
  PatchedXHR.UNSENT = 0;
  PatchedXHR.OPENED = 1;
  PatchedXHR.HEADERS_RECEIVED = 2;
  PatchedXHR.LOADING = 3;
  PatchedXHR.DONE = 4;
  window.XMLHttpRequest = PatchedXHR;

  console.info(TAG, "interceptor installed in MAIN world for", ENDPOINT_PATH);
})();
