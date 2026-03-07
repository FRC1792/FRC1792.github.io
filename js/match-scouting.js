(function() {
    "use strict";

    // --- Session guard: redirect to home if no session ---
    const _session = sessionStorage.getItem("scoutSession");
    if (!_session) { window.location.replace("index.html"); return; }
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
        { title: "Start",  subtitle: "Enter match info, load teams from an event, then scout." },
        { title: "Auto",   subtitle: "Track auto fuel + auto tower." },
        { title: "Teleop", subtitle: "Track fuel scored during active/inactive hub time and shuttling." },
        { title: "Endgame",subtitle: "Pick tower level and hub shot during endgame." },
        { title: "Misc/Submit", subtitle: "Ratings, rankings, comments, then submit." },
    ];

    const state = {
        screen: 0,
        rank: null,
        selectedTeam: null,
        loadedTeams: [],
        startPos: null,
        climbPos: null,
        autoShuttling: null,
        autoTower: null,
        teleopTower: null,
        shotInHub: null,
        affectedByDefense: null,
        excessivePenalties: null,
        autoFuel: null,
        passingShoot: null,
        passIntake: null,
        shotOnMove: null,
        shotStill: null,
        shotStillPositions: [],
    };

    const $ = (id) => document.getElementById(id);
    const toastEl = $("toast");

    function toast(msg){
        toastEl.textContent = msg;
        toastEl.style.display = "block";
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(()=>toastEl.style.display="none", 2500);
    }

    function updateOnline(){
        const online = navigator.onLine;
        $("netDot").classList.toggle("ok", online);
        $("netDot").classList.toggle("bad", !online);
        $("netText").textContent = online ? "Online" : "Offline";
    }
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();

    function updateProgress(){
        document.querySelectorAll(".progress .step").forEach((step, i)=>{
            step.classList.toggle("complete", i < state.screen);
            step.classList.toggle("active", i === state.screen);
        });
    }

    function showScreen(i){
        state.screen = i;

        document.querySelectorAll(".screen").forEach(sec=>{
            sec.style.display = (Number(sec.dataset.screen) === i) ? "block" : "none";
        });

        $("screenTitle").textContent = SCREENS[i].title;
        $("screenSubtitle").textContent = SCREENS[i].subtitle;

        $("btnBack").style.display = (i === 0) ? "none" : "inline-flex";
        $("btnNext").style.display = (i === SCREENS.length - 1) ? "none" : "inline-flex";
        $("btnSubmit").style.display = (i === SCREENS.length - 1) ? "inline-flex" : "none";

        updateProgress();
    }

    $("btnBack").addEventListener("click", ()=> showScreen(Math.max(0, state.screen - 1)));
    $("btnNext").addEventListener("click", ()=>{
        if (!IS_DEMO) {
            if (state.screen === 0 && !validateStart()) return;
            if (state.screen === 1 && !validateAuto()) return;
            if (state.screen === 2 && !validateTeleop()) return;
            if (state.screen === 3 && !validateEndgame()) return;
        }

        showScreen(Math.min(SCREENS.length - 1, state.screen + 1));
    });

    $("btnReset").addEventListener("click", ()=>{
        if (!confirm("Reset this scouting entry?")) return;
        resetEntry();
        toast("✓ Reset complete");
    });

    function resetEntry(){
        const name = $("studentName").value;
        const team = $("scoutTeam").value;

        $("matchNumber").value = "";
        $("teamSearch").value = "";
        state.selectedTeam = null;
        $("alliance").value = "";
        $("defenseRating").value = "";
        $("robotStatus").value = "";

        state.autoFuel = null;
        state.passingShoot = null;
        state.passIntake = null;
        state.shotOnMove = null;
        state.shotStill = null;
        state.shotStillPositions = [];
        $("passingShootVal").textContent = "--";
        $("passIntakeVal").textContent = "--";
        $("shotOnMoveVal").textContent = "--";
        $("shotStillVal").textContent = "--";
        $("shotStillMarkers").innerHTML = "";

        state.startPos = null;
        state.climbPos = null;
        const climbWrap = $("climbSelectorWrapper");
        if (climbWrap) climbWrap.style.display = "none";
        state.autoShuttling = null;
        state.autoTower = null;
        state.teleopTower = null;
        state.shotInHub = null;
        state.affectedByDefense = null;
        state.excessivePenalties = null;

        if ($("autoEffectiveness")) $("autoEffectiveness").value = "";
        if ($("teleopActiveEffectiveness")) $("teleopActiveEffectiveness").value = "";
        if ($("teleopInactiveEffectiveness")) $("teleopInactiveEffectiveness").value = "";
        if ($("endgameEffectiveness")) $("endgameEffectiveness").value = "";
        if ($("comments")) $("comments").value = "";
        state.rank = null;

        $("studentName").value = name;
        $("scoutTeam").value = team;

        renderSegments();
        showScreen(0);
    }

    // Fuel counter display keys mapped to element IDs
    const FUEL_DISPLAY = {};

    function renderFuelCounters() {
        for (const [key, elId] of Object.entries(FUEL_DISPLAY)) {
            const el = $(elId);
            if (el) el.textContent = state[key];
        }
    }

    function adjustFuel(key, delta) {
        state[key] = Math.max(0, state[key] + delta);
        const el = $(FUEL_DISPLAY[key]);
        if (el) el.textContent = state[key];
    }

    document.querySelectorAll(".fuel-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            adjustFuel(btn.dataset.key, Number(btn.dataset.d));
        });
    });

    $("passingShootInc").addEventListener("click", () => {
        state.passingShoot = (state.passingShoot ?? 0) + 1;
        $("passingShootVal").textContent = state.passingShoot;
    });
    $("passingShootDec").addEventListener("click", () => {
        state.passingShoot = Math.max(0, (state.passingShoot ?? 0) - 1);
        $("passingShootVal").textContent = state.passingShoot;
    });
    $("passIntakeInc").addEventListener("click", () => {
        state.passIntake = (state.passIntake ?? 0) + 1;
        $("passIntakeVal").textContent = state.passIntake;
    });
    $("passIntakeDec").addEventListener("click", () => {
        state.passIntake = Math.max(0, (state.passIntake ?? 0) - 1);
        $("passIntakeVal").textContent = state.passIntake;
    });
    $("shotOnMoveInc").addEventListener("click", () => {
        state.shotOnMove = (state.shotOnMove ?? 0) + 1;
        $("shotOnMoveVal").textContent = state.shotOnMove;
    });
    $("shotOnMoveDec").addEventListener("click", () => {
        state.shotOnMove = Math.max(0, (state.shotOnMove ?? 0) - 1);
        $("shotOnMoveVal").textContent = state.shotOnMove;
    });
    function addShotStillDot(xPct, yPct) {
        state.shotStill = (state.shotStill ?? 0) + 1;
        state.shotStillPositions.push({ x: xPct, y: yPct });
        const dot = document.createElement("div");
        dot.className = "shot-dot";
        dot.style.left = xPct + "%";
        dot.style.top  = yPct + "%";
        dot.textContent = state.shotStill;
        $("shotStillMarkers").appendChild(dot);
        $("shotStillVal").textContent = state.shotStill;
    }
    $("shotStillInc").addEventListener("click", () => {
        state.shotStill = (state.shotStill ?? 0) + 1;
        $("shotStillVal").textContent = state.shotStill;
    });
    $("shotStillDec").addEventListener("click", () => {
        if ((state.shotStill ?? 0) === 0) return;
        state.shotStill = state.shotStill - 1;
        if (state.shotStillPositions.length > 0) {
            state.shotStillPositions.pop();
            const markers = $("shotStillMarkers");
            if (markers.lastChild) markers.removeChild(markers.lastChild);
        }
        $("shotStillVal").textContent = state.shotStill === 0 ? 0 : state.shotStill;
    });
    $("shotStillMap").addEventListener("click", (e) => {
        const rect = $("shotStillMap").getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
        const yPct = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
        addShotStillDot(xPct, yPct);
    });

    function renderSegments(){
        document.querySelectorAll("#fieldSelector .field-position").forEach(pos=>{
            pos.classList.toggle("active", pos.dataset.value === state.startPos);
        });
        document.querySelectorAll("#climbSelector .tower-zone").forEach(pos=>{
            pos.classList.toggle("active", pos.dataset.value === state.climbPos);
        });
        document.querySelectorAll("#autoFuelSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.autoFuel);
        });
        document.querySelectorAll("#autoShuttlingSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.autoShuttling);
        });
        document.querySelectorAll("#autoTowerSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.autoTower);
        });
        document.querySelectorAll("#teleopTowerSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.teleopTower);
        });
        document.querySelectorAll("#shotInHubSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.shotInHub);
        });
        document.querySelectorAll("#affectedByDefenseSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.affectedByDefense);
        });
        document.querySelectorAll("#excessivePenaltiesSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.excessivePenalties);
        });
        document.querySelectorAll("#rankSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.rank);
        });
    }

    document.querySelectorAll("#fieldSelector .field-position").forEach(pos=>{
        pos.addEventListener("click", ()=>{
            state.startPos = pos.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#climbSelector .tower-zone").forEach(pos=>{
        pos.addEventListener("click", ()=>{
            state.climbPos = pos.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#autoFuelSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.autoFuel = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#autoShuttlingSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.autoShuttling = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#autoTowerSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.autoTower = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#teleopTowerSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.teleopTower = ch.dataset.value;
            const climbWrap = $("climbSelectorWrapper");
            if (climbWrap) {
                const hasClimb = ch.dataset.value !== "NONE";
                climbWrap.style.display = hasClimb ? "block" : "none";
                if (!hasClimb) state.climbPos = null;
            }
            renderSegments();
        });
    });
    document.querySelectorAll("#shotInHubSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.shotInHub = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#affectedByDefenseSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.affectedByDefense = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#excessivePenaltiesSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.excessivePenalties = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#rankSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.rank = ch.dataset.value;
            renderSegments();
        });
    });

    function towerPointsAuto(level){
        if (level === "L1") return 15;
        return 0;
    }
    function towerPointsTeleop(level){
        if (level === "L1") return 10;
        if (level === "L2") return 20;
        if (level === "L3") return 30;
        return 0;
    }

    function validateStart(){
        const name = $("studentName").value.trim();
        const scoutTeam = $("scoutTeam").value;
        const match = Number($("matchNumber").value);
        const alliance = $("alliance").value;

        if (!name){ toast("⚠️ Enter student name"); return false; }
        if (!scoutTeam){ toast("⚠️ Select your team (1792 or 1259)"); return false; }
        if (!match || match < 1){ toast("⚠️ Enter match number"); return false; }
        if (!alliance){ toast("⚠️ Select alliance color"); return false; }
        if (!state.selectedTeam){ toast("⚠️ Select a team from the list"); return false; }

        return true;
    }

    function validateAuto(){
        if (state.startPos === null){ toast("⚠️ Select where robot starts"); return false; }
        if (state.autoFuel === null){ toast("⚠️ Select if auto fuel was scored"); return false; }
        if (state.autoShuttling === null){ toast("⚠️ Select shuttling during auto"); return false; }
        if (state.autoTower === null){ toast("⚠️ Select auto tower level"); return false; }
        return true;
    }

    function validateTeleop(){
        if (state.passingShoot === null){ toast("⚠️ Enter passing shoot count"); return false; }
        if (state.passIntake === null){ toast("⚠️ Enter pass (push/intake) count"); return false; }
        if (state.shotOnMove === null){ toast("⚠️ Enter shot on move count"); return false; }
        if (state.shotStill === null){ toast("⚠️ Enter shot still count"); return false; }
        return true;
    }

    function validateEndgame(){
        if (state.teleopTower === null){ toast("⚠️ Select endgame tower level"); return false; }
        if (state.shotInHub === null){ toast("⚠️ Select shot in hub"); return false; }
        return true;
    }

    function validateMisc(){
        const defense = $("defenseRating").value;
        const status = $("robotStatus").value;
        const submitCode = $("submitCode").value.trim();

        if (state.affectedByDefense === null){ toast("⚠️ Select if team was affected by defense"); return false; }
        if (!status){ toast("⚠️ Select robot status"); return false; }
        if (!defense){ toast("⚠️ Select defense rating"); return false; }
        if (state.rank === null){ toast("⚠️ Rank this robot"); return false; }
        if (!submitCode){ toast("⚠️ Enter submit code to authorize submission"); return false; }
        return true;
    }

    function teamsCacheKey(){ return `teamsCache_${CONFIG.EVENT_KEY}`; }

    function loadCachedTeams(){
        try{
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
        }catch(err){
            console.error("Error loading cached teams:", err);
        }
        return false;
    }

    function saveCachedTeams(teams){
        try{
            localStorage.setItem(teamsCacheKey(), JSON.stringify(teams));
            console.log("✓ Teams cached for offline use");
        }catch(err){
            console.error("Error caching teams:", err);
        }
    }

    async function loadTeams(){
        if (!CONFIG.ENABLE_TEAM_LOADING) {
            console.log("Team loading disabled");
            return;
        }

        // First, try to load from cache
        const hadCached = loadCachedTeams();

        // Then try to fetch fresh data from API
        try{
            console.log("Fetching fresh teams from:", CONFIG.EVENT_KEY);

            const res = await fetch(TBA_TEAMS_AT_EVENT(CONFIG.EVENT_KEY), {
                method: "GET",
                headers: { 'X-TBA-Auth-Key': CONFIG.TBA_API_KEY }
            });

            console.log("TBA Response status:", res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error("TBA Error:", errorText);
                throw new Error(`HTTP ${res.status}`);
            }

            const arr = await res.json();
            console.log("Teams received:", arr.length);

            state.loadedTeams = arr.map(t => ({
                number: t.team_number,
                name: t.nickname || t.name || `Team ${t.team_number}`
            })).sort((a,b)=>a.number-b.number);

            // Save to cache for offline use
            saveCachedTeams(state.loadedTeams);

            console.log(`✓ Loaded ${state.loadedTeams.length} teams from API`);
            if (!hadCached) {
                toast(`✓ Loaded ${state.loadedTeams.length} teams`);
            }
        }catch(err){
            console.error("Failed to load teams from API:", err);

            // If we have cached teams, we're OK
            if (hadCached) {
                toast("⚠️ Using cached teams (offline)");
            } else {
                toast("⚠️ Couldn't load teams - you can still enter team numbers");
            }
        }
    }

    const teamSearchInput = $("teamSearch");
    const autocompleteResults = $("autocompleteResults");
    let selectedIndex = -1;

    teamSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (!query) {
            autocompleteResults.classList.remove("show");
            state.selectedTeam = null;
            return;
        }

        const filtered = state.loadedTeams.filter(team => {
            return team.number.toString().includes(query) ||
                team.name.toLowerCase().includes(query);
        }).slice(0, 15);

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
        autocompleteResults.innerHTML = teams.map((team) => `
        <div class="autocomplete-item" data-team="${team.number}">
            <div class="team-num">${team.number}</div>
            <div class="team-name">${team.name}</div>
        </div>
    `).join("");

        autocompleteResults.querySelectorAll(".autocomplete-item").forEach(item => {
            item.addEventListener("click", () => {
                const teamNum = item.dataset.team;
                const team = teams.find(t => t.number.toString() === teamNum);

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

    function buildPayload(){
        const getVal = (id, defaultVal = "") => {
            const el = document.getElementById(id);
            return el ? el.value : defaultVal;
        };


        return {
            timestampISO: new Date().toISOString(),
            studentName: getVal("studentName").trim(),
            scoutTeam: getVal("scoutTeam"),
            eventCode: CONFIG.EVENT_KEY,
            matchNumber: Number(getVal("matchNumber", "0")),
            teamNumber: Number(state.selectedTeam || 0),
            alliance: getVal("alliance"),

            startPos: state.startPos || "",
            autoFuel: state.autoFuel,
            autoTower: state.autoTower || "NONE",
            autoTowerPoints: towerPointsAuto(state.autoTower),

            passingShoot: state.passingShoot,
            passIntake: state.passIntake,
            shotOnMove: state.shotOnMove,
            shotStill: state.shotStill,
            shotStillPositions: state.shotStillPositions,
            autoShuttling: state.autoShuttling || "",

            teleopTower: state.teleopTower || "NONE",
            teleopTowerPoints: towerPointsTeleop(state.teleopTower),
            climbPos: state.climbPos || "",
            shotInHub: state.shotInHub || "",
            affectedByDefense: state.affectedByDefense || "",
            autoEffectiveness: getVal("autoEffectiveness"),
            teleopActiveEffectiveness: getVal("teleopActiveEffectiveness"),
            teleopInactiveEffectiveness: getVal("teleopInactiveEffectiveness"),
            endgameEffectiveness: getVal("endgameEffectiveness"),
            robotStatus: getVal("robotStatus"),
            defenseRating: getVal("defenseRating"),
            rank: state.rank || "",
            comments: getVal("comments"),

            submitCode: getVal("submitCode")
        };
    }

    function isDuplicatePayload(payload, queue){
        // Check if identical payload already exists in queue
        return queue.some(item => {
            // Compare key fields to detect duplicates
            return item.studentName === payload.studentName &&
                   item.matchNumber === payload.matchNumber &&
                   item.teamNumber === payload.teamNumber &&
                   item.alliance === payload.alliance &&
                   item.autoFuelRange === payload.autoFuelRange &&
                   item.teleopFuelActiveRange === payload.teleopFuelActiveRange &&
                   item.robotStatus === payload.robotStatus;
        });
    }

    function queueKey(){ return "scoutQueue_1792_rebuilt_2026"; }

    function getQueue(){
        try{
            return JSON.parse(localStorage.getItem(queueKey()) || "[]");
        }catch{
            return [];
        }
    }
    function setQueue(q){
        localStorage.setItem(queueKey(), JSON.stringify(q));
        updateQueueNote();
    }
    function updateQueueNote(){
        const q = getQueue();
        if (q.length > 0) {
            $("queueAlert").style.display = "block";
            $("queueCount").textContent = q.length;
        } else {
            $("queueAlert").style.display = "none";
        }
    }
    updateQueueNote();

    async function submit(){
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
            const scoutTeam = $("scoutTeam").value;
            if (!name) {
                toast("⚠️ Enter student name to queue data");
                return;
            }
            if (!scoutTeam) {
                toast("⚠️ Select your team to queue data");
                return;
            }

            // When offline, allow manual team number entry without autocomplete validation
            const teamSearchValue = $("teamSearch").value.trim();
            if (teamSearchValue && !state.selectedTeam) {
                // Try to parse manually entered team number
                const manualTeamNum = parseInt(teamSearchValue);
                if (!isNaN(manualTeamNum) && manualTeamNum > 0) {
                    state.selectedTeam = manualTeamNum;
                    console.log(`Offline mode: Using manually entered team number ${manualTeamNum}`);
                }
            }
        }

        console.log("Starting submit...");
        isSubmitting = true;
        $("btnSubmit").disabled = true;
        $("btnSubmit").textContent = "Submitting…";

        const payload = buildPayload();
        console.log("Payload:", payload);

        try{
            await postToWebhook(payload);
            console.log("Submit successful");
            toast("✓ Submitted successfully!");
            resetEntry();
        }catch(err){
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
        }finally{
            isSubmitting = false;
            $("btnSubmit").disabled = false;
            $("btnSubmit").textContent = "Submit";
        }
    }

    async function postToWebhook(payloadObj){
        console.log("Posting to webhook");
        const body = "payload=" + encodeURIComponent(JSON.stringify(payloadObj));

        await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: body
        });

        console.log("Request sent (no-cors mode)");
        return true;
    }

    $("btnResend").addEventListener("click", resendQueued);

    async function resendQueued(){
        if (IS_DEMO) { toast("Submissions are disabled in demo mode"); return; }
        const q = getQueue();
        if (!q.length){ toast("Queue is empty"); return; }

        $("btnResend").disabled = true;
        $("btnResend").textContent = "Resending…";

        const remaining = [];
        let sent = 0;

        for (const item of q){
            try{
                await postToWebhook(item);
                sent++;
            }catch{
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
    renderFuelCounters();
    showScreen(0);

    loadTeams();
})();