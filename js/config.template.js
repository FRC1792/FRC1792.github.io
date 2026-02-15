/*
 * ============================================
 *  FRC 1792 SCOUTING - SHARED CONFIGURATION
 * ============================================
 *
 *  SETUP INSTRUCTIONS:
 *  1. Copy this file to js/config.js
 *  2. Fill in your actual values below
 *  3. Never commit js/config.js to git (it's in .gitignore)
 *
 */

const SCOUTING_CONFIG = {
    // Google Apps Script URL (ends with /exec)
    // Get this from: Google Sheet → Extensions → Apps Script → Deploy → Web app
    WEBHOOK_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec",

    // The Blue Alliance API key
    // Get this from: thebluealliance.com/account → Read API Keys
    TBA_API_KEY: "YOUR_TBA_API_KEY_HERE",

    // Event code (find at thebluealliance.com — last part of event URL)
    // Example: "2026wiapp" = 2026 Appleton District
    EVENT_KEY: "2026wiapp",

    // Set to false to disable team loading from TBA
    ENABLE_TEAM_LOADING: true,

    // Secret code required to access scouting (client-side gate)
    // The real security is server-side in Apps Script (ALLOWED_CODES)
    SECRET_CODE: "your-team-code-here"
};
