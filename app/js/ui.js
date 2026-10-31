/* =====================================================================
   IssueTrack — shared UI helpers (vanilla JS).
   Small, dumb functions shared by the three pages. No framework.
   ===================================================================== */
(function (global) {
  "use strict";

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* Escape anything that goes into innerHTML. */
  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* --- formatting ---------------------------------------------------- */

  /* 2026-09-18 -> 18/09/2026 */
  function formatDate(iso) {
    if (!iso) return "—";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  /* Exam 2.1 — the first two letters of the project name.
     Deliberately NOT uppercased here: the uppercasing is done in CSS
     (.it-tile { text-transform: uppercase; }). */
  function iconLetters(name) {
    return String(name || "").trim().slice(0, 2);
  }

  /* Person initials for the directory (differs from the register tile). */
  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  }

  function plural(count, word) {
    return count + " " + word + (count === 1 ? "" : "s");
  }

  /* --- inline validation (house style) ------------------------------- */

  function showFieldError(input, errorNode, message) {
    if (input) {
      input.classList.add("it-invalid");
      input.setAttribute("aria-invalid", "true");
    }
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.hidden = false;
    }
  }

  function clearFieldError(input, errorNode) {
    if (input) {
      input.classList.remove("it-invalid");
      input.removeAttribute("aria-invalid");
    }
    if (errorNode) {
      errorNode.textContent = "";
      errorNode.hidden = true;
    }
  }

  /* --- status banner -------------------------------------------------- */

  function setStatus(node, message, kind) {
    if (!node) return;
    node.textContent = message;
    node.className = "it-status" + (kind ? " is-" + kind : "");
    node.hidden = !message;
  }

  /* --- selects -------------------------------------------------------- */

  /* Options list for a <select>; `selected` is the current value. */
  function options(list, selected, labels) {
    return list
      .map(function (item) {
        var value = typeof item === "string" ? item : item.id;
        var label = labels ? labels[value] || value : typeof item === "string" ? item : item.label;
        var isSelected = String(value) === String(selected) ? " selected" : "";
        return '<option value="' + esc(value) + '"' + isSelected + ">" + esc(label) + "</option>";
      })
      .join("");
  }

  /* --- navigation ----------------------------------------------------- */

  function go(url) {
    global.location.href = url;
  }

  function projectUrl(id) {
    return "project.html?id=" + encodeURIComponent(id);
  }

  /* --- shared chrome -------------------------------------------------- */

  /* Top bar meta strip: date + counters (recomputed by every page). */
  function renderTopbarMeta(node) {
    if (!node) return;
    var store = global.IssueTrackStore;
    if (!store) return;
    var stats = store.overallStats();
    node.innerHTML =
      esc(store.todayISO()) +
      " &nbsp;·&nbsp; " +
      stats.registers +
      " REGISTERS &nbsp;·&nbsp; " +
      stats.open +
      " OPEN ISSUES &nbsp;·&nbsp; " +
      stats.blocked +
      " BLOCKED";
  }

  /* Side nav active state, driven by <body data-page="...">. */
  function markActiveNav() {
    var page = document.body.getAttribute("data-page");
    qsa(".it-nav a").forEach(function (link) {
      if (link.getAttribute("data-nav") === page) {
        link.classList.add("it-active");
      } else {
        link.classList.remove("it-active");
      }
    });
  }

  /* Quick register list in the sidebar. */
  function renderSideRegisters(node) {
    if (!node) return;
    var store = global.IssueTrackStore;
    var projects = store.listProjects();
    if (!projects.length) {
      node.innerHTML = '<div class="it-muted-text">NO REGISTERS</div>';
      return;
    }
    node.innerHTML = projects
      .map(function (project) {
        var stats = store.projectStats(project);
        return (
          '<a class="it-side-link" href="' +
          esc(projectUrl(project.id)) +
          '"><span>' +
          esc(project.code || project.id) +
          " · " +
          esc(project.name) +
          '</span><span class="it-num">' +
          stats.open +
          "</span></a>"
        );
      })
      .join("");
  }

  global.IssueTrackUI = {
    qs: qs,
    qsa: qsa,
    esc: esc,
    formatDate: formatDate,
    iconLetters: iconLetters,
    initials: initials,
    plural: plural,
    showFieldError: showFieldError,
    clearFieldError: clearFieldError,
    setStatus: setStatus,
    options: options,
    go: go,
    projectUrl: projectUrl,
    renderTopbarMeta: renderTopbarMeta,
    markActiveNav: markActiveNav,
    renderSideRegisters: renderSideRegisters
  };
})(window);
