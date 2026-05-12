(() => {
  const ENDPOINT_PATH = "/api/accounts/v1/accounts/customer-details/obligations";

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
    if (!state.enabled || !isTargetUrl(url)) {
      return originalFetch(input, init);
    }
    const response = await originalFetch(input, init);
    try {
      const cloned = response.clone();
      const text = await cloned.text();
      const data = JSON.parse(text);
      applyPatch(data);
      const newBody = JSON.stringify(data);
      console.info("[ObligationsModifier] fetch patche pour", url, state.patch);
      return rebuildResponse(response, newBody);
    } catch (e) {
      console.warn("[ObligationsModifier] echec patch, reponse originale renvoyee", e);
      return response;
    }
  };

  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    let targetUrl = null;
    let intercept = false;
    let originalForcedText = null;

    const open = xhr.open;
    xhr.open = function (method, url, ...rest) {
      targetUrl = url;
      intercept = isTargetUrl(url);
      return open.call(xhr, method, url, ...rest);
    };

    xhr.addEventListener("readystatechange", () => {
      if (!intercept || !state.enabled) return;
      if (xhr.readyState !== 4) return;
      try {
        const raw = xhr.responseText;
        const data = JSON.parse(raw);
        applyPatch(data);
        originalForcedText = JSON.stringify(data);
        Object.defineProperty(xhr, "responseText", { configurable: true, get: () => originalForcedText });
        Object.defineProperty(xhr, "response", { configurable: true, get: () => originalForcedText });
        console.info("[ObligationsModifier] XHR patche pour", targetUrl, state.patch);
      } catch (e) {
        console.warn("[ObligationsModifier] XHR patch impossible", e);
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

  console.info("[ObligationsModifier] patcher installe pour", ENDPOINT_PATH);
})();
