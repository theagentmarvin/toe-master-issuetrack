/* =====================================================================
   IssueTrack — data store (vanilla JS, no framework, no backend).
   ---------------------------------------------------------------------
   * Single source of truth:
   *     data = { version, people: [...], projects: [...] }
   * * ToDos (issues) are NESTED INSIDE each project:  project.todos = []
   * * Persisted to localStorage (bonus) and exportable / importable as JSON
   *   (the required persistence story).
   * ===================================================================== */
(function (global) {
  "use strict";

  var STORAGE_KEY = "issuetrack.v1";

  /* Exam 2.3 — a register name shorter than this is refused. */
  var MIN_NAME_LENGTH = 5;
  /* People names need at least this many characters. */
  var MIN_PERSON_LENGTH = 2;

  /* -------------------------------------------------------------------
     Exam 2.2 — icon tile colors.
     6 colors taken from the house palette (design/DESIGN.md) so the
     random pick never leaves the Chokepoint look.
     ------------------------------------------------------------------- */
  /* Every value below is a house token color (design/tokens.css). */
  var ICON_COLORS = [
    "#FBE7DD", /* coral wash  (--it-accent-soft) */
    "#F6E7D2", /* amber wash  (--it-state-warn-bg) */
    "#E4EEE2", /* moss wash   (--it-state-ok-bg)   */
    "#ECEBE6", /* warm grey   (--it-state-info-bg) */
    "#F1F0EC", /* sunk        (--it-sunk)           */
    "#FAFAF7"  /* paper       (--it-paper)          */
  ];

  /* -------------------------------------------------------------------
     Issue states — exactly 4, one per state color of the token set.
     `token` drives the chip + the issue-card background color.
     ------------------------------------------------------------------- */
  var STATUSES = [
    { id: "open",        label: "OPEN",        token: "info", chip: "it-chip" },
    { id: "in-progress", label: "IN PROGRESS", token: "warn", chip: "it-chip it-chip-warn" },
    { id: "done",        label: "DONE",        token: "ok",   chip: "it-chip it-chip-ok" },
    { id: "blocked",     label: "BLOCKED",     token: "crit", chip: "it-chip it-chip-crit" }
  ];

  var PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  /* -------------------------------------------------------------------
     Seed data — 3 registers (with nested issues) + 3 people, so the
     deployed app is never empty.
     ------------------------------------------------------------------- */
  function seed() {
    return {
      version: 1,
      people: [
        {
          id: "PEO-001",
          name: "Ricardo Marvin",
          role: "BIM Lead",
          email: "ricardo.marvin@example.com",
          phone: "+56 9 5011 2244"
        },
        {
          id: "PEO-002",
          name: "Ana Fuentes",
          role: "Site Architect",
          email: "ana.fuentes@example.com",
          phone: "+56 9 6622 8831"
        },
        {
          id: "PEO-003",
          name: "Tomas Ivanez",
          role: "QA Inspector",
          email: "tomas.ivanez@example.com",
          phone: "+56 9 7733 4502"
        }
      ],
      projects: [
        {
          id: "REG-001",
          code: "P-001",
          name: "Tower North",
          site: "Quilpue / Torre Norte",
          description: "Residential tower — structural package and facade handover.",
          date: "2026-09-18",
          leadId: "PEO-001",
          color: ICON_COLORS[0],
          status: "active",
          todos: [
            {
              id: "ISS-001",
              title: "Facade panel gap over 18 mm at level 3",
              description: "Panel joints exceed tolerance, rework requested on zone 3.",
              status: "blocked",
              priority: "CRITICAL",
              assigneeId: "PEO-002",
              due: "2026-11-04",
              createdAt: "2026-09-20T09:00:00.000Z"
            },
            {
              id: "ISS-002",
              title: "Rebar inspection overdue on core B",
              description: "Inspection request logged three days before the pour date.",
              status: "in-progress",
              priority: "HIGH",
              assigneeId: "PEO-003",
              due: "2026-11-01",
              createdAt: "2026-09-24T12:30:00.000Z"
            },
            {
              id: "ISS-003",
              title: "Pour schedule drift on level 4",
              description: "Cure window shortened by 2 hours, closed after re-planning.",
              status: "done",
              priority: "MEDIUM",
              assigneeId: "PEO-001",
              due: "2026-10-02",
              createdAt: "2026-09-28T08:15:00.000Z"
            }
          ]
        },
        {
          id: "REG-002",
          code: "P-002",
          name: "Depot West",
          site: "Valparaiso / Bodega Oeste",
          description: "Logistics depot — foundations, steel frame and roof deck.",
          date: "2026-08-27",
          leadId: "PEO-002",
          color: ICON_COLORS[1],
          status: "active",
          todos: [
            {
              id: "ISS-004",
              title: "Anchor bolts misaligned on grid 4",
              description: "Hold point reached, template re-check requested.",
              status: "in-progress",
              priority: "HIGH",
              assigneeId: "PEO-002",
              due: "2026-10-30",
              createdAt: "2026-09-02T10:00:00.000Z"
            },
            {
              id: "ISS-005",
              title: "Dock leveller clearance below spec",
              description: "20 mm short of the drawn clearance, supplier notified.",
              status: "open",
              priority: "LOW",
              assigneeId: "PEO-003",
              due: "2026-11-12",
              createdAt: "2026-09-05T15:45:00.000Z"
            }
          ]
        },
        {
          id: "REG-003",
          code: "P-003",
          name: "Pier Annex",
          site: "Viña del Mar / Anexo Muelle",
          description: "Annex pier — service trenches, drainage and finishes.",
          date: "2026-10-02",
          leadId: "PEO-003",
          color: ICON_COLORS[2],
          status: "active",
          todos: [
            {
              id: "ISS-006",
              title: "Drainage falls below 1:80 on the east run",
              description: "Survey confirms 1:96, redesign of the last two gullies.",
              status: "blocked",
              priority: "CRITICAL",
              assigneeId: "PEO-001",
              due: "2026-10-28",
              createdAt: "2026-10-04T09:20:00.000Z"
            },
            {
              id: "ISS-007",
              title: "Finish samples not approved",
              description: "Waiting on the client sign-off of the palette.",
              status: "open",
              priority: "MEDIUM",
              assigneeId: "PEO-002",
              due: "2026-11-20",
              createdAt: "2026-10-06T11:05:00.000Z"
            }
          ]
        }
      ]
    };
  }

  /* -------------------------------------------------------------------
     Persistence helpers
     ------------------------------------------------------------------- */
  var data = null;

  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.people)) {
          return parsed;
        }
      }
    } catch (err) {
      /* localStorage unavailable (private mode / file://) — stay in memory */
    }
    return seed();
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      /* in-memory only */
    }
  }

  function init() {
    if (!data) {
      data = load();
      save();
    }
    return data;
  }

  /* -------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------- */
  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /* Ids are always three digits: REG-004, ISS-012, PEO-007. */
  function pad3(n) {
    return (n < 10 ? "00" : n < 100 ? "0" : "") + n;
  }

  /* Local (not UTC) YYYY-MM-DD — used for the default register date. */
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /* Exam 2.2 — pick one of the 6 house-style icon colors at random. */
  function pickIconColor() {
    return ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* True when the key is actually present in the payload — used by the
     import merge so partial payloads never wipe existing values. */
  function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined;
  }

  /* Colors are clamped to the house palette: an imported color is only
     used when it is one of the six token colors, otherwise the preserved
     (or a random palette) color is used. */
  function safeColor(value, fallback) {
    var color = String(value === null || value === undefined ? "" : value).trim();
    for (var i = 0; i < ICON_COLORS.length; i += 1) {
      if (ICON_COLORS[i].toLowerCase() === color.toLowerCase()) return ICON_COLORS[i];
    }
    return fallback || pickIconColor();
  }

  function nextId(prefix, collection) {
    var max = 0;
    collection.forEach(function (item) {
      var match = String(item.id || "").match(/(\d+)$/);
      if (match) {
        var n = parseInt(match[1], 10);
        if (n > max) max = n;
      }
    });
    return prefix + pad3(max + 1);
  }

  /* Build a register object from a raw payload. Only the keys actually
     present are filled in, so a partial import never invents (or wipes)
     values. */
  function normalizeProject(raw) {
    var project = {
      id: String(raw.id || ""),
      code: has(raw, "code") ? String(raw.code).trim() : "",
      name: String(raw.name === null || raw.name === undefined ? "" : raw.name).trim(),
      site: has(raw, "site") ? String(raw.site).trim() : "",
      description: has(raw, "description") ? String(raw.description).trim() : "",
      date: has(raw, "date") ? String(raw.date).trim() || todayISO() : todayISO(),
      leadId: has(raw, "leadId") ? raw.leadId || null : null,
      color: safeColor(raw.color, pickIconColor()),
      status: has(raw, "status") ? String(raw.status) : "active",
      /* ToDos always live inside the project object */
      todos: []
    };
    if (Array.isArray(raw.todos)) {
      raw.todos.forEach(function (todo) {
        project.todos.push(normalizeTodo(todo, project));
      });
    }
    return project;
  }

  /* One issue object; status/priority fall back to safe values. */
  function normalizeTodo(todo, project) {
    var id = String(todo.id || "");
    if (!id) id = nextId("ISS-", project.todos);
    return {
      id: id,
      title: String(todo.title === null || todo.title === undefined ? "" : todo.title).trim(),
      description: String(todo.description === null || todo.description === undefined ? "" : todo.description).trim(),
      status: validStatus(todo.status) ? todo.status : "open",
      priority: PRIORITIES.indexOf(todo.priority) >= 0 ? todo.priority : "MEDIUM",
      assigneeId: todo.assigneeId || null,
      due: String(todo.due === null || todo.due === undefined ? "" : todo.due).trim(),
      createdAt: todo.createdAt || nowISO()
    };
  }

  /* Full-snapshot reconciliation: the issues carried by the payload are
     authoritative — issues missing from it are removed, issues present in
     it are updated (only the keys they carry) or created. */
  function reconcileTodos(project, incomingTodos) {
    var keep = {};

    incomingTodos.forEach(function (raw) {
      if (!raw) return;
      var incoming = normalizeTodo(raw, project);
      keep[incoming.id] = true;

      var match = null;
      project.todos.forEach(function (current) {
        if (current.id === incoming.id) match = current;
      });

      if (!match) {
        project.todos.push(incoming);
        return;
      }
      if (has(raw, "title")) match.title = incoming.title;
      if (has(raw, "description")) match.description = incoming.description;
      if (has(raw, "status")) match.status = incoming.status;
      if (has(raw, "priority")) match.priority = incoming.priority;
      if (has(raw, "assigneeId")) match.assigneeId = incoming.assigneeId;
      if (has(raw, "due")) match.due = incoming.due;
    });

    project.todos = project.todos.filter(function (todo) {
      return keep[todo.id] === true;
    });
  }

  function validStatus(status) {
    return STATUSES.some(function (s) {
      return s.id === status;
    });
  }

  function statusInfo(status) {
    for (var i = 0; i < STATUSES.length; i += 1) {
      if (STATUSES[i].id === status) return STATUSES[i];
    }
    return STATUSES[0];
  }

  /* -------------------------------------------------------------------
     People (assignees)
     ------------------------------------------------------------------- */
  function listPeople() {
    init();
    return data.people.slice();
  }

  function getPerson(id) {
    init();
    for (var i = 0; i < data.people.length; i += 1) {
      if (data.people[i].id === id) return data.people[i];
    }
    return null;
  }

  function createPerson(fields) {
    init();
    var name = String(fields.name || "").trim();
    if (name.length < MIN_PERSON_LENGTH) {
      return { ok: false, error: "NAME TOO SHORT — MIN 2 CHARACTERS" };
    }
    var email = String(fields.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "EMAIL FORMAT INVALID" };
    }
    var person = {
      id: nextId("PEO-", data.people),
      name: name,
      role: String(fields.role || "").trim() || "Assignee",
      email: email,
      phone: String(fields.phone || "").trim()
    };
    data.people.push(person);
    save();
    return { ok: true, person: person };
  }

  function updatePerson(id, patch) {
    init();
    var person = getPerson(id);
    if (!person) return { ok: false, error: "PERSON NOT FOUND" };
    if (patch.name != null) person.name = String(patch.name).trim();
    if (patch.role != null) person.role = String(patch.role).trim();
    if (patch.email != null) person.email = String(patch.email).trim();
    if (patch.phone != null) person.phone = String(patch.phone).trim();
    save();
    return { ok: true, person: person };
  }

  /* How many issues are assigned to a person (across all registers). */
  function personIssueCount(personId) {
    init();
    var count = 0;
    data.projects.forEach(function (project) {
      project.todos.forEach(function (todo) {
        if (todo.assigneeId === personId) count += 1;
      });
    });
    return count;
  }

  /* -------------------------------------------------------------------
     Registers (projects)
     ------------------------------------------------------------------- */
  function listProjects() {
    init();
    return data.projects.slice();
  }

  function getProject(id) {
    init();
    for (var i = 0; i < data.projects.length; i += 1) {
      if (data.projects[i].id === id) return data.projects[i];
    }
    return null;
  }

  /* Exam 2.3 — refuses names shorter than MIN_NAME_LENGTH. */
  function createProject(fields) {
    init();
    var name = String(fields.name || "").trim();
    if (name.length < MIN_NAME_LENGTH) {
      return { ok: false, error: "NAME TOO SHORT — MIN 5 CHARACTERS" };
    }
    var project = normalizeProject({
      id: nextId("REG-", data.projects),
      code: String(fields.code || "").trim(),
      name: name,
      site: String(fields.site || "").trim(),
      description: String(fields.description || "").trim(),
      /* Exam 2.4 — empty date falls back to today. */
      date: String(fields.date || "").trim() || todayISO(),
      leadId: fields.leadId || null,
      /* Exam 2.2 — random icon background color for this card. */
      color: pickIconColor(),
      status: "active",
      todos: []
    });
    data.projects.push(project);
    save();
    return { ok: true, project: project };
  }

  /* Exam 2.5 — update register info from the details page. */
  function updateProject(id, patch) {
    init();
    var project = getProject(id);
    if (!project) return { ok: false, error: "REGISTER NOT FOUND" };
    if (patch.name != null) {
      var name = String(patch.name).trim();
      if (name.length < MIN_NAME_LENGTH) {
        return { ok: false, error: "NAME TOO SHORT — MIN 5 CHARACTERS" };
      }
      project.name = name;
    }
    if (patch.code != null) project.code = String(patch.code).trim();
    if (patch.site != null) project.site = String(patch.site).trim();
    if (patch.description != null) project.description = String(patch.description).trim();
    if (patch.date != null) project.date = String(patch.date).trim() || todayISO();
    if (patch.leadId !== undefined) project.leadId = patch.leadId || null;
    if (patch.status != null) project.status = String(patch.status);
    save();
    return { ok: true, project: project };
  }

  function deleteProject(id) {
    init();
    var before = data.projects.length;
    data.projects = data.projects.filter(function (project) {
      return project.id !== id;
    });
    save();
    return before !== data.projects.length;
  }

  /* Summary numbers used by the cards and the stats strip. */
  function projectStats(project) {
    var total = project.todos.length;
    var open = 0;
    var blocked = 0;
    project.todos.forEach(function (todo) {
      if (todo.status !== "done") open += 1;
      if (todo.status === "blocked") blocked += 1;
    });
    return { total: total, open: open, blocked: blocked };
  }

  function overallStats() {
    init();
    var registers = data.projects.length;
    var issues = 0;
    var open = 0;
    var blocked = 0;
    data.projects.forEach(function (project) {
      var stats = projectStats(project);
      issues += stats.total;
      open += stats.open;
      blocked += stats.blocked;
    });
    return {
      registers: registers,
      issues: issues,
      open: open,
      blocked: blocked,
      people: data.people.length
    };
  }

  /* -------------------------------------------------------------------
     ToDos (issues) — nested inside the project object
     ------------------------------------------------------------------- */
  function addTodo(projectId, fields) {
    init();
    var project = getProject(projectId);
    if (!project) return { ok: false, error: "REGISTER NOT FOUND" };
    var title = String(fields.title || "").trim();
    if (!title) return { ok: false, error: "ISSUE TITLE REQUIRED" };
    var todo = {
      id: nextId("ISS-", project.todos),
      title: title,
      description: String(fields.description || "").trim(),
      /* Exam 2.9 — status is chosen at creation time. */
      status: validStatus(fields.status) ? fields.status : "open",
      priority: PRIORITIES.indexOf(fields.priority) >= 0 ? fields.priority : "MEDIUM",
      assigneeId: fields.assigneeId || null,
      due: String(fields.due || "").trim(),
      createdAt: nowISO()
    };
    project.todos.push(todo);
    save();
    return { ok: true, todo: todo, project: project };
  }

  /* Exam 2.9 — status (and any other field) editable later on. */
  function updateTodo(projectId, todoId, patch) {
    init();
    var project = getProject(projectId);
    if (!project) return { ok: false, error: "REGISTER NOT FOUND" };
    for (var i = 0; i < project.todos.length; i += 1) {
      if (project.todos[i].id !== todoId) continue;
      var todo = project.todos[i];
      if (patch.title != null) todo.title = String(patch.title).trim();
      if (patch.description != null) todo.description = String(patch.description).trim();
      if (patch.status != null && validStatus(patch.status)) todo.status = patch.status;
      if (patch.priority != null && PRIORITIES.indexOf(patch.priority) >= 0) todo.priority = patch.priority;
      if (patch.assigneeId !== undefined) todo.assigneeId = patch.assigneeId || null;
      if (patch.due != null) todo.due = String(patch.due).trim();
      save();
      return { ok: true, todo: todo, project: project };
    }
    return { ok: false, error: "ISSUE NOT FOUND" };
  }

  function deleteTodo(projectId, todoId) {
    init();
    var project = getProject(projectId);
    if (!project) return false;
    var before = project.todos.length;
    project.todos = project.todos.filter(function (todo) {
      return todo.id !== todoId;
    });
    save();
    return before !== project.todos.length;
  }

  /* -------------------------------------------------------------------
     Exam 2.7 — JSON export (ToDos are included, they live inside the
     project objects) / Exam 2.8 — JSON import with update-by-id.
     ------------------------------------------------------------------- */
  function exportJSON() {
    init();
    return JSON.stringify(
      {
        version: data.version,
        exportedAt: nowISO(),
        app: "IssueTrack",
        people: clone(data.people),
        projects: clone(data.projects)
      },
      null,
      2
    );
  }

  function importProjects(payload) {
    init();
    var incoming = [];
    if (Array.isArray(payload)) {
      incoming = payload;
    } else if (payload && Array.isArray(payload.projects)) {
      incoming = payload.projects;
    } else {
      return { ok: false, error: "NO PROJECTS FOUND IN FILE", added: 0, updated: 0 };
    }

    var added = 0;
    var updated = 0;
    var skipped = 0;
    var rejected = [];

    incoming.forEach(function (raw) {
      if (!raw || !raw.id) {
        skipped += 1;
        return;
      }

      var id = String(raw.id);
      var name = String(raw.name === null || raw.name === undefined ? "" : raw.name).trim();

      /* Exam 2.3 also applies to imported registers: a name shorter than
         MIN_NAME_LENGTH is refused and reported back to the user. */
      if (name.length < MIN_NAME_LENGTH) {
        skipped += 1;
        rejected.push(id + " (NAME TOO SHORT)");
        return;
      }

      var existing = getProject(id);

      if (existing) {
        /* Exam 2.8 — same id means UPDATE, never a duplicate.
           Only the keys carried by the payload are overwritten, so a
           partial payload preserves everything it does not mention. */
        if (has(raw, "name")) existing.name = name;
        if (has(raw, "code")) existing.code = String(raw.code).trim();
        if (has(raw, "site")) existing.site = String(raw.site).trim();
        if (has(raw, "description")) existing.description = String(raw.description).trim();
        if (has(raw, "date")) existing.date = String(raw.date).trim() || existing.date;
        if (has(raw, "leadId")) existing.leadId = raw.leadId || null;
        if (has(raw, "color")) existing.color = safeColor(raw.color, existing.color);
        if (has(raw, "status")) existing.status = String(raw.status);

        /* A payload carrying a todos array is a full snapshot of that
           register's issues: the payload wins, absent issues are removed. */
        if (Array.isArray(raw.todos)) {
          reconcileTodos(existing, raw.todos);
        }
        updated += 1;
      } else {
        var normalized = normalizeProject(raw);
        normalized.name = name;
        data.projects.push(normalized);
        added += 1;
      }
    });

    /* People are imported too when the file carries them. */
    var peopleAdded = 0;
    var peopleUpdated = 0;
    if (payload && Array.isArray(payload.people)) {
      payload.people.forEach(function (raw) {
        if (!raw || !raw.id) return;
        var existing = getPerson(raw.id);
        if (existing) {
          existing.name = raw.name || existing.name;
          existing.role = raw.role || existing.role;
          existing.email = raw.email || existing.email;
          existing.phone = raw.phone || existing.phone;
          peopleUpdated += 1;
        } else {
          data.people.push({
            id: String(raw.id),
            name: String(raw.name || "Assignee"),
            role: raw.role || "Assignee",
            email: raw.email || "",
            phone: raw.phone || ""
          });
          peopleAdded += 1;
        }
      });
    }

    save();
    return {
      ok: true,
      added: added,
      updated: updated,
      skipped: skipped,
      rejected: rejected,
      peopleAdded: peopleAdded,
      peopleUpdated: peopleUpdated
    };
  }

  function resetToSeed() {
    data = seed();
    save();
    return data;
  }

  /* -------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------- */
  global.IssueTrackStore = {
    MIN_NAME_LENGTH: MIN_NAME_LENGTH,
    ICON_COLORS: ICON_COLORS,
    STATUSES: STATUSES,
    PRIORITIES: PRIORITIES,
    init: init,
    todayISO: todayISO,
    pickIconColor: pickIconColor,
    statusInfo: statusInfo,
    listPeople: listPeople,
    getPerson: getPerson,
    createPerson: createPerson,
    updatePerson: updatePerson,
    personIssueCount: personIssueCount,
    listProjects: listProjects,
    getProject: getProject,
    createProject: createProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    projectStats: projectStats,
    overallStats: overallStats,
    addTodo: addTodo,
    updateTodo: updateTodo,
    deleteTodo: deleteTodo,
    exportJSON: exportJSON,
    importProjects: importProjects,
    resetToSeed: resetToSeed
  };
})(typeof window !== "undefined" ? window : globalThis);
