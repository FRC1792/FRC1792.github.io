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
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbyqD8Nwba8iaF2ES_iGSqvuWsIAkwtzUBxvzyTBMkB49yXy9ZtWrxnt3xlQLXFp5L4-/exec",

    // The Blue Alliance API key
    // Get this from: thebluealliance.com/account → Read API Keys
    TBA_API_KEY: "https://www.thebluealliance.com/event/2026iltrr#media",

    // Event code (find at thebluealliance.com — last part of event URL)
    // Example: "2026wicmp" = 2026 Wisconsin State Championship at Waukesha West High School
    EVENT_KEY: "2026iltrr",

    // Set to false to disable team loading from TBA
    ENABLE_TEAM_LOADING: false,

    // Secret code required to access scouting (client-side gate)
    // The real security is server-side in Apps Script (ALLOWED_CODES)
    SECRET_CODE: "atlas"
};
