/* =====================================================================
   IssueTrack — register detail page (project.html?id=REG-00X).
   Register info editing + issue (ToDo) log. The issues are stored
   INSIDE the register object (project.todos).
   ===================================================================== */
(function () {
  "use strict";

  var store = window.IssueTrackStore;
  var UI = window.IssueTrackUI;

  var params = new URLSearchParams(window.location.search);
  var projectId = params.get("id");
  var project = store.getProject(projectId);

  var detailRoot = document.getElementById("detail-root");
  var editLabel = document.getElementById("edit-label");
  var editForm = document.getElementById("edit-form");
  var editStatus = document.getElementById("edit-status");
  var issueForm = document.getElementById("issue-form");
  var issueStatus = document.getElementById("issue-status");
  var todoList = document.getElementById("todo-list");
  var issueCount = document.getElementById("issue-count");
  var sideRegisters = document.getElementById("side-registers");
  var topbarMeta = document.getElementById("topbar-meta");

  var editName = document.getElementById("e-name");
  var editNameError = document.getElementById("e-name-error");
  var editCode = document.getElementById("e-code");
  var editSite = document.getElementById("e-site");
  var editDescription = document.getElementById("e-description");
  var editDate = document.getElementById("e-date");
  var editLead = document.getElementById("e-lead");

  var issueTitle = document.getElementById("i-title");
  var issueTitleError = document.getElementById("i-title-error");
  var issueDescription = document.getElementById("i-description");
  var issueStatusSelect = document.getElementById("i-status");
  var issuePriority = document.getElementById("i-priority");
  var issueAssignee = document.getElementById("i-assignee");
  var issueDue = document.getElementById("i-due");

  var editing = false;
  var creating = false;

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */
  function registerState(item) {
    var stats = store.projectStats(item);
    if (stats.blocked > 0) return { label: "BLOCKED", chip: "it-chip it-chip-crit" };
    if (stats.open > 0) return { label: "ACTIVE", chip: "it-chip it-chip-warn" };
    if (stats.total > 0) return { label: "SETTLED", chip: "it-chip it-chip-ok" };
    return { label: "NEW", chip: "it-chip" };
  }

  function renderDetail() {
    var stats = store.projectStats(project);
    var lead = store.getPerson(project.leadId);
    var state = registerState(project);

    detailRoot.innerHTML =
      '<div class="it-detail-head">' +
        /* Exam 2.1 / 2.2 — first two letters of the name, random color. */
        '<span class="it-tile" style="background:' + UI.esc(project.color) + '">' +
          UI.esc(UI.iconLetters(project.name)) +
        "</span>" +
        '<div style="flex:1;min-width:220px">' +
          '<h1 class="it-detail-title">' + UI.esc(project.name) + "</h1>" +
          '<div class="it-detail-meta">' +
            '<span class="it-chip ' + state.chip + '">' + state.label + "</span>" +
            '<span class="it-muted-text">' + UI.esc(project.code || project.id) + "</span>" +
            '<span class="it-muted-text it-num">' + UI.esc(project.id) + "</span>" +
          "</div>" +
        "</div>" +
        '<button class="it-btn" type="button" id="btn-edit">✎ EDIT REGISTER INFO</button>' +
      "</div>" +
      '<dl class="it-detail-kv">' +
        "<div><dt>Register code</dt><dd>" + UI.esc(project.code || "—") + "</dd></div>" +
        "<div><dt>Site</dt><dd>" + UI.esc(project.site || "—") + "</dd></div>" +
        "<div><dt>Date</dt><dd>" + UI.esc(UI.formatDate(project.date)) + "</dd></div>" +
        "<div><dt>Lead</dt><dd>" + UI.esc(lead ? lead.name : "—") + "</dd></div>" +
        '<div><dt>Issues</dt><dd class="it-num">' + stats.open + " open / " + stats.total + " total</dd></div>" +
        "<div><dt>Description</dt><dd>" + UI.esc(project.description || "—") + "</dd></div>" +
      "</dl>";

    document.getElementById("btn-edit").addEventListener("click", function () {
      editing = !editing;
      fillEditForm();
      editForm.hidden = !editing;
      editLabel.hidden = !editing;
    });
  }

  /* Exam 2.6 — the issue card background follows the issue status. */
  function todoHtml(todo) {
    var info = store.statusInfo(todo.status);
    var assignee = store.getPerson(todo.assigneeId);

    return (
      '<article class="it-todo" data-status="' + UI.esc(todo.status) + '" data-todo-id="' + UI.esc(todo.id) + '">' +
        '<div class="it-todo-head">' +
          '<span class="it-todo-title">' + UI.esc(todo.title) + "</span>" +
          '<span class="it-chip ' + info.chip + '">' + info.label + "</span>" +
        "</div>" +
        (todo.description ? '<p class="it-todo-desc">' + UI.esc(todo.description) + "</p>" : "") +
        '<div class="it-todo-meta">' +
          "<span>Priority " + UI.esc(todo.priority) + "</span>" +
          "<span>Assignee " + UI.esc(assignee ? assignee.name : "—") + "</span>" +
          "<span>Due " + UI.esc(UI.formatDate(todo.due)) + "</span>" +
          '<span class="it-num">' + UI.esc(todo.id) + "</span>" +
        "</div>" +
        '<div class="it-todo-controls">' +
          '<span class="it-muted-text">Status</span>' +
          '<select class="it-select" data-action="set-status" data-todo-id="' + UI.esc(todo.id) + '">' +
            UI.options(store.STATUSES, todo.status) +
          "</select>" +
          '<button class="it-btn it-btn-danger" type="button" data-action="delete-issue" data-todo-id="' +
            UI.esc(todo.id) + '">✕ DELETE</button>' +
        "</div>" +
      "</article>"
    );
  }

  function renderIssues() {
    var stats = store.projectStats(project);
    issueCount.textContent = stats.open + " OPEN / " + stats.total + " TOTAL";

    if (!project.todos.length) {
      todoList.innerHTML = '<div class="it-empty">NO ISSUES LOGGED IN THIS REGISTER YET</div>';
      return;
    }
    todoList.innerHTML = project.todos.map(todoHtml).join("");
  }

  function fillEditForm() {
    editName.value = project.name;
    editCode.value = project.code || "";
    editSite.value = project.site || "";
    editDescription.value = project.description || "";
    editDate.value = project.date || "";
    editLead.innerHTML =
      '<option value="">— UNASSIGNED —</option>' +
      store
        .listPeople()
        .map(function (person) {
          var selected = person.id === project.leadId ? " selected" : "";
          return '<option value="' + UI.esc(person.id) + '"' + selected + ">" + UI.esc(person.name) + "</option>";
        })
        .join("");
  }

  function fillIssueForm() {
    issueStatusSelect.innerHTML = UI.options(store.STATUSES, "open");
    issuePriority.innerHTML = UI.options(store.PRIORITIES, "MEDIUM");
    issueAssignee.innerHTML =
      '<option value="">— UNASSIGNED —</option>' +
      store
        .listPeople()
        .map(function (person) {
          return '<option value="' + UI.esc(person.id) + '">' + UI.esc(person.name) + "</option>";
        })
        .join("");
  }

  function render() {
    UI.renderTopbarMeta(topbarMeta);
    UI.renderSideRegisters(sideRegisters);
    if (!project) return;
    renderDetail();
    renderIssues();
  }

  /* ------------------------------------------------------------------
     Exam 2.5 — edit the register info from the details page
     ------------------------------------------------------------------ */
  editForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = editName.value.trim();
    if (name.length < store.MIN_NAME_LENGTH) {
      UI.showFieldError(editName, editNameError, "NAME TOO SHORT — MIN 5 CHARACTERS");
      return;
    }
    UI.clearFieldError(editName, editNameError);

    var result = store.updateProject(project.id, {
      name: name,
      code: editCode.value,
      site: editSite.value,
      description: editDescription.value,
      date: editDate.value,
      leadId: editLead.value || null
    });

    if (!result.ok) {
      UI.showFieldError(editName, editNameError, result.error);
      return;
    }

    project = result.project;
    editing = false;
    editForm.hidden = true;
    editLabel.hidden = true;
    render();
    UI.setStatus(editStatus, "REGISTER UPDATED — " + project.name, "ok");
    editStatus.hidden = false;
  });

  editName.addEventListener("input", function () {
    UI.clearFieldError(editName, editNameError);
  });

  document.getElementById("btn-cancel-edit").addEventListener("click", function () {
    editing = false;
    editForm.hidden = true;
    editLabel.hidden = true;
    UI.setStatus(editStatus, "", null);
  });

  /* ------------------------------------------------------------------
     Exam 2.6 — create issues from the details page.
     Exam 2.9 — the status is chosen at creation and editable later.
     ------------------------------------------------------------------ */
  function showIssueForm(show) {
    creating = show;
    issueForm.hidden = !show;
    if (show) {
      fillIssueForm();
      issueTitle.focus();
    }
  }

  document.getElementById("btn-new-issue").addEventListener("click", function () {
    showIssueForm(true);
    issueForm.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("btn-cancel-issue").addEventListener("click", function () {
    showIssueForm(false);
    UI.setStatus(issueStatus, "", null);
  });

  issueForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var title = issueTitle.value.trim();
    if (!title) {
      UI.showFieldError(issueTitle, issueTitleError, "ISSUE TITLE REQUIRED");
      return;
    }
    UI.clearFieldError(issueTitle, issueTitleError);

    var result = store.addTodo(project.id, {
      title: title,
      description: issueDescription.value,
      status: issueStatusSelect.value, /* status chosen at creation */
      priority: issuePriority.value,
      assigneeId: issueAssignee.value || null,
      due: issueDue.value
    });

    if (!result.ok) {
      UI.showFieldError(issueTitle, issueTitleError, result.error);
      return;
    }

    issueForm.reset();
    render();
    UI.setStatus(issueStatus, "ISSUE LOGGED — " + result.todo.id + " · " + result.todo.status, "ok");
    showIssueForm(false);
  });

  issueTitle.addEventListener("input", function () {
    UI.clearFieldError(issueTitle, issueTitleError);
  });

  /* Status change on an existing issue (exam 2.9) + delete. */
  todoList.addEventListener("change", function (event) {
    var select = event.target.closest('select[data-action="set-status"]');
    if (!select) return;
    var todoId = select.getAttribute("data-todo-id");
    var result = store.updateTodo(project.id, todoId, { status: select.value });
    if (!result.ok) {
      UI.setStatus(issueStatus, "UPDATE FAILED — " + result.error, "crit");
      return;
    }
    project = result.project;
    render();
    UI.setStatus(issueStatus, "ISSUE " + todoId + " — STATUS NOW " + result.todo.status.toUpperCase(), "ok");
  });

  todoList.addEventListener("click", function (event) {
    var button = event.target.closest('button[data-action="delete-issue"]');
    if (!button) return;
    var todoId = button.getAttribute("data-todo-id");
    if (!window.confirm("DELETE ISSUE " + todoId + " FROM THIS REGISTER?")) return;
    store.deleteTodo(project.id, todoId);
    project = store.getProject(project.id);
    render();
    UI.setStatus(issueStatus, "ISSUE " + todoId + " DELETED", "warn");
  });

  /* ------------------------------------------------------------------ */
  store.init();
  fillIssueForm();

  if (!project) {
    detailRoot.innerHTML =
      '<div class="it-empty">REGISTER NOT FOUND — <a href="index.html">BACK TO THE INDEX</a></div>';
    issueForm.hidden = true;
    editForm.hidden = true;
    editLabel.hidden = true;
    issueCount.textContent = "";
    document.getElementById("btn-new-issue").hidden = true;
  } else {
    render();
  }

  UI.markActiveNav();
})();
