(() => {
  const ENDPOINT_PATH = "/api/accounts/v1/accounts/customer-details/obligations";

  const state = {
    enabled: false,
    payload: null
  };

  window.addEventListener("obligations-modifier:config", (event) => {
    const detail = event.detail || {};
    state.enabled = !!detail.enabled;
    state.payload = typeof detail.payload === "string" ? detail.payload : null;
  });

  window.dispatchEvent(new CustomEvent("obligations-modifier:request-config"));

  function isTargetUrl(url) {
    if (!url) return false;
    try {
      const u = typeof url === "string" ? new URL(url, location.origin) : new URL(url.url || url.toString(), location.origin);
      return u.pathname === ENDPOINT_PATH;
    } catch {
      return typeof url === "string" && url.includes(ENDPOINT_PATH);
    }
  }

  function buildPayload() {
    if (state.payload) return state.payload;
    return JSON.stringify({
      content: [],
      errors: [],
      warnings: [],
      information: [],
      isValid: true
    });
  }

  function buildModifiedResponse(originalResponse) {
    const body = buildPayload();
    const headers = new Headers(originalResponse ? originalResponse.headers : {});
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.delete("Content-Length");
    headers.delete("Content-Encoding");
    return new Response(body, {
      status: 200,
      statusText: "OK",
      headers
    });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    if (state.enabled && isTargetUrl(url)) {
      try {
        const original = await originalFetch(input, init);
        const modified = buildModifiedResponse(original);
        console.info("[ObligationsModifier] fetch reponse modifiee pour", url);
        return modified;
      } catch (err) {
        console.warn("[ObligationsModifier] erreur lors du fetch original, on renvoie quand meme une reponse modifiee", err);
        return buildModifiedResponse(null);
      }
    }
    return originalFetch(input, init);
  };

  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    let targetUrl = null;
    let intercept = false;

    const open = xhr.open;
    xhr.open = function (method, url, ...rest) {
      targetUrl = url;
      intercept = state.enabled && isTargetUrl(url);
      return open.call(xhr, method, url, ...rest);
    };

    const send = xhr.send;
    xhr.send = function (...args) {
      if (!intercept) return send.apply(xhr, args);

      const body = buildPayload();

      const fire = () => {
        try {
          Object.defineProperty(xhr, "readyState", { configurable: true, get: () => 4 });
          Object.defineProperty(xhr, "status", { configurable: true, get: () => 200 });
          Object.defineProperty(xhr, "statusText", { configurable: true, get: () => "OK" });
          Object.defineProperty(xhr, "responseText", { configurable: true, get: () => body });
          Object.defineProperty(xhr, "response", { configurable: true, get: () => body });
          Object.defineProperty(xhr, "responseURL", { configurable: true, get: () => targetUrl });
          Object.defineProperty(xhr, "getAllResponseHeaders", {
            configurable: true,
            value: () => "content-type: application/json; charset=utf-8\r\n"
          });
          Object.defineProperty(xhr, "getResponseHeader", {
            configurable: true,
            value: (name) => (String(name).toLowerCase() === "content-type" ? "application/json; charset=utf-8" : null)
          });
        } catch (e) {
          console.warn("[ObligationsModifier] XHR override partiel", e);
        }

        const evt = new Event("readystatechange");
        xhr.dispatchEvent(evt);
        if (typeof xhr.onreadystatechange === "function") xhr.onreadystatechange(evt);

        const loadEvt = new Event("load");
        xhr.dispatchEvent(loadEvt);
        if (typeof xhr.onload === "function") xhr.onload(loadEvt);

        const endEvt = new Event("loadend");
        xhr.dispatchEvent(endEvt);
        if (typeof xhr.onloadend === "function") xhr.onloadend(endEvt);

        console.info("[ObligationsModifier] XHR reponse modifiee pour", targetUrl);
      };

      setTimeout(fire, 0);
    };

    return xhr;
  }
  PatchedXHR.prototype = OriginalXHR.prototype;
  PatchedXHR.UNSENT = 0;
  PatchedXHR.OPENED = 1;
  PatchedXHR.HEADERS_RECEIVED = 2;
  PatchedXHR.LOADING = 3;
  PatchedXHR.DONE = 4;
  window.XMLHttpRequest = PatchedXHR;

  console.info("[ObligationsModifier] interceptor installe pour", ENDPOINT_PATH);
})();
