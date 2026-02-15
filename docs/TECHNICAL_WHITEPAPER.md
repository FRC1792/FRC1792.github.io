# FRC 1792 Scouting System - Technical Whitepaper

**Last Updated:** February 15, 2026

---

## Overview

A web-based scouting application for FIRST Robotics Competition teams. Built with vanilla JavaScript (no frameworks), it collects robot performance data at competitions and stores it in Google Sheets for analysis.

### Two Scouting Modes

1. **Match Scouting** — Track robot actions during matches (5-screen form)
2. **Pit Scouting** — Document robot specifications and photos (2-screen form)

### Key Design Goals

- **Zero setup for scouts** — Just open the website, enter code, and start scouting
- **Works offline** — Data queues and uploads when connection returns
- **Secure submissions** — Server-side validation prevents unauthorized data
- **Open alliance friendly** — Demo mode lets other teams explore the full app
- **Framework-free** — Pure HTML/CSS/JavaScript for simplicity and performance

---

## System Architecture

```
┌─────────────────────┐
│  Scouts (Phones)    │
│  HTML/CSS/JS App    │
└──────────┬──────────┘
           │
           │ HTTPS POST (JSON)
           ▼
┌─────────────────────┐
│ Google Apps Script  │◄─── Validates team code
│  (Web App Backend)  │
└──────────┬──────────┘
           │
           ├──► Google Sheets (Match Data)
           ├──► Google Sheets (Pit Data)
           └──► Google Drive (Photos)

┌─────────────────────┐
│ The Blue Alliance   │◄─── Loads team lists
│        API          │
└─────────────────────┘
```

### Data Flow

1. Scout opens website → enters secret code → session stored in `sessionStorage`
2. Scout fills out form → data validated client-side
3. Submit clicked → JSON payload sent to Google Apps Script
4. Apps Script validates team code → writes to Google Sheet
5. If offline → data queued in `localStorage` → resent when online

---

## File Structure

```
FRC1792.github.io/
├── index.html                      # Home page (auth + mode selection)
├── match-scouting.html             # Match scouting form (5 screens)
├── pit-scouting.html               # Pit scouting form (2 screens)
│
├── css/
│   └── styles.css                  # All CSS (Team 1792 branded)
│
├── js/
│   ├── config.template.js          # Template - copy to config.js
│   ├── config.js                   # Your settings (gitignored, not in repo)
│   ├── home.js                     # Auth logic + session management
│   ├── match-scouting.js           # Match form logic + validation
│   └── pit-scouting.js             # Pit form logic + photo handling
│
├── appScript/
│   └── combined-scouting-script.js # Google Apps Script backend
│
├── images/
│   ├── logo.svg                    # Team logo
│   ├── favicon.ico                 # Browser icon
│   ├── field.svg                   # Starting position selector
│   └── tower.svg                   # Endgame climb position selector
│
└── docs/
    ├── QUICK_START_GUIDE.md        # Setup instructions
    └── TECHNICAL_WHITEPAPER.md     # This file
```

---

## Authentication & Session Management

### Design Philosophy

Keep the website **publicly accessible** for open alliance while preventing **unauthorized data submissions**.

### Three-Layer Security Model

| Layer | Location | Purpose |
|-------|----------|---------|
| **Client-side code entry** | `js/home.js` | Casual access prevention |
| **Session expiration** | `sessionStorage` | Clears access when tab closes |
| **Server-side validation** | Apps Script | Real security — validates every submission |

### How It Works

#### 1. Home Page (index.html + home.js)

User sees two options:
- **Enter team code** — Authenticated scouting
- **Demo Mode** — Explore without submitting

**Code entry flow:**
```javascript
// User enters code
if (code === CONFIG.SECRET_CODE) {
    // Store authenticated session
    sessionStorage.setItem("scoutSession", JSON.stringify({
        authenticated: true,
        teamCode: code
    }));
    // Show mode selection screen
}
```

**Demo mode flow:**
```javascript
// User clicks "Demo Mode"
sessionStorage.setItem("scoutSession", JSON.stringify({
    demo: true
}));
// Show mode selection screen with demo banner
```

#### 2. Scouting Pages (match/pit scouting)

**Session guard** (runs immediately on page load):
```javascript
const _session = sessionStorage.getItem("scoutSession");
if (!_session) {
    window.location.replace("index.html"); // Redirect to home
    return;
}
const _sessionData = JSON.parse(_session);
const IS_DEMO = _sessionData.demo === true;
```

**Demo mode behavior:**
- Shows amber banner: "Demo Mode — submissions and input validation are disabled"
- Skips all input validation (users can click through freely)
- Blocks all submissions with toast: "Submissions are disabled in demo mode"
- Perfect for open alliance — other teams can explore your full scouting setup

**Authenticated mode:**
- Enforces input validation
- Includes `teamCode` in every submission payload
- Submissions sent to Google Apps Script

#### 3. Server-Side Validation (Apps Script)

```javascript
const ALLOWED_CODES = ["atlas", "ally1259", "ally5414"];

function doPost(e) {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);

    // Validate team code
    const teamCode = data.teamCode || "";
    if (!teamCode || ALLOWED_CODES.indexOf(teamCode) === -1) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "Invalid team code"
        }));
    }

    // Code is valid — write to sheet
    writeToSheet(data);
}
```

### Session Lifecycle

- **Created:** When user enters valid code or clicks Demo Mode
- **Stored in:** `sessionStorage` (not `localStorage`)
- **Persists:** Across page navigations within same browser tab
- **Expires:** When browser tab closes (not browser-wide)
- **Why sessionStorage?** Forces scouts to re-authenticate if they close the tab, reducing risk of unauthorized access on shared devices

---

## Configuration System

### Configuration File Setup

**Important:** The actual config file (`js/config.js`) is gitignored to protect your credentials.

**Setup process:**
1. Copy `js/config.template.js` to `js/config.js`
2. Edit `js/config.js` with your actual values
3. Never commit `js/config.js` to git (it's in `.gitignore`)

**`js/config.js`** — Your private config file (not in git):

```javascript
const SCOUTING_CONFIG = {
    // Google Apps Script deployment URL
    WEBHOOK_URL: "https://script.google.com/macros/s/.../exec",

    // The Blue Alliance API key
    TBA_API_KEY: "your-key-here",

    // Event code (last part of TBA event URL)
    EVENT_KEY: "2026wiapp",

    // Enable/disable team loading from TBA
    ENABLE_TEAM_LOADING: true,

    // Client-side secret code
    SECRET_CODE: "atlas"
};
```

Both `match-scouting.js` and `pit-scouting.js` import this configuration automatically.

**⚠️ Important:** The `EVENT_KEY` is hardcoded in the config file. You **must** update it before each competition to match your current event. The app will load teams from whatever event code you specify.

### Server-Side Configuration

**`appScript/combined-scouting-script.js`** — Update allowed codes:

```javascript
const ALLOWED_CODES = ["atlas"];
```

**Important:** After editing, you must **redeploy** the Apps Script:
1. Apps Script editor → Deploy → New deployment
2. This creates a new version with updated allowed codes

---

## Match Scouting Deep Dive

### Form Structure

**5 screens with progress tracking:**

1. **Start** — Scout name, team number, match number, alliance, team search
2. **Auto** — Starting position, fuel collection, tower climbing, trench/bump navigation
3. **Teleop** — Fuel scored during active/inactive hub time, shuttling behavior
4. **Endgame** — Tower climb level, hub shots, final position
5. **Misc/Submit** — Defense rating, rankings, comments, submit button

### State Management

Single `state` object tracks all form data:

```javascript
const state = {
    screen: 0,              // Current screen index
    selectedTeam: null,     // Selected team object
    loadedTeams: [],        // Teams from TBA API
    startPos: null,         // Starting position on field
    climbPos: null,         // Endgame climb position
    autoTower: null,        // Auto tower climb level
    teleopTower: null,      // Teleop tower climb level
    // ... etc
};
```

### Validation System

Each screen has a validation function that runs when "Next" is clicked:

```javascript
function validateStart() {
    if (!$("studentName").value.trim()) {
        toast("⚠️ Enter your name");
        return false;
    }
    if (!$("matchNumber").value) {
        toast("⚠️ Enter match number");
        return false;
    }
    if (!state.selectedTeam) {
        toast("⚠️ Select a team");
        return false;
    }
    return true;
}
```

**Demo mode bypass:**
```javascript
if (!IS_DEMO) {
    if (state.screen === 0 && !validateStart()) return;
    if (state.screen === 1 && !validateAuto()) return;
    // ...
}
// If demo mode, skip all validation
```

### Data Submission

**Payload construction:**
```javascript
function buildPayload() {
    return {
        scoutingType: "MATCH",
        teamCode: _sessionData.teamCode,
        timestamp: new Date().toISOString(),
        event: CONFIG.EVENT_KEY,
        scoutName: $("studentName").value,
        scoutTeam: $("scoutTeam").value,
        matchNumber: $("matchNumber").value,
        teamNumber: state.selectedTeam.team_number,
        alliance: $("alliance").value,
        autoFuel: $("autoFuel").value || 0,
        // ... all other fields
    };
}
```

**Submit flow:**
```javascript
async function submitData() {
    const payload = buildPayload();

    try {
        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: JSON.stringify(payload) })
        });

        const result = await response.json();

        if (result.status === "success") {
            toast("✓ Submitted successfully");
            cacheSubmission(payload); // Prevent duplicates
        }
    } catch (error) {
        // Network error — queue for later
        queueSubmission(payload);
        toast("⚠️ Queued (offline)");
    }
}
```

---

## Pit Scouting Deep Dive

### Form Structure

**2 screens:**

1. **Team Info** — Scout name, team number, team name (auto-filled)
2. **Robot Design** — Drivetrain, motors, dimensions, programming, climb ability, hopper, features, photo

### Photo Handling

**Client-side (pit-scouting.js):**

1. **Camera trigger:**
   - Mobile: Opens native camera via `<input type="file" accept="image/*" capture="environment">`
   - Desktop: Opens webcam via `getUserMedia()` API
   - Fallback: File picker

2. **Image processing:**
```javascript
function resizeImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG at 85% quality
                const base64 = canvas.toDataURL("image/jpeg", 0.85);
                resolve(base64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
```

3. **Payload includes base64 image:**
```javascript
{
    scoutingType: "PIT",
    robotPhoto: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Server-side (Apps Script):**

1. **Parse base64 and upload to Drive:**
```javascript
function uploadPhotoToDrive(base64String, teamNumber) {
    // Remove data URI prefix
    const base64Data = base64String.split(",")[1];

    // Decode base64
    const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        "image/jpeg",
        `Robot_${teamNumber}_${Date.now()}.jpg`
    );

    // Get or create folder
    const folder = getOrCreateFolder("FRC 1792 Robot Photos");

    // Upload file
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
}
```

2. **Insert into sheet with IMAGE formula:**
```javascript
sheet.getRange(nextRow, photoColumn).setFormula(`=IMAGE("${photoUrl}")`);
```

---

## Offline Support & Queue System

### Detection

```javascript
function updateOnline() {
    const online = navigator.onLine;
    $("netDot").classList.toggle("ok", online);
    $("netDot").classList.toggle("bad", !online);
    $("netText").textContent = online ? "Online" : "Offline";
}

window.addEventListener("online", updateOnline);
window.addEventListener("offline", updateOnline);
```

### Queue Management

**localStorage keys:**
- `scoutQueue_1792_rebuilt_2026` — Match scouting queue
- `scoutQueue_1792_pit_2026` — Pit scouting queue
- `submittedCache_1792_rebuilt_2026` — Duplicate prevention cache

**Queue operations:**

```javascript
// Add to queue
function queueSubmission(payload) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    queue.push(payload);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    updateQueueAlert();
}

// Resend all queued items
async function resendAll() {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
        try {
            const response = await fetch(CONFIG.WEBHOOK_URL, {
                method: "POST",
                body: JSON.stringify({ payload: JSON.stringify(queue[i]) })
            });

            if (response.ok) {
                successCount++;
                cacheSubmission(queue[i]); // Mark as submitted
            }
        } catch (error) {
            break; // Still offline
        }
    }

    // Remove successful submissions from queue
    queue.splice(0, successCount);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    updateQueueAlert();
}
```

### Duplicate Prevention

```javascript
function cacheSubmission(payload) {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    const signature = `${payload.matchNumber}_${payload.teamNumber}`;

    if (cache.indexOf(signature) === -1) {
        cache.push(signature);
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
}

function isDuplicate(payload) {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    const signature = `${payload.matchNumber}_${payload.teamNumber}`;
    return cache.indexOf(signature) !== -1;
}
```

---

## Team Loading from The Blue Alliance

### API Integration

```javascript
const TBA_TEAMS_AT_EVENT = (eventKey) =>
    `https://www.thebluealliance.com/api/v3/event/${eventKey}/teams/simple`;

async function loadTeams() {
    // Check cache first
    const cached = localStorage.getItem(`teamsCache_${CONFIG.EVENT_KEY}`);
    if (cached) {
        const parsed = JSON.parse(cached);
        state.loadedTeams = parsed;
        setupAutocomplete();
    }

    // Fetch fresh data
    try {
        const response = await fetch(TBA_TEAMS_AT_EVENT(CONFIG.EVENT_KEY), {
            headers: { "X-TBA-Auth-Key": CONFIG.TBA_API_KEY }
        });

        const teams = await response.json();
        state.loadedTeams = teams;

        // Update cache
        localStorage.setItem(
            `teamsCache_${CONFIG.EVENT_KEY}`,
            JSON.stringify(teams)
        );

        setupAutocomplete();
    } catch (error) {
        // Use cached data if fetch fails
        if (!cached) {
            toast("⚠️ Could not load teams");
        }
    }
}
```

### Autocomplete Search

```javascript
function setupAutocomplete() {
    const input = $("teamSearch");
    const results = $("autocompleteResults");

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();

        if (query.length === 0) {
            results.style.display = "none";
            return;
        }

        // Filter teams by number or name
        const matches = state.loadedTeams.filter(team =>
            team.team_number.toString().includes(query) ||
            team.nickname.toLowerCase().includes(query)
        );

        // Limit to top 8 results
        const top = matches.slice(0, 8);

        // Render results
        results.innerHTML = top.map(team => `
            <div class="autocomplete-item" data-team='${JSON.stringify(team)}'>
                <strong>${team.team_number}</strong> — ${team.nickname}
            </div>
        `).join("");

        results.style.display = "block";
    });

    // Click handler
    results.addEventListener("click", (e) => {
        const item = e.target.closest(".autocomplete-item");
        if (item) {
            const team = JSON.parse(item.dataset.team);
            state.selectedTeam = team;
            input.value = `${team.team_number} — ${team.nickname}`;
            results.style.display = "none";
        }
    });
}
```

---

## Google Apps Script Backend

### Combined Handler

Single script handles both match and pit scouting:

```javascript
function doPost(e) {
    const data = JSON.parse(e.postData.contents);

    // Validate team code
    if (ALLOWED_CODES.indexOf(data.teamCode) === -1) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "Invalid team code"
        }));
    }

    // Route by scouting type
    if (data.scoutingType === "MATCH") {
        writeToSheetMatch(data);
    } else if (data.scoutingType === "PIT") {
        writeToSheetPit(data);
    }

    return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data saved"
    }));
}
```

### Sheet Writing

**Match data (39 columns):**
```javascript
function writeToSheetMatch(data) {
    const sheet = getOrCreateSheet(MATCH_SHEET_NAME, [
        "Timestamp", "Scout Name", "Scout Team", "Event", "Match #",
        "Team #", "Alliance", "Auto Fuel", "Auto Tower", // ... etc
    ]);

    sheet.appendRow([
        new Date(),
        data.scoutName,
        data.scoutTeam,
        data.event,
        data.matchNumber,
        data.teamNumber,
        data.alliance,
        data.autoFuel,
        data.autoTower,
        // ... all 39 columns
    ]);
}
```

**Pit data (18 columns + photo):**
```javascript
function writeToSheetPit(data) {
    const sheet = getOrCreateSheet(PIT_SHEET_NAME, [
        "Timestamp", "Scout Name", "Team #", "Team Name",
        "Drivetrain", "Motors", "Robot Photo", // ... etc
    ]);

    let photoUrl = "";
    if (data.robotPhoto) {
        photoUrl = uploadPhotoToDrive(data.robotPhoto, data.teamNumber);
    }

    const row = sheet.getLastRow() + 1;

    sheet.getRange(row, 1, 1, 18).setValues([[
        new Date(),
        data.scoutName,
        data.teamNumber,
        data.teamName,
        data.drivetrain,
        data.motors,
        "", // Photo column (formula added next)
        // ... rest of data
    ]]);

    // Add IMAGE formula for photo
    if (photoUrl) {
        sheet.getRange(row, 7).setFormula(`=IMAGE("${photoUrl}")`);
    }
}
```

---

## Styling System

### CSS Custom Properties

All colors defined as CSS variables for easy theming:

```css
:root {
    --bg: #1a1a1a;              /* Dark background */
    --bg2: #2a2a2a;             /* Slightly lighter */
    --fg: #ffffff;              /* White text */
    --muted: #a0a0a0;           /* Gray text */
    --border: #404040;          /* Border color */

    --accent: #0039a2;          /* Team blue */
    --accent-light: #89cff0;    /* Light blue */
    --accent-hover: #002d7a;    /* Darker blue */

    --ok: #21c55d;              /* Green (success) */
    --warning: #f59e0b;         /* Amber (warnings) */
    --danger: #ff3b3b;          /* Red (errors) */

    --font-header: 'Oswald', sans-serif;
    --font-body: 'Calibri', sans-serif;
}
```

### Responsive Design

```css
/* Mobile-first approach */
.grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 16px;
}

.col-12 { grid-column: span 12; }
.col-6 { grid-column: span 6; }
.col-3 { grid-column: span 3; }

@media (max-width: 600px) {
    .col-6, .col-3 {
        grid-column: span 12; /* Full width on mobile */
    }
}
```

---

## Common Modifications

### Add a New Form Field

1. **Add HTML input** in the `.html` file
2. **Add to state object** (if needed)
3. **Add validation** in the validation function
4. **Add to payload** in `buildPayload()`
5. **Update Apps Script** column headers and row data
6. **(Optional) Delete sheet tab** to let script recreate with new headers

### Change Event/Season

**⚠️ Critical: The event code is hardcoded and must be updated before each competition!**

1. Edit `js/config.js`:
   - **Update `EVENT_KEY`** to your new event (e.g., `"2026wiapp"` → `"2026wimi"`)
   - Update `SECRET_CODE` (optional, if you want a new code)
2. Edit `appScript/combined-scouting-script.js`:
   - Update `ALLOWED_CODES` (if allied teams changed)
   - **Redeploy the Apps Script** if you changed allowed codes
3. Clear localStorage cache on scout devices (or wait for fresh TBA data to load)
4. Test team loading with the new event code before the competition starts

### Add Allied Team Codes

1. Edit `appScript/combined-scouting-script.js`:
```javascript
const ALLOWED_CODES = ["atlas", "code1259", "code5414"];
```
2. **Redeploy** the Apps Script (Deploy → New deployment)
3. Share the codes with allied teams

---

## Security Considerations

### What's Public

- Website source code (visible in browser, on GitHub)
- Config template (`js/config.template.js` with placeholder values)
- Event code format (public information)

### What's Protected

- **Config file** (`js/config.js` is gitignored - never committed)
- **Webhook URL** (only in your local config file, not on GitHub)
- **TBA API key** (only in your local config file, not on GitHub)
- **Secret code** (only in your local config file and shared with authorized scouts)
- **Server validation** (Apps Script rejects invalid team codes)
- **Google Sheet** (not publicly writable)

### Why This Works

Even if someone:
- Inspects the source code
- Finds the webhook URL
- Crafts a custom POST request

They still can't submit data without a valid team code in `ALLOWED_CODES`.

---

## Performance & Optimization

### Lazy Loading

Teams load asynchronously in background:
```javascript
// Show form immediately, load teams in background
window.addEventListener("DOMContentLoaded", loadTeams);
```

### Caching Strategy

- **Teams:** Cached in localStorage, refreshed on each page load
- **Sessions:** Stored in sessionStorage (expires on tab close)
- **Submissions:** Cached to prevent duplicates

### Image Optimization

- Max dimensions: 1920×1080
- Format: JPEG
- Quality: 85%
- Result: Typical photos compress from 5MB → 200KB

---

## Troubleshooting Guide

### Teams Don't Load

**Symptoms:** Autocomplete is empty or shows no results

**Causes:**
1. Invalid TBA API key
2. Invalid event code
3. Event doesn't exist or has no teams yet
4. Network issue

**Debug:**
1. Open browser console (F12)
2. Look for TBA API errors
3. Check `js/config.js` for correct `EVENT_KEY` and `TBA_API_KEY`
4. Manually visit `https://thebluealliance.com/event/[YOUR_EVENT_KEY]` to verify event exists

### Submit Fails

**Symptoms:** Form submits but shows error toast

**Causes:**
1. Invalid team code
2. Apps Script not deployed correctly
3. Webhook URL incorrect
4. Network issue

**Debug:**
1. Check browser console for errors
2. Verify `WEBHOOK_URL` ends with `/exec`
3. Check Apps Script → Executions tab for backend errors
4. Verify team code is in `ALLOWED_CODES` and Apps Script is redeployed

### Session Expired / Redirect Loop

**Symptoms:** Keeps redirecting to home page

**Causes:**
1. Tab was closed (sessionStorage cleared)
2. JavaScript error preventing session creation

**Debug:**
1. Open browser console
2. Check for errors
3. Verify `sessionStorage.getItem("scoutSession")` returns data
4. Re-enter code to create new session

### Photo Upload Fails

**Symptoms:** Pit scouting submits but photo doesn't appear

**Causes:**
1. Apps Script doesn't have Drive permissions
2. Image too large (>10MB)
3. Base64 encoding failed

**Debug:**
1. Check Apps Script → Executions tab
2. Look for Drive API errors
3. Grant Drive permissions to Apps Script
4. Try smaller photo

---

## Event Day Checklist

**Before the event:**
- [ ] **Update `EVENT_KEY` in `js/config.js`** (CRITICAL - this is hardcoded!)
  - Find your event on thebluealliance.com
  - Use the event code from the URL (e.g., `2026wiapp`)
- [ ] Update `SECRET_CODE` in `js/config.js` (if needed)
- [ ] Update `ALLOWED_CODES` in Apps Script (if needed)
- [ ] **Redeploy Apps Script** if you changed allowed codes
- [ ] Test team loading — verify teams from the correct event appear
- [ ] Test submission from phone with real event data
- [ ] Test demo mode
- [ ] Verify data appears in Google Sheet
- [ ] Bookmark site on all scout devices
- [ ] Share secret code with scouts (private message/document)

**During the event:**
- [ ] Check queued submissions every few matches
- [ ] Monitor Google Sheet for incoming data
- [ ] Clear localStorage cache if teams don't load
- [ ] Download backup of sheet after each day

**After the event:**
- [ ] Download final sheet backup
- [ ] Export to CSV for analysis
- [ ] Clear old event data from sheet (or create new sheet for next event)

---

## Advanced Customization

### Change Team Colors

Edit `css/styles.css`:
```css
:root {
    --accent: #ff6600;        /* Your team color */
    --accent-light: #ffaa66;  /* Lighter version */
    --accent-hover: #cc5200;  /* Darker version */
}
```

### Add Custom Analytics

Edit Apps Script to add calculated columns:
```javascript
function writeToSheetMatch(data) {
    // ... existing code

    // Add calculated columns
    const totalPoints = (data.autoFuel * 2) + (data.teleopFuel * 1);
    const efficiency = totalPoints / data.matchNumber;

    sheet.appendRow([
        // ... existing columns
        totalPoints,
        efficiency
    ]);
}
```

### Multi-Language Support

Add language selector to `index.html` and store preference in `localStorage`:
```javascript
const STRINGS = {
    en: { title: "Match Scouting", submit: "Submit" },
    es: { title: "Exploración de partidos", submit: "Enviar" }
};

const lang = localStorage.getItem("language") || "en";
document.title = STRINGS[lang].title;
```

---

## Future Enhancements

Potential improvements for future seasons:

- **Real-time sync** — WebSocket connection for live data updates
- **Data visualization** — Charts and graphs on the website
- **Strategy assistant** — AI-powered match predictions
- **Multi-event support** — Switch between events without redeploying
- **Role-based access** — Different permissions for scouts, leads, mentors
- **Native apps** — iOS/Android apps for better offline support

---

## Credits & License

Built for FRC Team 1792 Round Table Robotics • 2026 Season

**Technologies:**
- Vanilla JavaScript (ES6+)
- Google Apps Script
- The Blue Alliance API
- GitHub Pages

**License:** Open source — feel free to use, modify, and share with other FRC teams!

---

**Questions or issues?** Open an issue on GitHub or contact the team.
