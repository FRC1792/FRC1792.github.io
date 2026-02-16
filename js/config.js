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
    TBA_API_KEY: "QbQkb0gqMlzea1xJM9Mo81lCIEFeHcHduBAj4X2M2SJZI7d7rhxXpHepMhseNOdZ",

    // Event code (find at thebluealliance.com — last part of event URL)
    // Example: "2026wiapp" = 2026 Appleton District
    EVENT_KEY: "2026wiapp",

    // Set to false to disable team loading from TBA
    ENABLE_TEAM_LOADING: true,

    // Secret code required to access scouting (client-side gate)
    // The real security is server-side in Apps Script (ALLOWED_CODES)
    SECRET_CODE: "fatlas"
};
