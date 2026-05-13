var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var observedTableBody, resultsTableBody, observedEmpty, resultsEmpty;
var observedCountEl, totalCallsEl, scanCountEl;
var filterInput, runScanBtn, scanPathsEl, scanBodyEl, refreshBtn, clearObsBtn;
var methodChipsContainer;
var probeCount = 0;
var observedCache = {};

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
  var any = false;
  for (var i = 0; i < batch.length; i++) {
    var path = batch[i].path;
    var results = batch[i].results || [];
    for (var j = 0; j < results.length; j++) {
      any = true;
      var r = results[j];
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

function listenForUpdates() {
  browserAPI.runtime.onMessage.addListener(function (message) {
    if (message && message.type === "OBSERVED_UPDATED") {
      loadObserved();
    }
  });
}

function showToast(text) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 1800);
}
