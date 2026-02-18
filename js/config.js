/*
 * ============================================
 *  FRC 1792 SCOUTING - SHARED CONFIGURATION
 * ============================================
 *
 *  This is the ONLY file you need to edit
 *  when setting up for a new event or season.
 *
 */

const SCOUTING_CONFIG = {
    // Google Apps Script URL (ends with /exec)
    // Get this from: Google Sheet → Extensions → Apps Script → Deploy → Web app
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwoMRCgdf3QfNphm-sWC4fyJdnOiDyhZ1C-NhQm8qFCQbc0a_eHg7L8RuV_ZjwO5qCJ/exec",

    // The Blue Alliance API key
    // Get this from: thebluealliance.com/account → Read API Keys
    TBA_API_KEY: "mQ8t21zqvxyCjMRu2NSzU1AJyTEcFrs2s6irhWfJ8lhE3Gr3MTX6xm9ihmuspu7I",

    // Event code (find at thebluealliance.com — last part of event URL)
    // Example: "2026wiapp" = 2026 Appleton District
    EVENT_KEY: "2026isde1",

    // Set to false to disable team loading from TBA
    ENABLE_TEAM_LOADING: true,

    // Secret code required to access scouting (client-side gate)
    // The real security is server-side in Apps Script (ALLOWED_CODES)
    SECRET_CODE: "FRC3211"
};
