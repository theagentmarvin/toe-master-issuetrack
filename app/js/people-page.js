/* =====================================================================
   IssueTrack — people page (people.html).
   A user directory (rows, not cards) plus a form to add new people.
   ===================================================================== */
(function () {
  "use strict";

  var store = window.IssueTrackStore;
  var UI = window.IssueTrackUI;

  var statsBox = document.getElementById("stats");
  var peopleBody = document.getElementById("people-body");
  var peopleCount = document.getElementById("people-count");
  var sideRegisters = document.getElementById("side-registers");
  var topbarMeta = document.getElementById("topbar-meta");

  var form = document.getElementById("person-form");
  var nameInput = document.getElementById("p-name");
  var nameError = document.getElementById("p-name-error");
  var roleInput = document.getElementById("p-role");
  var emailInput = document.getElementById("p-email");
  var emailError = document.getElementById("p-email-error");
  var phoneInput = document.getElementById("p-phone");
  var formStatus = document.getElementById("form-status");

  /* ------------------------------------------------------------------
     Rendering — a directory table, visually different from the
     register cards (no tiles, no random color, plain hairline rows).
     ------------------------------------------------------------------ */
  function renderStats() {
    var people = store.listPeople();
    var roles = {};
    people.forEach(function (person) {
      roles[person.role] = true;
    });
    var assigned = 0;
    people.forEach(function (person) {
      assigned += store.personIssueCount(person.id);
    });

    statsBox.innerHTML =
      '<div class="it-stat"><b class="it-num">' + people.length + "</b><span>People</span></div>" +
      '<div class="it-stat"><b class="it-num">' + Object.keys(roles).length + "</b><span>Roles</span></div>" +
      '<div class="it-stat"><b class="it-num">' + assigned + "</b><span>Assigned issues</span></div>";
  }

  function renderDirectory() {
    var people = store.listPeople();

    if (!people.length) {
      peopleBody.innerHTML =
        '<tr><td colspan="5" class="it-muted-text">NOBODY IN THE DIRECTORY YET</td></tr>';
    } else {
      peopleBody.innerHTML = people
        .map(function (person) {
          var issues = store.personIssueCount(person.id);
          return (
            "<tr>" +
              '<td><div class="it-person-cell">' +
                '<span class="it-avatar">' + UI.esc(UI.initials(person.name)) + "</span>" +
                '<span class="it-person-name">' + UI.esc(person.name) + "</span>" +
              "</div></td>" +
              "<td>" + UI.esc(person.role) + "</td>" +
              "<td>" + UI.esc(person.email || "—") + "</td>" +
              "<td>" + UI.esc(person.phone || "—") + "</td>" +
              '<td class="it-dir-num it-num">' + issues + "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    peopleCount.textContent = people.length + " PEOPLE";
  }

  function render() {
    renderStats();
    renderDirectory();
    UI.renderSideRegisters(sideRegisters);
    UI.renderTopbarMeta(topbarMeta);
  }

  /* ------------------------------------------------------------------
     Add a new person
     ------------------------------------------------------------------ */
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = nameInput.value.trim();
    if (name.length < 2) {
      UI.showFieldError(nameInput, nameError, "NAME TOO SHORT — MIN 2 CHARACTERS");
      UI.setStatus(formStatus, "PERSON NOT ADDED — NAME TOO SHORT", "crit");
      nameInput.focus();
      return;
    }
    UI.clearFieldError(nameInput, nameError);

    var result = store.createPerson({
      name: name,
      role: roleInput.value,
      email: emailInput.value,
      phone: phoneInput.value
    });

    if (!result.ok) {
      if (result.error.indexOf("EMAIL") >= 0) {
        UI.showFieldError(emailInput, emailError, result.error);
      } else {
        UI.showFieldError(nameInput, nameError, result.error);
      }
      UI.setStatus(formStatus, "PERSON NOT ADDED — " + result.error, "crit");
      return;
    }

    form.reset();
    render();
    UI.setStatus(formStatus, "PERSON ADDED — " + result.person.name.toUpperCase(), "ok");
  });

  nameInput.addEventListener("input", function () {
    UI.clearFieldError(nameInput, nameError);
  });

  emailInput.addEventListener("input", function () {
    UI.clearFieldError(emailInput, emailError);
  });

  document.getElementById("btn-new-person").addEventListener("click", function () {
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    nameInput.focus();
  });

  /* ------------------------------------------------------------------ */
  store.init();
  render();
  UI.markActiveNav();
})();
