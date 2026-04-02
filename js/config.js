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
    WEBHOOK_URL: "your-apps-script-webhook-url-here",

    // The Blue Alliance API key
    // Get this from: thebluealliance.com/account → Read API Keys
    TBA_API_KEY: "your-tba-api-key-here",

    // Event code (find at thebluealliance.com — last part of event URL)
<<<<<<< HEAD
    // Example: "2026wiapp" = 2026 Appleton District
    EVENT_KEY: "your-event-key-here",
=======
    // Example: "2026wisev" = 2026 La Crosse District
    EVENT_KEY: "2026wilax",
>>>>>>> host

    // Set to false to disable team loading from TBA
    ENABLE_TEAM_LOADING: true,

    // Secret code required to access scouting (client-side gate)
    // The real security is server-side in Apps Script (ALLOWED_CODES)
<<<<<<< HEAD
    SECRET_CODE: "your-secret-code-here"
=======
    SECRET_CODE: "atlas"
>>>>>>> host
};
