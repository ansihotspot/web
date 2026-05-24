var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var formFields = [];

var TEMPLATES = {
  "travel-obligations": {
    method: "POST",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details/travel-obligations/global",
    wrap: "empty",
    fields: []
  },
  "obligations-flat": {
    method: "POST",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details/obligations",
    wrap: "none",
    fields: [
      { key: "verificationState", type: "string", value: "NotRequired", enabled: true, group: "top",
        choices: ["NotRequired", "Required", "Pending", "InProgress", "Completed", "Approved", "Rejected", "Failed"] },
      { key: "isRestricted", type: "boolean", value: false, enabled: true, group: "top" },
      { key: "isValid", type: "boolean", value: true, enabled: true, group: "top" },
      { key: "configurationId", type: "number", value: -7, enabled: false, group: "top" },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "verificationDeadlineDate", type: "date", value: "", enabled: false, group: "top" },
      { key: "verificationExpiryDate", type: "date", value: "", enabled: false, group: "top" }
    ]
  },
  "customer-details-put-kyc": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "customerDetails",
    regionCode: "NE",
    schemaRequired: ["identificationNumber", "identificationDocumentType", "identificationDocument"],
    fields: [
      { key: "configurationId", type: "number", value: -7, enabled: true, group: "top" },
      { key: "requestId", type: "string", value: "", enabled: true, group: "top",
        hint: "Format: <accountNumber><ISOTimestamp>. Auto-rempli." },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "identificationNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "Numero d'identification (min 1, max 25). Cle schema: identificationNumber." },
      { key: "identificationDocumentType", type: "string", value: "Passport", enabled: true, group: "inner",
        choices: ["NationalIdCard", "DriversLicense", "Passport", "StudentOrSchoolCard", "ConsularCard", "ResidencePermit", "ElectoralCard", "RefugeeCard"],
        hint: "Type de piece (PascalCase strict, 8 choix Niger)." },
      { key: "identificationDocument", type: "file", value: "", enabled: true, group: "inner",
        hint: "Image - jpeg/png/heic/pdf, 1 fichier max - data:...;base64,..." }
    ]
  },
  "customer-details-put-kyc-legacy": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "customerDetails",
    regionCode: "global",
    schemaRequired: ["fullLegalName", "nationality", "dateOfBirth", "passportNumber", "passport", "livePortrait"],
    fields: [
      { key: "configurationId", type: "number", value: -62, enabled: true, group: "top" },
      { key: "requestId", type: "string", value: "", enabled: true, group: "top",
        hint: "Format: <accountNumber><ISOTimestamp>. Auto-rempli." },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "fullLegalName", type: "string", value: "", enabled: true, group: "inner",
        hint: "Nom legal complet (1-200)." },
      { key: "nationality", type: "string", value: "FR", enabled: true, group: "inner",
        hint: "Nationalite ISO-2 (FR, US, ...)." },
      { key: "dateOfBirth", type: "date", value: "1990-01-01", enabled: true, group: "inner",
        hint: "Date de naissance (18+ ans, 120 max)." },
      { key: "passportNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "Numero de passeport (1-25)." },
      { key: "passport", type: "file", value: "", enabled: true, group: "inner",
        hint: "Page identification passeport - jpeg/png/heic/pdf, 1 max." },
      { key: "livePortrait", type: "file", value: "", enabled: true, group: "inner",
        hint: "Portrait en direct (camera frontale)." }
    ]
  },
  "customer-details-put-kyc-tadjikistan": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "customerDetails",
    regionCode: "TJ",
    schemaRequired: ["identificationDocumentType", "identificationDocument"],
    fields: [
      { key: "configurationId", type: "number", value: -50, enabled: true, group: "top" },
      { key: "requestId", type: "string", value: "", enabled: true, group: "top",
        hint: "Format: <accountNumber><ISOTimestamp>. Auto-rempli." },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "identificationDocumentType", type: "string", value: "Passport", enabled: true, group: "inner",
        choices: ["Passport", "ResidencePermit", "RefugeeCertificate"],
        hint: "3 choix Tadjikistan: Passport, ResidencePermit, RefugeeCertificate." },
      { key: "identificationDocument", type: "file", value: "", enabled: true, group: "inner",
        hint: "Image - jpeg/png/heic/pdf, 1 fichier max." },
      { key: "passportNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "Conditionnel: requis si identificationDocumentType = Passport (1-25)." },
      { key: "identificationDocumentNumber", type: "string", value: "", enabled: false, group: "inner",
        hint: "Conditionnel: requis si ResidencePermit/RefugeeCertificate (1-25)." }
    ]
  },
  "customer-details-put-kyc-citizen": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "customerDetails",
    regionCode: "",
    schemaRequired: ["identificationDocumentTypeCitizen", "personalIdentificationNumber", "nationality", "dateOfBirth", "placeOfBirth", "identificationDocumentNumber", "dateOfIssuance"],
    fields: [
      { key: "configurationId", type: "number", value: -17, enabled: true, group: "top" },
      { key: "requestId", type: "string", value: "", enabled: true, group: "top",
        hint: "Format: <accountNumber><ISOTimestamp>. Auto-rempli." },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "identificationDocumentTypeCitizen", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Type de piece (citoyen). PascalCase strict." },
      { key: "personalIdentificationNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Numero d'identification personnel." },
      { key: "nationality", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Nationalite ISO-2." },
      { key: "dateOfBirth", type: "date", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Date de naissance." },
      { key: "placeOfBirth", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Lieu de naissance." },
      { key: "identificationDocumentNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Numero du document d'identite." },
      { key: "dateOfIssuance", type: "date", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Date de delivrance du document." }
    ]
  },
  "customer-details-put-kyc-legal-entity": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "customerDetails",
    regionCode: "",
    schemaRequired: ["fullNameOfLegalEntity", "countryOfRegistration", "fullNameOfAuthorizedRepresentative", "identificationDocumentNumber"],
    fields: [
      { key: "configurationId", type: "number", value: -18, enabled: true, group: "top" },
      { key: "requestId", type: "string", value: "", enabled: true, group: "top",
        hint: "Format: <accountNumber><ISOTimestamp>. Auto-rempli." },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "fullNameOfLegalEntity", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Raison sociale complete de la personne morale." },
      { key: "countryOfRegistration", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Pays d'immatriculation (ISO-2)." },
      { key: "fullNameOfAuthorizedRepresentative", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Nom complet du representant legal." },
      { key: "identificationDocumentNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Numero du document d'identite." }
    ]
  },
  "customer-details-put-kyc-resident": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "customerDetails",
    regionCode: "",
    schemaRequired: ["secondTelephoneNumber", "nationality", "sex", "dateOfBirth", "placeOfBirth", "isForeignNational", "identityDocument", "identityDocumentNumber", "accuracyDeclaration"],
    fields: [
      { key: "configurationId", type: "number", value: -19, enabled: true, group: "top" },
      { key: "requestId", type: "string", value: "", enabled: true, group: "top",
        hint: "Format: <accountNumber><ISOTimestamp>. Auto-rempli." },
      { key: "stateChangeReason", type: "string", value: "", enabled: false, group: "top" },
      { key: "isForeignNational", type: "boolean", value: false, enabled: true, group: "inner",
        hint: "REQUIRED. true = etranger (non-resident), false = resident." },
      { key: "identityDocumentTypeResident", type: "string", value: "", enabled: true, group: "inner",
        hint: "Conditionnel: requis si isForeignNational = false (resident)." },
      { key: "identityDocumentTypeNonResident", type: "string", value: "", enabled: false, group: "inner",
        hint: "Conditionnel: requis si isForeignNational = true (etranger)." },
      { key: "address", type: "string", value: "", enabled: false, group: "inner",
        hint: "Conditionnel: requis si isForeignNational = true (etranger)." },
      { key: "secondTelephoneNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Deuxieme numero de telephone." },
      { key: "nationality", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Nationalite ISO-2." },
      { key: "sex", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Sexe (valeur attendue par le serveur)." },
      { key: "dateOfBirth", type: "date", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Date de naissance." },
      { key: "placeOfBirth", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Lieu de naissance." },
      { key: "identityDocument", type: "file", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Image du document - data:...;base64,..." },
      { key: "identityDocumentNumber", type: "string", value: "", enabled: true, group: "inner",
        hint: "REQUIRED. Numero du document d'identite." },
      { key: "accuracyDeclaration", type: "boolean", value: true, enabled: true, group: "inner",
        hint: "REQUIRED. Declaration d'exactitude des informations." }
    ]
  },
  "customer-details-put": {
    method: "PUT",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "none",
    fields: [
      { key: "verificationState", type: "string", value: "NotRequired", enabled: true, group: "top",
        choices: ["NotRequired", "Required", "Pending", "InProgress", "Completed", "Approved", "Rejected", "Failed"] },
      { key: "isRestricted", type: "boolean", value: false, enabled: true, group: "top" },
      { key: "isValid", type: "boolean", value: true, enabled: true, group: "top" },
      { key: "fullLegalName", type: "string", value: "", enabled: true, group: "top" },
      { key: "nationality", type: "string", value: "FR", enabled: true, group: "top" },
      { key: "dateOfBirth", type: "date", value: "1990-01-01", enabled: true, group: "top" },
      { key: "passportNumber", type: "string", value: "", enabled: true, group: "top" }
    ]
  },
  "customer-details-post": {
    method: "POST",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details",
    wrap: "none",
    fields: [
      { key: "verificationState", type: "string", value: "NotRequired", enabled: true, group: "top",
        choices: ["NotRequired", "Required", "Pending", "InProgress", "Completed", "Approved", "Rejected", "Failed"] },
      { key: "isRestricted", type: "boolean", value: false, enabled: true, group: "top" },
      { key: "isValid", type: "boolean", value: true, enabled: true, group: "top" },
      { key: "fullLegalName", type: "string", value: "", enabled: true, group: "top" },
      { key: "nationality", type: "string", value: "FR", enabled: true, group: "top" },
      { key: "dateOfBirth", type: "date", value: "1990-01-01", enabled: true, group: "top" },
      { key: "passportNumber", type: "string", value: "", enabled: true, group: "top" }
    ]
  },
  "verification": {
    method: "POST",
    url: "https://starlink.com/api/accounts/v1/accounts/customer-details/verification",
    wrap: "none",
    fields: [
      { key: "verificationState", type: "string", value: "Completed", enabled: true, group: "top",
        choices: ["NotRequired", "Required", "Pending", "InProgress", "Completed", "Approved", "Rejected", "Failed"] },
      { key: "isRestricted", type: "boolean", value: false, enabled: true, group: "top" },
      { key: "isValid", type: "boolean", value: true, enabled: true, group: "top" },
      { key: "configurationId", type: "number", value: -7, enabled: false, group: "top" }
    ]
  },
  "custom": {
    method: "POST",
    url: "https://starlink.com/api/",
    wrap: "none",
    fields: []
  }
};

function loadTemplate(name) {
  var tpl = TEMPLATES[name];
  if (!tpl) return;
  document.querySelector('input[name="submitMethod"][value="' + tpl.method + '"]').checked = true;
  document.getElementById("submitUrl").value = tpl.url;
  document.getElementById("submitWrap").value = tpl.wrap;
  formFields = tpl.fields.map(function (f) {
    return {
      key: f.key, type: f.type, value: f.value, enabled: f.enabled,
      group: f.group || "top", hint: f.hint || null,
      choices: f.choices || null
    };
  });
  var typeField = null, foreignField = null;
  for (var i = 0; i < formFields.length; i++) {
    if (formFields[i].key === "identificationDocumentType") typeField = formFields[i];
    if (formFields[i].key === "isForeignNational") foreignField = formFields[i];
  }
  if (typeField) applyDocTypeConditionals(typeField.value, true);
  if (foreignField) applyResidencyConditionals(foreignField.value, true);
  renderFormFields();
  applyRequestId();
  rebuildBodyFromForm();
}

// Active passportNumber si type=Passport, sinon identificationDocumentNumber.
// Ne touche aux champs que s'ils existent dans le template courant.
function applyDocTypeConditionals(typeValue, skipRender) {
  var hasPassport = false, hasIdNum = false;
  for (var i = 0; i < formFields.length; i++) {
    if (formFields[i].key === "passportNumber") { formFields[i].enabled = (typeValue === "Passport"); hasPassport = true; }
    if (formFields[i].key === "identificationDocumentNumber") { formFields[i].enabled = (typeValue !== "Passport"); hasIdNum = true; }
  }
  if (!hasPassport && !hasIdNum) return;
  if (!skipRender) renderFormFields();
}

// Config -19: resident (isForeignNational=false) -> identityDocumentTypeResident.
// Etranger (true) -> identityDocumentTypeNonResident + address.
function applyResidencyConditionals(isForeign, skipRender) {
  var found = false;
  var foreign = isForeign === true || isForeign === "true";
  for (var i = 0; i < formFields.length; i++) {
    var k = formFields[i].key;
    if (k === "identityDocumentTypeResident") { formFields[i].enabled = !foreign; found = true; }
    if (k === "identityDocumentTypeNonResident") { formFields[i].enabled = foreign; found = true; }
    if (k === "address") { formFields[i].enabled = foreign; found = true; }
  }
  if (!found) return;
  if (!skipRender) renderFormFields();
}

function renderFormFields() {
  var container = document.getElementById("formFields");
  container.innerHTML = "";
  if (formFields.length === 0) {
    var hint = document.createElement("div");
    hint.style.cssText = "padding:14px;text-align:center;color:#555;font-size:11px;";
    hint.textContent = "Aucun champ. Choisis un template ou ajoute un champ.";
    container.appendChild(hint);
    return;
  }
  var lastGroup = null;
  for (var i = 0; i < formFields.length; i++) {
    var f = formFields[i];
    var g = f.group || "top";
    if (g !== lastGroup) {
      var sep = document.createElement("div");
      sep.style.cssText = "display:flex;align-items:center;gap:8px;margin:8px 4px 4px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:" + (g === "inner" ? "#FF9800" : "#00d4ff") + ";";
      var label = document.createElement("span");
      label.textContent = g === "inner" ? "Champs inner  ->  JSON.stringify dans 'value'" : "Champs top-level";
      var line = document.createElement("div");
      line.style.cssText = "flex:1;height:1px;background:" + (g === "inner" ? "rgba(255,152,0,0.3)" : "rgba(0,212,255,0.3)") + ";";
      sep.appendChild(label);
      sep.appendChild(line);
      container.appendChild(sep);
      lastGroup = g;
    }
    container.appendChild(renderFieldRow(i, f));
    if (f.hint) {
      var h = document.createElement("div");
      h.style.cssText = "font-size:9px;color:#666;padding:0 4px 0 34px;margin-bottom:2px;font-style:italic;";
      h.textContent = f.hint;
      container.appendChild(h);
    }
  }
}

function renderFieldRow(index, field) {
  var row = document.createElement("div");
  row.style.cssText = "display:grid;grid-template-columns:24px 1fr auto 1.4fr 80px 24px;gap:6px;align-items:center;padding:4px 6px;background:rgba(255,255,255,0.02);border-radius:4px;";

  var check = document.createElement("input");
  check.type = "checkbox";
  check.checked = !!field.enabled;
  check.title = "Inclure dans le body";
  check.style.cssText = "accent-color:#00d4ff;";
  check.addEventListener("change", function () {
    formFields[index].enabled = check.checked;
    rebuildBodyFromForm();
  });
  row.appendChild(check);

  var keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.value = field.key;
  keyInput.placeholder = "nom du champ";
  keyInput.style.cssText = "background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#00d4ff;padding:4px 6px;font-family:'SF Mono','Consolas',monospace;font-size:11px;outline:none;";
  keyInput.addEventListener("input", function () {
    formFields[index].key = keyInput.value;
    rebuildBodyFromForm();
  });
  row.appendChild(keyInput);

  var eq = document.createElement("span");
  eq.textContent = "=";
  eq.style.cssText = "color:#555;font-family:'SF Mono','Consolas',monospace;";
  row.appendChild(eq);

  var valWrap = document.createElement("div");
  valWrap.appendChild(renderValueInput(index, field));
  row.appendChild(valWrap);

  var typeSel = document.createElement("select");
  typeSel.style.cssText = "background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#e4e4e4;padding:3px 4px;font-family:'SF Mono','Consolas',monospace;font-size:10px;outline:none;";
  ["string", "number", "boolean", "date", "file", "null"].forEach(function (t) {
    var opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    if (t === field.type) opt.selected = true;
    typeSel.appendChild(opt);
  });
  typeSel.addEventListener("change", function () {
    formFields[index].type = typeSel.value;
    formFields[index].value = defaultValueForType(typeSel.value);
    renderFormFields();
    rebuildBodyFromForm();
  });
  row.appendChild(typeSel);

  var del = document.createElement("button");
  del.textContent = "x";
  del.title = "Supprimer";
  del.style.cssText = "background:rgba(233,69,96,0.1);border:1px solid rgba(233,69,96,0.3);color:#e94560;border-radius:4px;padding:2px;cursor:pointer;font-size:11px;font-weight:700;";
  del.addEventListener("click", function () {
    formFields.splice(index, 1);
    renderFormFields();
    rebuildBodyFromForm();
  });
  row.appendChild(del);

  return row;
}

function renderValueInput(index, field) {
  var common = "width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#e4e4e4;padding:4px 6px;font-family:'SF Mono','Consolas',monospace;font-size:11px;outline:none;";
  // Champs avec une liste de choix imposes
  if (field.choices && field.choices.length && field.type === "string") {
    var sel = document.createElement("select");
    sel.style.cssText = common;
    field.choices.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      if (String(field.value) === c) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      formFields[index].value = sel.value;
      if (field.key === "identificationDocumentType") applyDocTypeConditionals(sel.value);
      rebuildBodyFromForm();
    });
    return sel;
  }
  if (field.type === "boolean") {
    var sel = document.createElement("select");
    sel.style.cssText = common;
    [["false", "false"], ["true", "true"]].forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p[0]; opt.textContent = p[1];
      if (String(field.value) === p[0]) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      formFields[index].value = sel.value === "true";
      if (field.key === "isForeignNational") applyResidencyConditionals(sel.value === "true");
      rebuildBodyFromForm();
    });
    return sel;
  }
  if (field.type === "null") {
    var span = document.createElement("input");
    span.type = "text"; span.value = "null"; span.disabled = true;
    span.style.cssText = common + "color:#aaa;";
    return span;
  }
  if (field.type === "file") {
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:4px;align-items:center;";
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.cssText = "flex:1;color:#aaa;font-size:10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:2px;";
    var info = document.createElement("span");
    info.style.cssText = "font-size:10px;color:" + (field.value && field.value.length > 0 ? "#4CAF50" : "#666") + ";white-space:nowrap;";
    info.textContent = field.value ? "[" + Math.round(field.value.length / 1024) + " KB]" : "(vide)";
    fileInput.addEventListener("change", function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        formFields[index].value = reader.result;
        info.textContent = "[" + Math.round(reader.result.length / 1024) + " KB]";
        info.style.color = "#4CAF50";
        rebuildBodyFromForm();
        showToast("Fichier encode: " + file.name);
      };
      reader.readAsDataURL(file);
    });
    wrap.appendChild(fileInput);
    wrap.appendChild(info);
    return wrap;
  }
  var inp = document.createElement("input");
  inp.style.cssText = common;
  if (field.type === "number") {
    inp.type = "number";
    inp.value = field.value === undefined || field.value === null ? "" : field.value;
    inp.addEventListener("input", function () {
      var v = inp.value === "" ? null : Number(inp.value);
      formFields[index].value = v;
      rebuildBodyFromForm();
    });
  } else if (field.type === "date") {
    inp.type = "date";
    inp.value = field.value || "";
    inp.addEventListener("input", function () {
      formFields[index].value = inp.value;
      rebuildBodyFromForm();
    });
  } else {
    inp.type = "text";
    inp.value = field.value === undefined || field.value === null ? "" : String(field.value);
    inp.addEventListener("input", function () {
      formFields[index].value = inp.value;
      rebuildBodyFromForm();
    });
  }
  return inp;
}

function defaultValueForType(t) {
  if (t === "string") return "";
  if (t === "number") return 0;
  if (t === "boolean") return false;
  if (t === "date") return "";
  if (t === "null") return null;
  if (t === "file") return "";
  return "";
}

function fieldsToObject(groupFilter) {
  var obj = {};
  for (var i = 0; i < formFields.length; i++) {
    var f = formFields[i];
    if (!f.enabled) continue;
    if (!f.key) continue;
    if (groupFilter && (f.group || "top") !== groupFilter) continue;
    var v = f.value;
    if (f.type === "null") v = null;
    if (f.type === "number" && (v === "" || v === undefined)) v = null;
    obj[f.key] = v;
  }
  return obj;
}

function rebuildBodyFromForm() {
  var wrap = document.getElementById("submitWrap").value;
  var bodyEl = document.getElementById("submitBody");
  if (wrap === "raw") return;
  if (wrap === "empty") {
    bodyEl.value = "";
    return;
  }
  var out;
  if (wrap === "customerDetails") {
    var top = fieldsToObject("top");
    var inner = fieldsToObject("inner");
    top.value = JSON.stringify(inner);
    out = top;
  } else {
    var all = fieldsToObject(null);
    if (wrap === "content") out = { content: [all] };
    else if (wrap === "contentObj") out = { content: all };
    else out = all;
  }
  bodyEl.value = JSON.stringify(out, null, 2);
}

// === Numero de compte + ISO timestamp ===

var accEl, isoEl, autoIsoEl, isoBadge, accValueEl, accHintEl;

function nowIsoLocalInput() {
  var d = new Date();
  var pad = function (n, l) { l = l || 2; var s = String(n); while (s.length < l) s = "0" + s; return s; };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
    + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
    + "." + pad(d.getMilliseconds(), 3);
}
function currentIsoZ() {
  if (autoIsoEl.checked) return new Date().toISOString();
  if (!isoEl.value) return new Date().toISOString();
  var d = new Date(isoEl.value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function applyRequestId() {
  if (!accEl) return;
  var acc = (accEl.value || "ACC-0000000-00000-00").trim();
  var iso = currentIsoZ();
  var rid = acc + iso;
  var idx = -1;
  for (var i = 0; i < formFields.length; i++) {
    if (formFields[i].key === "requestId") { idx = i; break; }
  }
  if (idx === -1) return rid;
  formFields[idx].value = rid;
  formFields[idx].enabled = true;
  renderFormFields();
  rebuildBodyFromForm();
  return rid;
}

function updateAccountDisplay(acc, source) {
  if (accValueEl) accValueEl.textContent = acc || "-";
  if (accHintEl) accHintEl.textContent = source || (acc ? "detecte" : "en attente de detection...");
  accValueEl.style.color = acc ? "#fff" : "#888";
}

// === COPY ===

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

function showToast(text) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 1800);
}

// === INIT ===

document.addEventListener("DOMContentLoaded", function () {
  accEl = document.getElementById("accountNumber");
  isoEl = document.getElementById("isoTimestamp");
  autoIsoEl = document.getElementById("autoIso");
  isoBadge = document.getElementById("isoNowBadge");
  accValueEl = document.getElementById("accValue");
  accHintEl = document.getElementById("accHint");

  isoEl.value = nowIsoLocalInput();
  setInterval(function () {
    if (autoIsoEl.checked) {
      isoEl.value = nowIsoLocalInput();
      isoBadge.textContent = "auto";
      isoBadge.style.color = "#4CAF50";
    } else {
      isoBadge.textContent = "fige";
      isoBadge.style.color = "#FF9800";
    }
  }, 1000);

  // Charge le numero de compte stocke (auto-detecte par le background)
  browserAPI.runtime.sendMessage({ type: "GET_ACCOUNT" }, function (resp) {
    if (resp && resp.accountNumber) {
      accEl.value = resp.accountNumber;
      updateAccountDisplay(resp.accountNumber, "detecte (account-info)");
    } else {
      updateAccountDisplay(null);
    }
    loadTemplate("customer-details-put-kyc");
  });

  // Ecoute les detections de compte en live
  browserAPI.runtime.onMessage.addListener(function (message) {
    if (message && message.type === "ACCOUNT_DETECTED") {
      accEl.value = message.accountNumber;
      updateAccountDisplay(message.accountNumber, "detecte a l'instant");
      applyRequestId();
    }
  });

  accEl.addEventListener("input", function () {
    updateAccountDisplay(accEl.value, "saisie manuelle");
    applyRequestId();
  });
  isoEl.addEventListener("input", function () {
    autoIsoEl.checked = false;
    applyRequestId();
  });
  autoIsoEl.addEventListener("change", function () {
    if (autoIsoEl.checked) isoEl.value = nowIsoLocalInput();
    applyRequestId();
  });
  isoBadge.addEventListener("click", function () {
    autoIsoEl.checked = !autoIsoEl.checked;
    if (autoIsoEl.checked) isoEl.value = nowIsoLocalInput();
    applyRequestId();
  });

  document.getElementById("submitTemplate").addEventListener("change", function (e) {
    loadTemplate(e.target.value);
  });
  document.getElementById("submitWrap").addEventListener("change", rebuildBodyFromForm);

  document.getElementById("addFieldBtn").addEventListener("click", function () {
    formFields.push({ key: "newField", type: "string", value: "", enabled: true, group: "top" });
    renderFormFields();
    rebuildBodyFromForm();
  });
  document.getElementById("resetFormBtn").addEventListener("click", function () {
    if (!confirm("Vider le formulaire ?")) return;
    formFields = [];
    renderFormFields();
    rebuildBodyFromForm();
  });

  document.getElementById("rebuildBodyBtn").addEventListener("click", function () {
    var wrapEl = document.getElementById("submitWrap");
    if (wrapEl.value === "raw") wrapEl.value = "none";
    rebuildBodyFromForm();
    showToast("Body reconstruit");
  });
  document.getElementById("copyBodyBtn").addEventListener("click", function () {
    var v = document.getElementById("submitBody").value;
    if (!v) { showToast("Body vide"); return; }
    copyToClipboard(v, "Body copie");
  });
  document.getElementById("copyResponseBtn").addEventListener("click", function () {
    copyToClipboard(document.getElementById("submitResponse").textContent, "Reponse copiee");
  });
  document.getElementById("copyCurlBtn").addEventListener("click", function () {
    var url = document.getElementById("submitUrl").value.trim();
    var method = document.querySelector('input[name="submitMethod"]:checked').value;
    var body = document.getElementById("submitBody").value;
    var cmd = "curl -X " + method + " '" + url + "' \\\n";
    cmd += "  -H 'Content-Type: application/json' \\\n";
    cmd += "  -H 'Accept: application/json' \\\n";
    cmd += "  -H 'Origin: https://starlink.com' \\\n";
    cmd += "  -H 'Referer: https://starlink.com/account/settings' \\\n";
    cmd += "  -b 'Starlink.Com.Sso=...; Starlink.Com.Access.V1=...'";
    if (body && body.length > 0) {
      cmd += " \\\n  --data " + JSON.stringify(body);
    } else {
      cmd += " \\\n  -H 'Content-Length: 0'";
    }
    copyToClipboard(cmd, "cURL copie");
  });
  document.getElementById("genRequestIdBtn").addEventListener("click", function () {
    var rid = applyRequestId();
    showToast("requestId = " + rid);
  });

  document.getElementById("submitBtn").addEventListener("click", function () {
    if (autoIsoEl.checked) applyRequestId();
    var url = document.getElementById("submitUrl").value.trim();
    var method = document.querySelector('input[name="submitMethod"]:checked').value;
    var body = document.getElementById("submitBody").value;
    var wrap = document.getElementById("submitWrap").value;
    if (!url) { showToast("URL requise"); return; }

    var responseEl = document.getElementById("submitResponse");
    responseEl.style.color = "#aaa";
    responseEl.textContent = "Envoi en cours...\n" + method + " " + url + "\n\n" + (body || "(pas de body)");

    browserAPI.runtime.sendMessage({
      type: "SUBMIT",
      url: url,
      method: method,
      body: wrap === "empty" ? "" : body
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
      var color = r.status >= 200 && r.status < 300 ? "#4CAF50"
                : r.status >= 400 ? "#e94560" : "#FF9800";
      responseEl.style.color = color;
      var out = "Status: " + r.status + " " + (r.statusText || "") + "\n";
      out += "Content-Type: " + (r.contentType || "-") + "\n";
      out += "Duree: " + r.duration + "ms\n\n";
      out += "--- BODY ---\n";
      out += r.bodySnippet || "(pas de body texte)";
      responseEl.textContent = out;
      showToast(r.status >= 200 && r.status < 300 ? "Succes!" : "Reponse " + r.status);
    });
  });
});
