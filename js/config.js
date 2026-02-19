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
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwTSe8M_vAkyOV3JnYRV-0hn_5Pnokc8vZGhvnddPrBzBa1jlCZIlBXlLr-qPdYsS5h/exec",

    // The Blue Alliance API key
    // Get this from: thebluealliance.com/account → Read API Keys
    TBA_API_KEY: "TNbsT69zVcQljcc4LKoOGVOnAghDBNZC02Nb2TTXAjUDwaNpQX1SK2oyWEeqM4IP",

    // Event code (find at thebluealliance.com — last part of event URL)
    // Example: "2026wiapp" = 2026 Appleton District
    EVENT_KEY: "2026nyro",

    // Set to false to disable team loading from TBA
    ENABLE_TEAM_LOADING: true,

    // Secret code required to access scouting (client-side gate)
    // The real security is server-side in Apps Script (ALLOWED_CODES)
    SECRET_CODE: "4458"
};
