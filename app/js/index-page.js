/* =====================================================================
   IssueTrack — register index page (index.html).
   Registers list + create form + JSON export / import.
   ===================================================================== */
(function () {
  "use strict";

  var store = window.IssueTrackStore;
  var UI = window.IssueTrackUI;

  var grid = document.getElementById("project-grid");
  var statsBox = document.getElementById("stats");
  var registerCount = document.getElementById("register-count");
  var sideRegisters = document.getElementById("side-registers");
  var topbarMeta = document.getElementById("topbar-meta");

  var form = document.getElementById("project-form");
  var nameInput = document.getElementById("f-name");
  var nameError = document.getElementById("f-name-error");
  var codeInput = document.getElementById("f-code");
  var siteInput = document.getElementById("f-site");
  var descInput = document.getElementById("f-description");
  var dateInput = document.getElementById("f-date");
  var leadSelect = document.getElementById("f-lead");
  var formStatus = document.getElementById("form-status");

  var exportButton = document.getElementById("btn-export");
  var importFile = document.getElementById("import-file");
  var importText = document.getElementById("import-text");
  var importTextButton = document.getElementById("btn-import-text");
  var resetButton = document.getElementById("btn-reset");
  var dataStatus = document.getElementById("data-status");
  var exportPreview = document.getElementById("export-preview");

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  function renderStats() {
    var stats = store.overallStats();
    statsBox.innerHTML =
      '<div class="it-stat"><b class="it-num">' + stats.registers + '</b><span>Registers</span></div>' +
      '<div class="it-stat"><b class="it-num">' + stats.issues + '</b><span>Issues logged</span></div>' +
      '<div class="it-stat"><b class="it-num">' + stats.open + '</b><span>Open issues</span></div>' +
      '<div class="it-stat is-crit"><b class="it-num">' + stats.blocked + '</b><span>Blocked</span></div>' +
      '<div class="it-stat"><b class="it-num">' + stats.people + '</b><span>People</span></div>';
  }

  /* Overall state of a register, shown as a chip. */
  function registerState(project) {
    var stats = store.projectStats(project);
    if (stats.blocked > 0) return { label: "BLOCKED", chip: "it-chip it-chip-crit" };
    if (stats.open > 0) return { label: "ACTIVE", chip: "it-chip it-chip-warn" };
    if (stats.total > 0) return { label: "SETTLED", chip: "it-chip it-chip-ok" };
    return { label: "NEW", chip: "it-chip" };
  }

  function cardHtml(project) {
    var stats = store.projectStats(project);
    var lead = store.getPerson(project.leadId);
    var state = registerState(project);

    return (
      '<article class="it-card it-project-card" data-project-id="' + UI.esc(project.id) + '">' +
        '<div class="it-card-head">' +
          '<span class="it-label">' + UI.esc(project.code || project.id) + " / " + UI.esc(project.name) + "</span>" +
          '<a class="it-card-open" href="' + UI.esc(UI.projectUrl(project.id)) + '">↗ OPEN</a>' +
        "</div>" +
        '<div class="it-project-body">' +
          /* Exam 2.1 — first two letters of the register name; the
             uppercasing is done by CSS (.it-tile text-transform). */
          '<span class="it-tile" style="background:' + UI.esc(project.color) + '">' +
            UI.esc(UI.iconLetters(project.name)) +
          "</span>" +
          '<dl class="it-kv it-kv-grow">' +
            "<dt>Issues</dt><dd class='it-num'>" + stats.open + " open / " + stats.total + "</dd>" +
            "<dt>Lead</dt><dd>" + UI.esc(lead ? lead.name : "—") + "</dd>" +
            "<dt>Date</dt><dd class='it-num'>" + UI.esc(UI.formatDate(project.date)) + "</dd>" +
          "</dl>" +
          '<span class="it-chip ' + state.chip + '">' + state.label + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function renderGrid() {
    var projects = store.listProjects();
    if (!projects.length) {
      grid.innerHTML = '<div class="it-empty">NO REGISTERS YET — CREATE ONE BELOW</div>';
    } else {
      grid.innerHTML = projects.map(cardHtml).join("");
    }
    registerCount.textContent = projects.length + " REGISTER" + (projects.length === 1 ? "" : "S");
  }

  function renderLeadOptions() {
    var people = store.listPeople();
    leadSelect.innerHTML =
      '<option value="">— UNASSIGNED —</option>' +
      people
        .map(function (person) {
          return '<option value="' + UI.esc(person.id) + '">' + UI.esc(person.name) + "</option>";
        })
        .join("");
  }

  function render() {
    renderStats();
    renderLeadOptions();
    renderGrid();
    UI.renderSideRegisters(sideRegisters);
    UI.renderTopbarMeta(topbarMeta);
  }

  /* ------------------------------------------------------------------
     Create register (exam 2.3 validation, exam 2.4 default date)
     ------------------------------------------------------------------ */
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = nameInput.value.trim();

    /* Exam 2.3 — refuse to create a register with a short name. */
    if (name.length < store.MIN_NAME_LENGTH) {
      UI.showFieldError(nameInput, nameError, "NAME TOO SHORT — MIN 5 CHARACTERS");
      UI.setStatus(formStatus, "REGISTER NOT CREATED — NAME TOO SHORT", "crit");
      nameInput.focus();
      return;
    }
    UI.clearFieldError(nameInput, nameError);

    var result = store.createProject({
      name: name,
      code: codeInput.value,
      site: siteInput.value,
      description: descInput.value,
      date: dateInput.value, /* empty -> store applies today's date */
      leadId: leadSelect.value || null
    });

    if (!result.ok) {
      UI.showFieldError(nameInput, nameError, result.error);
      UI.setStatus(formStatus, "REGISTER NOT CREATED", "crit");
      return;
    }

    form.reset();
    render();
    UI.setStatus(
      formStatus,
      "REGISTER CREATED — " + (result.project.code || result.project.id) + " · DATE " + result.project.date,
      "ok"
    );
  });

  nameInput.addEventListener("input", function () {
    UI.clearFieldError(nameInput, nameError);
  });

  /* ------------------------------------------------------------------
     Card click -> open the register
     ------------------------------------------------------------------ */
  grid.addEventListener("click", function (event) {
    if (event.target.closest("a")) return; /* the OPEN link handles itself */
    var card = event.target.closest("[data-project-id]");
    if (!card) return;
    UI.go(UI.projectUrl(card.getAttribute("data-project-id")));
  });

  document.getElementById("btn-new-register").addEventListener("click", function () {
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    nameInput.focus();
  });

  /* ------------------------------------------------------------------
     Exam 2.7 — export projects (with the nested issues) to JSON
     ------------------------------------------------------------------ */
  exportButton.addEventListener("click", function () {
    var json = store.exportJSON();
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "issuetrack-" + store.todayISO() + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);

    exportPreview.textContent = json;
    var previewDetails = document.getElementById("export-preview-details");
    if (previewDetails) previewDetails.open = true;

    var stats = store.overallStats();
    UI.setStatus(
      dataStatus,
      "EXPORTED " + stats.registers + " REGISTERS · " + stats.issues + " ISSUES · " + json.length + " BYTES",
      "ok"
    );
  });

  /* ------------------------------------------------------------------
     Exam 2.8 — import JSON: same register id = update, never duplicate
     ------------------------------------------------------------------ */
  function applyImport(payload) {
    var result = store.importProjects(payload);
    if (!result.ok) {
      UI.setStatus(dataStatus, "IMPORT FAILED — " + result.error, "crit");
      return;
    }
    render();
    var message =
      "IMPORT COMPLETE — " + result.added + " ADDED · " + result.updated + " UPDATED";
    if (result.skipped) {
      message += " · " + result.skipped + " REJECTED";
      if (result.rejected && result.rejected.length) {
        message += " (" + result.rejected.slice(0, 3).join(", ") + ")";
      }
    }
    UI.setStatus(dataStatus, message, result.skipped ? "crit" : result.updated ? "warn" : "ok");
  }

  importFile.addEventListener("change", function () {
    var file = importFile.files && importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var payload;
      try {
        payload = JSON.parse(reader.result);
      } catch (err) {
        UI.setStatus(dataStatus, "IMPORT FAILED — INVALID JSON", "crit");
        importFile.value = "";
        return;
      }
      applyImport(payload);
      importFile.value = "";
    };
    reader.readAsText(file);
  });

  importTextButton.addEventListener("click", function () {
    var raw = (importText.value || "").trim();
    if (!raw) {
      UI.setStatus(dataStatus, "IMPORT FAILED — NO JSON PASTED", "crit");
      return;
    }
    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      UI.setStatus(dataStatus, "IMPORT FAILED — INVALID JSON", "crit");
      return;
    }
    applyImport(payload);
  });

  /* Destructive control -> coral + confirmation (house rule 12). */
  resetButton.addEventListener("click", function () {
    if (!window.confirm("RESET ALL REGISTERS, ISSUES AND PEOPLE BACK TO THE DEMO DATA?")) return;
    store.resetToSeed();
    render();
    UI.setStatus(dataStatus, "DEMO DATA RESTORED", "warn");
  });

  /* ------------------------------------------------------------------ */
  store.init();
  render();
  UI.markActiveNav();
})();
