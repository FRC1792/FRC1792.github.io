(function () {
  "use strict";

  // --- Session guard: redirect to home if no session ---
  const _session = sessionStorage.getItem("scoutSession");
  if (!_session) {
    window.location.replace("index.html");
    return;
  }
  const _sessionData = JSON.parse(_session);
  const IS_DEMO = _sessionData.demo === true;

  // Show demo banner if in demo mode
  if (IS_DEMO) {
    const banner = document.getElementById("demoBanner");
    if (banner) banner.style.display = "flex";
  }

  // Settings loaded from js/config.js (edit that file, not this one)
  const CONFIG = SCOUTING_CONFIG;

  const TBA_TEAMS_AT_EVENT = (eventKey) =>
    `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}/teams/simple`;

  const SCREENS = [
    {
      title: "התחלה",
      subtitle: "הכנס מידע על המשחק הקבומות ואז תעשה סקווטינג",
    },
    { title: "אוטונומי", subtitle: "תעקוב אחרי כמות כדורים ואחרי טיפוס במגדל" },
    {
      title: "טלאופ",
      subtitle: "תעקוב אחרי קליעה במהלך השלבם הפעילים והלא פעילים של המשחק",
    },
    {
      title: "סוף משחק",
      subtitle: "תבחר בשלב תיפוס והאם היה ניקוד בסוף המשחק",
    },
    { title: "תסדר/תשלך", subtitle: "רמה מיקום סיכום תגובה ושליחה" },
  ];

  const state = {
    screen: 0,
    loadedTeams: [],
    startPos: null,
    climbPos: null,
    autoTower: null,
    teleopTower: null,
    EndgameShoot: null,
    Feed: null,
  };

  const $ = (id) => document.getElementById(id);
  const toastEl = $("toast");

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => (toastEl.style.display = "none"), 2500);
  }

  function updateOnline() {
    const online = navigator.onLine;
    $("netDot").classList.toggle("ok", online);
    $("netDot").classList.toggle("bad", !online);
    $("netText").textContent = online ? "Online" : "Offline";
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  function updateProgress() {
    document.querySelectorAll(".progress .step").forEach((step, i) => {
      step.classList.toggle("complete", i < state.screen);
      step.classList.toggle("active", i === state.screen);
    });
  }

  function showScreen(i) {
    state.screen = i;

    document.querySelectorAll(".screen").forEach((sec) => {
      sec.style.display = Number(sec.dataset.screen) === i ? "block" : "none";
    });

    $("screenTitle").textContent = SCREENS[i].title;
    $("screenSubtitle").textContent = SCREENS[i].subtitle;

    $("btnBack").style.display = i === 0 ? "none" : "inline-flex";
    $("btnNext").style.display =
      i === SCREENS.length - 1 ? "none" : "inline-flex";
    $("btnSubmit").style.display =
      i === SCREENS.length - 1 ? "inline-flex" : "none";

    updateProgress();
  }

  $("btnBack").addEventListener("click", () =>
    showScreen(Math.max(0, state.screen - 1)),
  );
  $("btnNext").addEventListener("click", () => {
    if (!IS_DEMO) {
      if (state.screen === 0 && !validateStart()) return;
      if (state.screen === 1 && !validateAuto()) return;
      if (state.screen === 2 && !validateTeleop()) return;
      if (state.screen === 3 && !validateEndgame()) return;
    }

    showScreen(Math.min(SCREENS.length - 1, state.screen + 1));
  });

  $("btnReset").addEventListener("click", () => {
    if (!confirm("Reset this scouting entry?")) return;
    resetEntry();
    toast("✓ Reset complete");
  });

  function resetEntry() {
    const name = $("studentName").value;
    $("matchNumber").value = "";
    $("teamNumber").value = "";
    $("autoFuel").value = "";
    $("fuelNeutralZone").checked = false;
    $("fuelOutpost").checked = false;
    $("fuelDepot").checked = false;
    $("fuelOther").checked = false;
    $("fuelNone").checked = false;
    $("autoBumpOver").checked = false;
    $("autoTrenchUnder").checked = false;
    $("autoBumpTrenchNone").checked = false;
    $("teleopFuelActive").value = "";
    $("teleopFuelNeutralZone").checked = false;
    $("teleopFuelOutpost").checked = false;
    $("teleopFuelDepot").checked = false;
    $("teleopFuelOther").checked = false;
    $("teleopFuelNone").checked = false;
    $("teleopBumpOver").checked = false;
    $("teleopTrenchUnder").checked = false;
    $("teleopBumpTrenchNone").checked = false;
    $("defenseRating").value = "";
    $("againstDefenseRating").value = "";
    $("comments").value = "";

    state.startPos = null;
    state.climbPos = null;
    state.autoTower = null;
    state.teleopTower = null;
    state.EndgameShoot = null;
    state.Feed = null;

    $("studentName").value = name;

    renderSegments();
    showScreen(0);
  }

  // Bump/Trench mutual exclusion: "None" clears the others, and vice versa
  $("autoBumpOver").addEventListener("change", function () {
    if (this.checked) $("autoBumpTrenchNone").checked = false;
  });
  $("autoTrenchUnder").addEventListener("change", function () {
    if (this.checked) $("autoBumpTrenchNone").checked = false;
  });
  $("autoBumpTrenchNone").addEventListener("change", function () {
    if (this.checked) {
      $("autoBumpOver").checked = false;
      $("autoTrenchUnder").checked = false;
    }
  });

  function renderSegments() {
    document
      .querySelectorAll("#fieldSelector .field-position")
      .forEach((pos) => {
        pos.classList.toggle("active", pos.dataset.value === state.startPos);
      });
    document.querySelectorAll("#climbSelector .tower-zone").forEach((pos) => {
      pos.classList.toggle("active", pos.dataset.value === state.climbPos);
    });
    document.querySelectorAll("#autoTowerSeg .chip").forEach((ch) => {
      ch.classList.toggle("active", ch.dataset.value === state.autoTower);
    });
    document.querySelectorAll("#teleopTowerSeg .chip").forEach((ch) => {
      ch.classList.toggle("active", ch.dataset.value === state.teleopTower);
    });
    document.querySelectorAll("#shotInHubSeg .chip").forEach((ch) => {
      ch.classList.toggle("active", ch.dataset.value === state.EndgameShoot);
    });
    document.querySelectorAll("#feeder .chip").forEach((ch) => {
      ch.classList.toggle("active", ch.dataset.value === state.Feed);
    });
  }

  document.querySelectorAll("#fieldSelector .field-position").forEach((pos) => {
    pos.addEventListener("click", () => {
      state.startPos = pos.dataset.value;
      renderSegments();
    });
  });
  document.querySelectorAll("#climbSelector .tower-zone").forEach((pos) => {
    pos.addEventListener("click", () => {
      state.climbPos = pos.dataset.value;
      renderSegments();
    });
  });

  document.querySelectorAll("#autoTowerSeg .chip").forEach((ch) => {
    ch.addEventListener("click", () => {
      state.autoTower = ch.dataset.value;
      renderSegments();
      updateEstimate();
    });
  });
  document.querySelectorAll("#teleopTowerSeg .chip").forEach((ch) => {
    ch.addEventListener("click", () => {
      state.teleopTower = ch.dataset.value;
      renderSegments();
    });
  });
  document.querySelectorAll("#shotInHubSeg .chip").forEach((ch) => {
    ch.addEventListener("click", () => {
      state.EndgameShoot = ch.dataset.value;
      renderSegments();
    });
  });
  document.querySelectorAll("#feeder .chip").forEach((ch) => {
    ch.addEventListener("click", () => {
      state.Feed = ch.dataset.value;
      renderSegments();
    });
  });

  function validateStart() {
    const name = $("studentName").value.trim();
    const match = Number($("matchNumber").value);

    if (!name) {
      toast("⚠️ Enter student name");
      return false;
    }

    if (!match || match < 1) {
      toast("⚠️ Enter match number");
      return false;
    }

    return true;
  }

  function validateAuto() {
    if (state.startPos === null) {
      toast("⚠️ Select where robot starts");
      return false;
    }
    if (!$("autoFuel").value) {
      toast("⚠️ Select auto fuel range");
      return false;
    }
    if (state.autoTower === null) {
      toast("⚠️ Select auto tower level");
      return false;
    }
    if (
      !$("fuelNeutralZone").checked &&
      !$("fuelOutpost").checked &&
      !$("fuelDepot").checked &&
      !$("fuelOther").checked &&
      !$("fuelNone").checked
    ) {
      toast("⚠️ Select auto intake zone");
      return false;
    }
    if (
      !$("autoBumpOver").checked &&
      !$("autoTrenchUnder").checked &&
      !$("autoBumpTrenchNone").checked
    ) {
      toast("⚠️ Select auto passing");
      return false;
    }
    return true;
  }

  function validateTeleop() {
    if (!$("teleopFuelActive").value) {
      toast("⚠️ Select teleop fuel (active hub) range");
      return false;
    }
    if (
      !$("teleopFuelNeutralZone").checked &&
      !$("teleopFuelOutpost").checked &&
      !$("teleopFuelDepot").checked &&
      !$("teleopFuelOther").checked &&
      !$("teleopFuelNone").checked
    ) {
      toast("⚠️ Select teleop intake zone");
      return false;
    }
    return true;
  }

  function validateEndgame() {
    if (state.teleopTower === null) {
      toast("⚠️ Select endgame tower level");
      return false;
    }
    if (state.climbPos === null && state.teleopTower !== "NONE") {
      toast("⚠️ Select where robot climbed on tower");
      return false;
    }
    if (state.EndgameShoot === null) {
      toast("⚠️ Select if the robot shot in the endgame");
      return false;
    }
    return true;
  }

  function validateMisc() {
    if (state.Feed === null) {
      toast("⚠️ Select if the robot did feeding");
      return false;
    }
    if (
      !$("teleopBumpOver").checked &&
      !$("teleopTrenchUnder").checked &&
      !$("teleopBumpTrenchNone").checked
    ) {
      toast("⚠️ Select teleop passing");
      return false;
    }
    if (!$("defenseRating").value) {
      toast("⚠️ Select defense rating");
      return false;
    }
    if (!$("againstDefenseRating").value) {
      toast("⚠️ Select against defense rating");
      return false;
    }
    if (!$("comments").value) {
      toast("⚠️ Leave Comments");
      return false;
    }
    return true;
  }

  function teamsCacheKey() {
    return `teamsCache_${CONFIG.EVENT_KEY}`;
  }

  function loadCachedTeams() {
    try {
      const cached = localStorage.getItem(teamsCacheKey());
      if (cached) {
        const parsedTeams = JSON.parse(cached);
        if (parsedTeams && parsedTeams.length > 0) {
          state.loadedTeams = parsedTeams;
          console.log(`✓ Loaded ${state.loadedTeams.length} teams from cache`);
          toast(`✓ Loaded ${state.loadedTeams.length} teams (cached)`);
          return true;
        }
      }
    } catch (err) {
      console.error("Error loading cached teams:", err);
    }
    return false;
  }

  function saveCachedTeams(teams) {
    try {
      localStorage.setItem(teamsCacheKey(), JSON.stringify(teams));
      console.log("✓ Teams cached for offline use");
    } catch (err) {
      console.error("Error caching teams:", err);
    }
  }

  async function loadTeams() {
    if (!CONFIG.ENABLE_TEAM_LOADING) {
      console.log("Team loading disabled");
      return;
    }

    // First, try to load from cache
    const hadCached = loadCachedTeams();

    // Then try to fetch fresh data from API
    try {
      console.log("Fetching fresh teams from:", CONFIG.EVENT_KEY);

      const res = await fetch(TBA_TEAMS_AT_EVENT(CONFIG.EVENT_KEY), {
        method: "GET",
        headers: { "X-TBA-Auth-Key": CONFIG.TBA_API_KEY },
      });

      console.log("TBA Response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("TBA Error:", errorText);
        throw new Error(`HTTP ${res.status}`);
      }

      const arr = await res.json();
      console.log("Teams received:", arr.length);

      state.loadedTeams = arr
        .map((t) => ({
          number: t.team_number,
          name: t.nickname || t.name || `Team ${t.team_number}`,
        }))
        .sort((a, b) => a.number - b.number);

      // Save to cache for offline use
      saveCachedTeams(state.loadedTeams);

      console.log(`✓ Loaded ${state.loadedTeams.length} teams from API`);
      if (!hadCached) {
        toast(`✓ Loaded ${state.loadedTeams.length} teams`);
      }
    } catch (err) {
      console.error("Failed to load teams from API:", err);

      // If we have cached teams, we're OK
      if (hadCached) {
        toast("⚠️ Using cached teams (offline)");
      } else {
        toast("⚠️ Couldn't load teams - you can still enter team numbers");
      }
    }
  }

  const teamSearchInput = $("teamNumber");
  const autocompleteResults = $("autocompleteResults");
  let selectedIndex = -1;

  teamSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    if (!query) {
      autocompleteResults.classList.remove("show");
      state.selectedTeam = null;
      return;
    }

    const filtered = state.loadedTeams
      .filter((team) => {
        return (
          team.number.toString().includes(query) ||
          team.name.toLowerCase().includes(query)
        );
      })
      .slice(0, 15);

    if (filtered.length > 0) {
      renderAutocomplete(filtered);
      autocompleteResults.classList.add("show");
      selectedIndex = -1;
    } else {
      autocompleteResults.classList.remove("show");
    }

    state.selectedTeam = null;
  });

  teamSearchInput.addEventListener("keydown", (e) => {
    const items = autocompleteResults.querySelectorAll(".autocomplete-item");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateActiveItem(items);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      items[selectedIndex].click();
    } else if (e.key === "Escape") {
      autocompleteResults.classList.remove("show");
      selectedIndex = -1;
    }
  });

  teamSearchInput.addEventListener("blur", () => {
    setTimeout(() => {
      autocompleteResults.classList.remove("show");
      selectedIndex = -1;
    }, 200);
  });

  function renderAutocomplete(teams) {
    autocompleteResults.innerHTML = teams
      .map(
        (team, i) => `
        <div class="autocomplete-item" data-team="${team.number}">
            <div class="team-num">${team.number}</div>
            <div class="team-name">${team.name}</div>
        </div>
    `,
      )
      .join("");

    autocompleteResults
      .querySelectorAll(".autocomplete-item")
      .forEach((item) => {
        item.addEventListener("click", () => {
          const teamNum = item.dataset.team;
          const team = teams.find((t) => t.number.toString() === teamNum);

          teamSearchInput.value = `${team.number} - ${team.name}`;
          state.selectedTeam = team.number;
          autocompleteResults.classList.remove("show");
        });
      });
  }

  function updateActiveItem(items) {
    items.forEach((item, i) => {
      item.classList.toggle("active", i === selectedIndex);
    });

    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  let isSubmitting = false; // Prevent duplicate submissions

  $("btnSubmit").addEventListener("click", submit);

  function buildPayload() {
    const getVal = (id, defaultVal = "") => {
      const el = document.getElementById(id);
      return el ? el.value : defaultVal;
    };

    const getText = (id, defaultVal = "0") => {
      const el = document.getElementById(id);
      return el ? el.textContent : defaultVal;
    };

    return {
      //general
      timestampISO: new Date().toISOString(),
      studentName: getVal("studentName").trim(),
      eventCode: CONFIG.EVENT_KEY,
      matchNumber: Number(getVal("matchNumber", "0")),
      teamNumber: Number(getVal("teamNumber", "0")),

      //auto
      startPos: state.startPos || "",
      autoFuelRange: getVal("autoFuel"),
      autoTower: state.autoTower || "NONE",
      autoFuelNeutralZone: $("fuelNeutralZone").checked,
      autoFuelOutpost: $("fuelOutpost").checked,
      autoFuelDepot: $("fuelDepot").checked,
      autoFuelOther: $("fuelOther").checked,
      autoFuelNone: $("fuelNone").checked,
      autoBumpOver: $("autoBumpOver").checked,
      autoTrenchUnder: $("autoTrenchUnder").checked,
      autoBumpTrenchNone: $("autoBumpTrenchNone").checked,

      //teleop
      teleopFuelRange: getVal("teleopFuelActive"),
      teleopFuelNeutralZone: $("teleopFuelNeutralZone").checked,
      teleopFuelOutpost: $("teleopFuelOutpost").checked,
      teleopFuelDepot: $("teleopFuelDepot").checked,
      teleopFuelOther: $("teleopFuelOther").checked,
      teleopFuelNone: $("teleopFuelNone").checked,

      //endgame
      Tower: state.teleopTower || "NONE",
      climbPos: state.climbPos || "",
      shotInHub: state.EndgameShoot || "",

      //general
      Feeder: state.Feed || "",
      teleopBumpOver: $("teleopBumpOver").checked,
      teleopTrenchUnder: $("teleopTrenchUnder").checked,
      teleopBumpTrenchNone: $("teleopBumpTrenchNone").checked,
      defenseRating: getVal("defenseRating"),
      againstDefenseRating: getVal("againstDefenseRating"),
      comments: getVal("comments"),

      teamCode: _sessionData.teamCode || "",
    };
  }

  function isDuplicatePayload(payload, queue) {
    // Check if identical payload already exists in queue
    return queue.some((item) => {
      // Compare key fields to detect duplicates
      return (
        item.studentName === payload.studentName &&
        item.matchNumber === payload.matchNumber &&
        item.teamNumber === payload.teamNumber
      );
    });
  }

  function queueKey() {
    return "scoutQueue_3211_rebuilt_2026";
  }

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(queueKey()) || "[]");
    } catch {
      return [];
    }
  }
  function setQueue(q) {
    localStorage.setItem(queueKey(), JSON.stringify(q));
    updateQueueNote();
  }
  function updateQueueNote() {
    const q = getQueue();
    if (q.length > 0) {
      $("queueAlert").style.display = "block";
      $("queueCount").textContent = q.length;
    } else {
      $("queueAlert").style.display = "none";
    }
  }
  updateQueueNote();

  async function submit() {
    // Block submissions in demo mode
    if (IS_DEMO) {
      toast("Submissions are disabled in demo mode");
      return;
    }

    // Prevent duplicate submissions from multiple clicks
    if (isSubmitting) {
      console.log("Submit already in progress, ignoring duplicate click");
      return;
    }

    // For online submission, require full validation
    const isOnline = navigator.onLine;
    if (isOnline) {
      if (!validateStart()) return;
      if (!validateAuto()) return;
      if (!validateTeleop()) return;
      if (!validateEndgame()) return;
      if (!validateMisc()) return;
    } else {
      // For offline queueing, only require minimal validation
      const name = $("studentName").value.trim();
      if (!name) {
        toast("⚠️ Enter student name to queue data");
        return;
      }

      // When offline, allow manual team number entry without autocomplete validation
      const teamSearchValue = $("teamNumber").value.trim();
      if (teamSearchValue && !state.selectedTeam) {
        // Try to parse manually entered team number
        const manualTeamNum = parseInt(teamSearchValue);
        if (!isNaN(manualTeamNum) && manualTeamNum > 0) {
          state.selectedTeam = manualTeamNum;
          console.log(
            `Offline mode: Using manually entered team number ${manualTeamNum}`,
          );
        }
      }
    }

    console.log("Starting submit...");
    isSubmitting = true;
    $("btnSubmit").disabled = true;
    $("btnSubmit").textContent = "Submitting…";

    const payload = buildPayload();
    console.log("Payload:", payload);

    try {
      await postToWebhook(payload);
      console.log("Submit successful");
      toast("✓ Submitted successfully!");
      resetEntry();
    } catch (err) {
      console.error("Submit error:", err);
      const q = getQueue();

      // Check for duplicate before adding to queue
      if (isDuplicatePayload(payload, q)) {
        toast("⚠️ Duplicate entry - already in queue");
      } else {
        q.push(payload);
        setQueue(q);
        toast("⚠️ Submit failed — saved to queue");
      }
    } finally {
      isSubmitting = false;
      $("btnSubmit").disabled = false;
      $("btnSubmit").textContent = "Submit";
    }
  }

  async function postToWebhook(payloadObj) {
    console.log("Posting to webhook");
    const body = "payload=" + encodeURIComponent(JSON.stringify(payloadObj));

    await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body,
    });

    console.log("Request sent (no-cors mode)");
    return true;
  }

  $("btnResend").addEventListener("click", resendQueued);

  async function resendQueued() {
    if (IS_DEMO) {
      toast("Submissions are disabled in demo mode");
      return;
    }
    const q = getQueue();
    if (!q.length) {
      toast("Queue is empty");
      return;
    }

    $("btnResend").disabled = true;
    $("btnResend").textContent = "Resending…";

    const remaining = [];
    let sent = 0;

    for (const item of q) {
      try {
        await postToWebhook(item);
        sent++;
      } catch {
        remaining.push(item);
      }
    }

    setQueue(remaining);
    $("btnResend").disabled = false;
    $("btnResend").textContent = "Resend All";

    if (sent) toast(`✓ Resent ${sent} submission(s)`);
    else toast("❌ No queued items sent");
  }

  renderSegments();
  showScreen(0);

  loadTeams();
})();
