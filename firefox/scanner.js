var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var observedTableBody, resultsTableBody, observedEmpty, resultsEmpty;
var observedCountEl, totalCallsEl, scanCountEl;
var filterInput, runScanBtn, scanPathsEl, scanBodyEl, refreshBtn, clearObsBtn;
var methodChipsContainer;
var probeCount = 0;
var observedCache = {};
var lastScanResults = []; // flat list of probe results from active scan

document.addEventListener("DOMContentLoaded", function () {
  observedTableBody = document.querySelector("#observedTable tbody");
  resultsTableBody = document.querySelector("#resultsTable tbody");
  observedEmpty = document.getElementById("observedEmpty");
  resultsEmpty = document.getElementById("resultsEmpty");
  observedCountEl = document.getElementById("observedCount");
  totalCallsEl = document.getElementById("totalCalls");
  scanCountEl = document.getElementById("scanCount");
  filterInput = document.getElementById("filterInput");
  runScanBtn = document.getElementById("runScanBtn");
  scanPathsEl = document.getElementById("scanPaths");
  scanBodyEl = document.getElementById("scanBody");
  refreshBtn = document.getElementById("refreshBtn");
  clearObsBtn = document.getElementById("clearObsBtn");
  methodChipsContainer = document.getElementById("methodsGrid");

  refreshBtn.addEventListener("click", loadObserved);
  clearObsBtn.addEventListener("click", clearObserved);
  filterInput.addEventListener("input", renderObserved);
  runScanBtn.addEventListener("click", runScan);

  loadObserved();
  listenForUpdates();
});

function loadObserved() {
  browserAPI.runtime.sendMessage({ type: "GET_OBSERVED" }, function (resp) {
    observedCache = (resp && resp.observed) || {};
    renderObserved();
  });
}

function renderObserved() {
  var filter = (filterInput.value || "").trim().toLowerCase();
  var entries = Object.keys(observedCache).map(function (k) { return observedCache[k]; });
  if (filter) {
    entries = entries.filter(function (e) {
      return (e.method + " " + e.path).toLowerCase().indexOf(filter) !== -1;
    });
  }
  entries.sort(function (a, b) {
    if (a.path === b.path) return a.method.localeCompare(b.method);
    return a.path.localeCompare(b.path);
  });

  var totalCalls = entries.reduce(function (s, e) { return s + e.count; }, 0);
  observedCountEl.textContent = entries.length;
  totalCallsEl.textContent = totalCalls;

  observedTableBody.innerHTML = "";
  observedEmpty.style.display = entries.length === 0 ? "block" : "none";

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var tr = document.createElement("tr");

    var tdM = document.createElement("td");
    tdM.innerHTML = '<span class="method ' + e.method + '">' + e.method + '</span>';
    tr.appendChild(tdM);

    var tdP = document.createElement("td");
    tdP.className = "path";
    tdP.textContent = e.path;
    tr.appendChild(tdP);

    var tdS = document.createElement("td");
    tdS.innerHTML = formatStatuses(e.statuses);
    tr.appendChild(tdS);

    var tdC = document.createElement("td");
    tdC.textContent = e.count;
    tr.appendChild(tdC);

    var tdA = document.createElement("td");
    tdA.className = "row-actions";
    var probeBtn = document.createElement("button");
    probeBtn.className = "small-btn";
    probeBtn.textContent = "Probe methodes";
    probeBtn.dataset.path = e.path;
    probeBtn.addEventListener("click", function (ev) {
      probePath(ev.currentTarget.dataset.path);
    });
    tdA.appendChild(probeBtn);

    var addBtn = document.createElement("button");
    addBtn.className = "small-btn";
    addBtn.textContent = "+ scan";
    addBtn.dataset.path = e.path;
    addBtn.addEventListener("click", function (ev) {
      var path = ev.currentTarget.dataset.path;
      var current = scanPathsEl.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
      if (current.indexOf(path) === -1) {
        current.push(path);
        scanPathsEl.value = current.join("\n");
        showToast("Ajoute a la liste de scan");
      }
    });
    tdA.appendChild(addBtn);

    tr.appendChild(tdA);
    observedTableBody.appendChild(tr);
  }
}

function formatStatuses(statuses) {
  var keys = Object.keys(statuses || {});
  if (keys.length === 0) return '<span style="color:#555;">-</span>';
  var html = "";
  keys.sort();
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var n = statuses[k];
    html += '<span class="status ' + statusClass(k) + '">' + k + (n > 1 ? "x" + n : "") + '</span> ';
  }
  return html;
}

function statusClass(s) {
  if (s === "error") return "serr";
  if (s === "401" || s === "403") return "s" + s;
  var n = parseInt(s, 10);
  if (n >= 200 && n < 300) return "s2";
  if (n >= 300 && n < 400) return "s3";
  if (n >= 400 && n < 500) return "s4";
  if (n >= 500) return "s5";
  return "serr";
}

function clearObserved() {
  if (!confirm("Vider la liste des endpoints observes ?")) return;
  browserAPI.runtime.sendMessage({ type: "CLEAR_OBSERVED" }, function () {
    observedCache = {};
    renderObserved();
    showToast("Liste videe");
  });
}

function getSelectedMethods() {
  var checks = methodChipsContainer.querySelectorAll("input[type=checkbox]");
  var methods = [];
  for (var i = 0; i < checks.length; i++) {
    if (checks[i].checked) methods.push(checks[i].value);
  }
  return methods;
}

function runScan() {
  var paths = scanPathsEl.value
    .split("\n")
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
  if (paths.length === 0) {
    showToast("Aucun path");
    return;
  }
  var methods = getSelectedMethods();
  if (methods.length === 0) {
    showToast("Aucune methode selectionnee");
    return;
  }

  var body = (scanBodyEl.value || "").trim() || null;

  runScanBtn.disabled = true;
  runScanBtn.textContent = "Scan en cours...";
  resultsTableBody.innerHTML = "";
  resultsEmpty.style.display = "none";

  browserAPI.runtime.sendMessage({
    type: "SCAN_BATCH",
    paths: paths,
    methods: methods,
    body: body
  }, function (resp) {
    runScanBtn.disabled = false;
    runScanBtn.textContent = "Lancer le scan";
    if (!resp || !resp.ok) {
      showToast("Echec: " + (resp && resp.error ? resp.error : "?"));
      return;
    }
    renderResults(resp.batch);
  });
}

function probePath(path) {
  var methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  resultsTableBody.innerHTML = "";
  resultsEmpty.style.display = "none";
  showToast("Probe " + path);
  browserAPI.runtime.sendMessage({
    type: "SCAN",
    path: path,
    methods: methods,
    body: "{}"
  }, function (resp) {
    if (!resp || !resp.ok) {
      showToast("Echec probe");
      return;
    }
    renderResults([{ path: path, results: resp.results }]);
  });
}

function renderResults(batch) {
  resultsTableBody.innerHTML = "";
  lastScanResults = [];
  var any = false;
  for (var i = 0; i < batch.length; i++) {
    var path = batch[i].path;
    var results = batch[i].results || [];
    for (var j = 0; j < results.length; j++) {
      any = true;
      var r = results[j];
      lastScanResults.push({ path: path, method: r.method, status: r.ok ? r.status : 0, statusText: r.statusText || r.error || "", contentType: r.contentType, allow: r.allow });
      probeCount++;
      var tr = document.createElement("tr");

      var tdM = document.createElement("td");
      tdM.innerHTML = '<span class="method ' + r.method + '">' + r.method + '</span>';
      tr.appendChild(tdM);

      var tdP = document.createElement("td");
      tdP.className = "path";
      tdP.textContent = path;
      tr.appendChild(tdP);

      var tdS = document.createElement("td");
      if (r.ok) {
        var cls = "status " + statusClass(String(r.status));
        var label = r.status + (r.statusText ? " " + r.statusText : "");
        tdS.innerHTML = '<span class="' + cls + '">' + label + '</span>';
      } else {
        tdS.innerHTML = '<span class="status serr">ERR</span> ' + (r.error || "");
      }
      tr.appendChild(tdS);

      var tdT = document.createElement("td");
      tdT.textContent = r.contentType ? r.contentType.split(";")[0] : "-";
      tr.appendChild(tdT);

      var tdA = document.createElement("td");
      tdA.textContent = r.allow || "-";
      tr.appendChild(tdA);

      resultsTableBody.appendChild(tr);
    }
  }
  resultsEmpty.style.display = any ? "none" : "block";
  scanCountEl.textContent = probeCount;
}

// === BRUTEFORCE ===

var bruteResults = [];

function initBruteforce() {
  var ta = document.getElementById("bruteWordlist");
  var count = document.getElementById("bruteWordlistCount");
  if (ta && window.DEFAULT_WORDLIST) {
    ta.value = window.DEFAULT_WORDLIST.join("\n");
  }
  updateWordlistCount();
  ta.addEventListener("input", updateWordlistCount);

  document.getElementById("resetWordlistBtn").addEventListener("click", function () {
    if (window.DEFAULT_WORDLIST) {
      ta.value = window.DEFAULT_WORDLIST.join("\n");
      updateWordlistCount();
      showToast("Wordlist par defaut restauree");
    }
  });

  document.getElementById("runBruteBtn").addEventListener("click", runBruteforce);
  document.getElementById("cancelBruteBtn").addEventListener("click", cancelBruteforce);
  document.getElementById("exportBruteBtn").addEventListener("click", exportBruteforce);
}

function updateWordlistCount() {
  var ta = document.getElementById("bruteWordlist");
  var count = document.getElementById("bruteWordlistCount");
  if (!ta || !count) return;
  var n = ta.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).length;
  count.textContent = n;
}

function getBruteMethods() {
  var checks = document.querySelectorAll("#bruteMethodsGrid input[type=checkbox]");
  var out = [];
  for (var i = 0; i < checks.length; i++) {
    if (checks[i].checked) out.push(checks[i].value);
  }
  return out;
}

function runBruteforce() {
  var base = document.getElementById("bruteBase").value.trim();
  if (!base) { showToast("Base path requise"); return; }
  var wordlist = document.getElementById("bruteWordlist").value
    .split("\n")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  if (wordlist.length === 0) { showToast("Wordlist vide"); return; }

  var methods = getBruteMethods();
  if (methods.length === 0) { showToast("Aucune methode"); return; }

  var concurrency = parseInt(document.getElementById("bruteConcurrency").value, 10) || 6;
  var hideNotFound = document.getElementById("hideNotFound").checked;
  var body = (document.getElementById("bruteBody").value || "").trim() || null;

  bruteResults = [];
  document.querySelector("#bruteResultsTable tbody").innerHTML = "";
  document.getElementById("bruteResultsEmpty").style.display = "none";
  document.getElementById("bruteProgress").style.display = "block";
  document.getElementById("bruteProgressText").textContent = "0 / " + (wordlist.length * methods.length);
  document.getElementById("bruteFoundCount").textContent = "0";
  document.getElementById("bruteProgressBar").style.width = "0%";
  document.getElementById("runBruteBtn").disabled = true;
  document.getElementById("runBruteBtn").textContent = "En cours...";
  document.getElementById("cancelBruteBtn").style.display = "inline-block";

  browserAPI.runtime.sendMessage({
    type: "BRUTEFORCE",
    options: {
      basePath: base,
      wordlist: wordlist,
      methods: methods,
      concurrency: concurrency,
      hideNotFound: hideNotFound,
      body: body
    }
  }, function (resp) {
    // resolved when bruteforce ends
  });
}

function cancelBruteforce() {
  browserAPI.runtime.sendMessage({ type: "BRUTEFORCE_CANCEL" });
}

function appendBruteHit(msg) {
  bruteResults.push(msg);
  document.getElementById("bruteResultsEmpty").style.display = "none";
  var tbody = document.querySelector("#bruteResultsTable tbody");
  var tr = document.createElement("tr");

  var tdM = document.createElement("td");
  tdM.innerHTML = '<span class="method ' + msg.method + '">' + msg.method + '</span>';
  tr.appendChild(tdM);

  var tdSeg = document.createElement("td");
  tdSeg.className = "path";
  tdSeg.textContent = msg.segment;
  tr.appendChild(tdSeg);

  var tdP = document.createElement("td");
  tdP.className = "path";
  tdP.textContent = msg.path;
  tr.appendChild(tdP);

  var tdS = document.createElement("td");
  if (msg.status > 0) {
    tdS.innerHTML = '<span class="status ' + statusClass(String(msg.status)) + '">' + msg.status + ' ' + (msg.statusText || "") + '</span>';
  } else {
    tdS.innerHTML = '<span class="status serr">ERR</span>';
  }
  tr.appendChild(tdS);

  var tdT = document.createElement("td");
  tdT.textContent = msg.contentType ? msg.contentType.split(";")[0] : "-";
  tr.appendChild(tdT);

  var tdA = document.createElement("td");
  tdA.textContent = msg.allow || "-";
  tr.appendChild(tdA);

  tbody.appendChild(tr);
}

function exportBruteforce() {
  if (bruteResults.length === 0) {
    showToast("Aucun resultat a exporter");
    return;
  }
  var data = JSON.stringify(bruteResults, null, 2);
  var blob = new Blob([data], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "starlink-bruteforce-" + Date.now() + ".json";
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showToast("Export OK (" + bruteResults.length + " hits)");
}

function listenForUpdates() {
  browserAPI.runtime.onMessage.addListener(function (message) {
    if (!message || !message.type) return;
    if (message.type === "OBSERVED_UPDATED") loadObserved();

    if (message.type === "BRUTEFORCE_START") {
      // noop
    }
    if (message.type === "BRUTEFORCE_HIT") {
      appendBruteHit(message);
    }
    if (message.type === "BRUTEFORCE_PROGRESS") {
      document.getElementById("bruteProgressText").textContent = message.done + " / " + message.total;
      document.getElementById("bruteFoundCount").textContent = message.found;
      var pct = message.total > 0 ? (message.done / message.total * 100) : 0;
      document.getElementById("bruteProgressBar").style.width = pct + "%";
    }
    if (message.type === "BRUTEFORCE_DONE") {
      document.getElementById("runBruteBtn").disabled = false;
      document.getElementById("runBruteBtn").textContent = "Lancer le bruteforce";
      document.getElementById("cancelBruteBtn").style.display = "none";
      showToast(message.canceled ? "Bruteforce annule" : "Bruteforce termine - " + message.found + " hits");
    }
  });
}

initBruteforce();

// === COPY / EXPORT ===

function copyToClipboard(text, label) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showToast(label || "Copie!");
    }).catch(function () { fallbackCopy(text, label); });
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); showToast(label || "Copie!"); }
  catch (e) { showToast("Echec copie"); }
  document.body.removeChild(ta);
}

function formatAsText(rows) {
  return rows.map(function (r) {
    var s = r.status ? String(r.status) : "ERR";
    return s.padEnd(4) + " " + (r.method || "?").padEnd(7) + " " + r.path;
  }).join("\n");
}

function formatAsCurl(rows) {
  var seen = {};
  var out = [];
  rows.forEach(function (r) {
    var key = r.method + " " + r.path;
    if (seen[key]) return;
    seen[key] = 1;
    var url = "https://starlink.com" + (r.path.indexOf("/") === 0 ? r.path : "/" + r.path);
    var line = "curl -X " + r.method + " '" + url + "'";
    line += " -b 'Starlink.Com.Sso=...; Starlink.Com.Access.V1=...'";
    if (r.method !== "GET" && r.method !== "HEAD" && r.method !== "OPTIONS") {
      line += " -H 'Content-Type: application/json'";
      line += " --data '{}'";
    }
    out.push(line);
  });
  return out.join("\n\n");
}

function initCopyExport() {
  var bind = function (id, getter, label) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () {
      var v = getter();
      if (!v) { showToast("Rien a copier"); return; }
      copyToClipboard(v, label);
    });
  };

  bind("copyScanJsonBtn", function () { return JSON.stringify(lastScanResults, null, 2); }, "JSON copie (scan)");
  bind("copyScanTextBtn", function () { return formatAsText(lastScanResults); }, "Texte copie (scan)");
  bind("copyScanCurlBtn", function () { return formatAsCurl(lastScanResults); }, "cURL copie (scan)");

  bind("copyBruteJsonBtn", function () { return JSON.stringify(bruteResults, null, 2); }, "JSON copie (brute)");
  bind("copyBruteTextBtn", function () { return formatAsText(bruteResults); }, "Texte copie (brute)");
  bind("copyBruteCurlBtn", function () { return formatAsCurl(bruteResults); }, "cURL copie (brute)");
}
initCopyExport();

// === SUBMIT POST/PUT/PATCH ===

function buildSubmitBody() {
  var shape = document.getElementById("submitBodyShape").value;
  var verificationState = document.getElementById("submitVerifState").value;
  var isRestricted = document.getElementById("submitIsRestricted").value === "true";

  if (shape === "custom") {
    return document.getElementById("submitBody").value;
  }
  if (shape === "flat") {
    return JSON.stringify({ verificationState: verificationState, isRestricted: isRestricted }, null, 2);
  }
  if (shape === "wrappedContent") {
    return JSON.stringify({
      content: [{ verificationState: verificationState, isRestricted: isRestricted }]
    }, null, 2);
  }
  if (shape === "wrappedItem") {
    return JSON.stringify({
      verificationState: verificationState,
      isRestricted: isRestricted,
      configurationId: -62
    }, null, 2);
  }
  return "";
}

function rebuildSubmitBody() {
  var bodyEl = document.getElementById("submitBody");
  var shape = document.getElementById("submitBodyShape").value;
  if (shape !== "custom") {
    bodyEl.value = buildSubmitBody();
  }
}

function applyPreset() {
  var preset = document.getElementById("submitPreset").value;
  if (preset === "custom") return;
  var parts = preset.split("|");
  var method = parts[0];
  var path = parts[1];
  document.querySelector('input[name="submitMethod"][value="' + method + '"]').checked = true;
  document.getElementById("submitUrl").value = "https://starlink.com" + path;
}

function initSubmit() {
  var preset = document.getElementById("submitPreset");
  var shape = document.getElementById("submitBodyShape");
  var verifEl = document.getElementById("submitVerifState");
  var restrictedEl = document.getElementById("submitIsRestricted");
  var bodyEl = document.getElementById("submitBody");
  var responseEl = document.getElementById("submitResponse");

  preset.addEventListener("change", function () {
    applyPreset();
  });
  shape.addEventListener("change", rebuildSubmitBody);
  verifEl.addEventListener("input", rebuildSubmitBody);
  restrictedEl.addEventListener("change", rebuildSubmitBody);

  document.getElementById("rebuildBodyBtn").addEventListener("click", function () {
    bodyEl.value = buildSubmitBody();
    showToast("Body reconstruit");
  });

  document.getElementById("submitBtn").addEventListener("click", function () {
    var url = document.getElementById("submitUrl").value.trim();
    var method = document.querySelector('input[name="submitMethod"]:checked').value;
    var body = bodyEl.value;
    if (!url) { showToast("URL requise"); return; }

    responseEl.style.color = "#aaa";
    responseEl.textContent = "Envoi en cours...\n" + method + " " + url + "\n\n" + body;

    browserAPI.runtime.sendMessage({
      type: "SUBMIT",
      url: url,
      method: method,
      body: body
    }, function (resp) {
      if (!resp) {
        responseEl.style.color = "#e94560";
        responseEl.textContent = "Pas de reponse";
        return;
      }
      if (!resp.ok && resp.error) {
        responseEl.style.color = "#e94560";
        responseEl.textContent = "ERREUR\n" + resp.error;
        return;
      }
      var r = resp.result;
      var cls = r.status >= 200 && r.status < 300 ? "#4CAF50" : (r.status >= 400 ? "#e94560" : "#FF9800");
      responseEl.style.color = cls;
      var out = "Status: " + r.status + " " + (r.statusText || "") + "\n";
      out += "Content-Type: " + (r.contentType || "-") + "\n";
      out += "Duree: " + r.duration + "ms\n\n";
      out += "--- BODY ---\n";
      out += r.bodySnippet || "(pas de body texte)";
      responseEl.textContent = out;
      showToast(r.status >= 200 && r.status < 300 ? "Succes!" : "Reponse " + r.status);
    });
  });

  document.getElementById("copyResponseBtn").addEventListener("click", function () {
    copyToClipboard(responseEl.textContent, "Reponse copiee");
  });

  document.getElementById("copyCurlBtn").addEventListener("click", function () {
    var url = document.getElementById("submitUrl").value.trim();
    var method = document.querySelector('input[name="submitMethod"]:checked').value;
    var body = bodyEl.value;
    var cmd = "curl -X " + method + " '" + url + "' \\\n";
    cmd += "  -H 'Content-Type: application/json' \\\n";
    cmd += "  -H 'Accept: application/json' \\\n";
    cmd += "  -b 'Starlink.Com.Sso=...; Starlink.Com.Access.V1=...' \\\n";
    cmd += "  --data " + JSON.stringify(body);
    copyToClipboard(cmd, "cURL copie");
  });

  // initial body fill
  rebuildSubmitBody();
}
initSubmit();

function showToast(text) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 1800);
}
