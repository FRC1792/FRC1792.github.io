(function() {
    "use strict";

    const CONFIG = SCOUTING_CONFIG;
    const $ = (id) => document.getElementById(id);

    // --- Online status ---
    function updateOnline(){
        const online = navigator.onLine;
        $("netDot").classList.toggle("ok", online);
        $("netDot").classList.toggle("bad", !online);
        $("netText").textContent = online ? "Online" : "Offline";
    }
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();

    // --- Phase toggling ---
    function showPhase(phase) {
        $("phaseAuth").style.display = phase === "auth" ? "block" : "none";
        $("phaseSelect").style.display = phase === "select" ? "block" : "none";
        $("headerSubtitle").textContent = phase === "auth"
            ? "Select your team"
            : "Select your scouting mode";
    }

    function populateTeamOptions() {
        const select = $("secretCode");
        const options = (CONFIG.TEAM_OPTIONS && CONFIG.TEAM_OPTIONS.length)
            ? CONFIG.TEAM_OPTIONS
            : [{ value: CONFIG.SECRET_CODE, label: "Team code" }];

        select.innerHTML = '<option value="">Select a team</option>' + options.map(option =>
            `<option value="${option.value}">${option.label}</option>`
        ).join("");
    }

    function showDemoBanner(show) {
        $("demoBanner").style.display = show ? "flex" : "none";
        $("logoutWrap").style.display = show ? "none" : "block";
    }

    // --- Check existing session ---
    const session = sessionStorage.getItem("scoutSession");
    if (session) {
        const parsed = JSON.parse(session);
        showPhase("select");
        showDemoBanner(parsed.demo === true);
    } else {
        showPhase("auth");
    }

    populateTeamOptions();

    // --- Enter button ---
    $("btnEnter").addEventListener("click", attemptLogin);

    // --- Enter key on dropdown ---
    $("secretCode").addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            attemptLogin();
        }
    });

    function attemptLogin() {
        const code = $("secretCode").value.trim();
        if (!code) {
            $("codeError").textContent = "Please select a valid team.";
            $("codeError").style.display = "block";
            return;
        }

        if (code === CONFIG.SECRET_CODE || (CONFIG.TEAM_OPTIONS && CONFIG.TEAM_OPTIONS.some(option => option.value === code))) {
            sessionStorage.setItem("scoutSession", JSON.stringify({
                authenticated: true,
                teamCode: code
            }));
            $("codeError").style.display = "none";
            showPhase("select");
            showDemoBanner(false);
        } else {
            // Wrong code — shake and show error
            $("codeError").textContent = "Please select a valid team.";
            $("codeError").style.display = "block";
            const wrap = $("codeInputWrap");
            wrap.classList.remove("shake");
            void wrap.offsetWidth; // trigger reflow to restart animation
            wrap.classList.add("shake");
            $("secretCode").value = "";
            $("secretCode").focus();
        }
    }

    // --- Demo button ---
    $("btnDemo").addEventListener("click", function() {
        sessionStorage.setItem("scoutSession", JSON.stringify({ demo: true }));
        showPhase("select");
        showDemoBanner(true);
    });

    // --- Exit session ---
    function exitSession() {
        sessionStorage.removeItem("scoutSession");
        showPhase("auth");
        $("secretCode").value = "";
        $("codeError").style.display = "none";
    }
    $("btnLogout").addEventListener("click", exitSession);
    $("btnExitDemo").addEventListener("click", exitSession);
})();
