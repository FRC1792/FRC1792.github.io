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
        { title: "Team Information", subtitle: "Enter scout and team details" },
        { title: "Robot Design", subtitle: "Drivetrain, motors, dimensions, and features" },
    ];

    const state = {
        screen: 0,
        selectedTeam: null,
        selectedTeamName: "",
        loadedTeams: [],
        canClimb: null,
        hopper: null,
        photoBase64: null,
        ballCapacity: 0,
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
            if (state.screen === 0 && !validateTeamInfo()) return;
            if (state.screen === 1 && !validateRobotDesign()) return;
        }

        showScreen(Math.min(SCREENS.length - 1, state.screen + 1));
    });

    $("btnReset").addEventListener("click", ()=>{
        if (!confirm("Reset this pit scouting entry?")) return;
        resetEntry();
        toast("✓ Reset complete");
    });

    function resetEntry(){
        const name = $("scoutName").value;

        $("teamSearch").value = "";
        $("teamName").value = "";
        state.selectedTeam = null;
        state.selectedTeamName = "";

        $("drivetrain").value = "";
        $("motorType").value = "";
        $("width").value = "";
        $("length").value = "";
        $("height").value = "";
        $("programmingLang").value = "";
        $("hopperLength").value = "";
        $("hopperWidth").value = "";
        $("hopperHeight").value = "";
        $("specialFeatures").value = "";

        state.canClimb = null;
        state.hopper = null;

        clearPhoto();

        $("scoutName").value = name;

        renderSegments();
        showScreen(0);
    }

    function renderSegments(){
        document.querySelectorAll("#canClimbSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.canClimb);
        });
        document.querySelectorAll("#hopperSeg .chip").forEach(ch=>{
            ch.classList.toggle("active", ch.dataset.value === state.hopper);
        });
    }

    document.querySelectorAll("#canClimbSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.canClimb = ch.dataset.value;
            renderSegments();
        });
    });
    document.querySelectorAll("#hopperSeg .chip").forEach(ch=>{
        ch.addEventListener("click", ()=>{
            state.hopper = ch.dataset.value;
            renderSegments();
            updateHopperDimensionsVisibility();
        });
    });

    function updateHopperDimensionsVisibility(){
        const hopperDimensionsContainer = $("hopperDimensionsContainer");
        if (state.hopper === "Yes") {
            hopperDimensionsContainer.style.display = "block";
        } else {
            hopperDimensionsContainer.style.display = "none";
            // Clear hopper dimensions when hidden
            $("hopperLength").value = "";
            $("hopperWidth").value = "";
            $("hopperHeight").value = "";
            // Hide ball capacity display and reset state
            $("ballCapacityDisplay").style.display = "none";
            state.ballCapacity = 0;
        }
    }

    function calculateBallCapacity() {
        const length = parseFloat($("hopperLength").value);
        const width = parseFloat($("hopperWidth").value);
        const height = parseFloat($("hopperHeight").value);

        // Only calculate if all dimensions are provided
        if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
            $("ballCapacityDisplay").style.display = "none";
            state.ballCapacity = 0;
            return;
        }

        // Calculate hopper volume (cubic inches)
        const hopperVolume = length * width * height;

        // Ball specifications
        const ballDiameter = 5.91; // inches
        const ballRadius = ballDiameter / 2; // 2.955 inches
        const ballVolume = (4 / 3) * Math.PI * Math.pow(ballRadius, 3); // ~108.19 cubic inches

        // Packing efficiency for random sphere packing (~64%)
        const packingEfficiency = 0.64;

        // Calculate estimated capacity
        const estimatedCapacity = Math.floor((hopperVolume / ballVolume) * packingEfficiency);

        // Store in state and display the result
        state.ballCapacity = estimatedCapacity;
        $("ballCapacityValue").textContent = estimatedCapacity + " balls";
        $("ballCapacityDisplay").style.display = "flex";
    }

    // Add event listeners to hopper dimension inputs
    $("hopperLength").addEventListener("input", calculateBallCapacity);
    $("hopperWidth").addEventListener("input", calculateBallCapacity);
    $("hopperHeight").addEventListener("input", calculateBallCapacity);

    // Photo capture functionality
    let cameraStream = null;

    // Detect if device is mobile or tablet (includes iPhone, iPad, Android)
    function isMobileDevice() {
        // Check for mobile user agents
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(navigator.userAgent);

        // Check for touch support (helps with tablets)
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // iOS Safari specific detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        return isMobileUA || (hasTouch && window.innerWidth < 1024) || isIOS;
    }

    $("btnTakePhoto").addEventListener("click", async () => {
        // On mobile devices (iPhone/Android), use native camera input
        // This provides the best experience with native camera app
        if (isMobileDevice()) {
            console.log("Using native mobile camera input");
            $("photoInput").click();
        } else {
            // On desktop, use webcam via getUserMedia API
            console.log("Using desktop webcam");
            await openCamera();
        }
    });

    async function openCamera() {
        try {
            const modal = $("cameraModal");
            const video = $("cameraVideo");

            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API not supported");
            }

            // Request camera access with rear camera preference
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",  // Prefer rear camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            video.srcObject = cameraStream;
            modal.style.display = "block";

            console.log("Camera opened successfully");
        } catch (err) {
            console.error("Camera access error:", err);

            // Provide specific error messages
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                toast("⚠️ Camera permission denied. Please allow camera access.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                toast("⚠️ No camera found on this device");
            } else {
                toast("⚠️ Camera unavailable. Using file picker instead.");
            }

            // Fallback to file input
            $("photoInput").click();
        }
    }

    function closeCamera() {
        const modal = $("cameraModal");
        const video = $("cameraVideo");

        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }

        video.srcObject = null;
        modal.style.display = "none";
    }

    $("closeCameraBtn").addEventListener("click", closeCamera);
    $("cancelCameraBtn").addEventListener("click", closeCamera);

    $("capturePhotoBtn").addEventListener("click", () => {
        const video = $("cameraVideo");
        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        // Convert to base64 with compression
        state.photoBase64 = canvas.toDataURL("image/jpeg", 0.85);
        showPhotoPreview();
        toast("✓ Photo captured");

        closeCamera();
    });

    $("btnChoosePhoto").addEventListener("click", () => {
        $("fileInput").click();
    });

    $("btnClearPhoto").addEventListener("click", () => {
        clearPhoto();
    });

    $("photoInput").addEventListener("change", (e) => {
        handlePhotoSelection(e.target.files[0]);
    });

    $("fileInput").addEventListener("change", (e) => {
        handlePhotoSelection(e.target.files[0]);
    });

    function handlePhotoSelection(file) {
        if (!file) return;

        console.log("Processing photo:", file.name, file.type, file.size);

        // Check file size (limit to 10MB for initial upload, will be compressed)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast("⚠️ Photo too large (max 10MB)");
            return;
        }

        // Check if it's an image file
        if (!file.type.startsWith('image/')) {
            toast("⚠️ Please select an image file");
            return;
        }

        // Handle HEIC/HEIF format (common on iPhones)
        if (file.type === 'image/heic' || file.type === 'image/heif') {
            toast("📱 iPhone photo detected - converting to JPEG...");
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Resize image if needed to reduce file size
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 1920;

                    // Calculate new dimensions while maintaining aspect ratio
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");

                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to JPEG base64 with 85% quality (good balance of quality/size)
                    state.photoBase64 = canvas.toDataURL("image/jpeg", 0.85);

                    console.log("Photo processed. Size:", Math.round(state.photoBase64.length / 1024), "KB");

                    showPhotoPreview();
                    toast("✓ Photo added");
                } catch (error) {
                    console.error("Error processing photo:", error);
                    toast("⚠️ Error processing photo. Try another image.");
                }
            };
            img.onerror = () => {
                console.error("Error loading image");
                toast("⚠️ Could not load image. Try a different format.");
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            console.error("Error reading file");
            toast("⚠️ Error reading file");
        };
        reader.readAsDataURL(file);
    }

    function showPhotoPreview() {
        if (state.photoBase64) {
            $("photoPreviewImg").src = state.photoBase64;
            $("photoPreview").style.display = "block";
            $("btnClearPhoto").style.display = "inline-flex";
        }
    }

    function clearPhoto() {
        state.photoBase64 = null;
        $("photoPreview").style.display = "none";
        $("btnClearPhoto").style.display = "none";
        $("photoInput").value = "";
        $("fileInput").value = "";
        toast("✓ Photo cleared");
    }

    function validateTeamInfo(){
        const name = $("scoutName").value.trim();

        if (!name){ toast("⚠️ Enter scout name"); return false; }
        if (!state.selectedTeam){ toast("⚠️ Select a team from the list"); return false; }

        return true;
    }

    function validateRobotDesign(){
        const drivetrain = $("drivetrain").value;
        const motorType = $("motorType").value;
        const programmingLang = $("programmingLang").value;
        const width = $("width").value.trim();
        const length = $("length").value.trim();
        const height = $("height").value.trim();
        const specialFeatures = $("specialFeatures").value.trim();

        if (!drivetrain){ toast("⚠️ Select drivetrain type"); return false; }
        if (!motorType){ toast("⚠️ Select motor type"); return false; }

        // Robot dimensions are required
        if (!width || !length || !height) {
            toast("⚠️ Enter all robot dimensions");
            return false;
        }

        if (!programmingLang){ toast("⚠️ Select programming language"); return false; }
        if (state.canClimb === null){ toast("⚠️ Select tower climb level"); return false; }
        if (state.hopper === null){ toast("⚠️ Indicate if robot has hopper"); return false; }

        // Contingency: Only validate hopper dimensions if robot has a hopper
        if (state.hopper === "Yes") {
            const hopperLength = $("hopperLength").value.trim();
            const hopperWidth = $("hopperWidth").value.trim();
            const hopperHeight = $("hopperHeight").value.trim();

            if (!hopperLength || !hopperWidth || !hopperHeight) {
                toast("⚠️ Enter all hopper dimensions");
                return false;
            }
        }

        if (!specialFeatures){ toast("⚠️ Describe special features/mechanisms"); return false; }

        // Robot photo is required
        if (!state.photoBase64) {
            toast("⚠️ Robot photo is required");
            return false;
        }

        // Submit code is required
        const submitCode = $("submitCode").value.trim();
        if (!submitCode) {
            toast("⚠️ Enter submit code to authorize submission");
            return false;
        }

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
            $("teamName").value = "";
            return;
        }

        const filtered = state.loadedTeams.filter(team => {
            return team.number.toString().includes(query) ||
                team.name.toLowerCase().includes(query);
        }).slice(0, 10);

        if (filtered.length > 0) {
            renderAutocomplete(filtered);
            autocompleteResults.classList.add("show");
            selectedIndex = -1;
        } else {
            autocompleteResults.classList.remove("show");
        }

        state.selectedTeam = null;
        $("teamName").value = "";
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
        autocompleteResults.innerHTML = teams.map((team, i) => `
        <div class="autocomplete-item" data-team="${team.number}">
            <div class="team-num">${team.number}</div>
            <div class="team-name">${team.name}</div>
        </div>
    `).join("");

        autocompleteResults.querySelectorAll(".autocomplete-item").forEach(item => {
            item.addEventListener("click", () => {
                const teamNum = item.dataset.team;
                const team = teams.find(t => t.number.toString() === teamNum);

                teamSearchInput.value = team.number;
                $("teamName").value = team.name;
                state.selectedTeam = team.number;
                state.selectedTeamName = team.name;
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
            return el ? el.value.trim() : defaultVal;
        };

        return {
            scoutingType: "PIT",
            timestampISO: new Date().toISOString(),
            scoutName: getVal("scoutName"),
            eventCode: CONFIG.EVENT_KEY,
            teamNumber: Number(state.selectedTeam || 0),
            teamName: state.selectedTeamName,

            drivetrain: getVal("drivetrain"),
            motorType: getVal("motorType"),
            width: getVal("width"),
            length: getVal("length"),
            height: getVal("height"),
            programmingLang: getVal("programmingLang"),
            canClimb: state.canClimb || "No",
            hopper: state.hopper || "No",
            hopperLength: getVal("hopperLength"),
            hopperWidth: getVal("hopperWidth"),
            hopperHeight: getVal("hopperHeight"),
            ballCapacity: state.ballCapacity || 0,
            specialFeatures: getVal("specialFeatures"),
            robotPhoto: state.photoBase64 || "",

            submitCode: getVal("submitCode")
        };
    }

    function isDuplicatePayload(payload, queue){
        // Check if identical payload already exists in queue
        return queue.some(item => {
            // Compare key fields to detect duplicates
            return item.scoutName === payload.scoutName &&
                   item.teamNumber === payload.teamNumber &&
                   item.drivetrain === payload.drivetrain &&
                   item.motorType === payload.motorType &&
                   item.width === payload.width &&
                   item.length === payload.length &&
                   item.height === payload.height &&
                   item.specialFeatures === payload.specialFeatures &&
                   item.robotPhoto === payload.robotPhoto;
        });
    }

    function queueKey(){ return "scoutQueue_1792_pit_2026"; }

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
            if (!validateTeamInfo()) return;
            if (!validateRobotDesign()) return;
        } else {
            // For offline queueing, only require scout name
            const name = $("scoutName").value.trim();
            if (!name) {
                toast("⚠️ Enter scout name to queue data");
                return;
            }

            // When offline, allow manual team number entry without autocomplete validation
            const teamSearchValue = $("teamSearch").value.trim();
            if (teamSearchValue && !state.selectedTeam) {
                // Try to parse manually entered team number
                const manualTeamNum = parseInt(teamSearchValue);
                if (!isNaN(manualTeamNum) && manualTeamNum > 0) {
                    state.selectedTeam = manualTeamNum;
                    state.selectedTeamName = `Team ${manualTeamNum}`;
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
    showScreen(0);

    loadTeams();
})();