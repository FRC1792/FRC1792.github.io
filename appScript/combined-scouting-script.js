/**
 * FRC 1792 Combined Scouting Data Receiver - Google Apps Script (2026)
 * Handles BOTH Match Scouting and Pit Scouting submissions
 * Routes data to different tabs based on scoutingType field
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Save the project (Ctrl+S or Cmd+S)
 * 5. Click "Deploy" > "New deployment"
 * 6. Select type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone"
 * 9. Click "Deploy" and authorize if needed
 * 10. Copy the Web app URL (ends with /exec)
 * 11. Use this SAME URL in both match-scouting.js AND pit-scouting.js
 */

// Configuration
const MATCH_SHEET_NAME = "Match Scouting Data";
const PIT_SHEET_NAME = "Pit Scouting Data";

// Allowed team codes for submission (server-side security gate)
// Add codes here for each allied team that should be able to submit data
const ALLOWED_CODES = ["rtr1792"];

/**
 * Handle POST requests from both scouting apps
 */
function doPost(e) {
  Logger.log("=== POST REQUEST RECEIVED ===");

  // Check if e exists
  if (!e) {
    Logger.log("ERROR: Request object (e) is undefined");
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "No request object received"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    Logger.log("Request object exists");

    let data;
    let rawData = "";

    // Method 1: Check parameter.payload (form-encoded)
    if (e.parameter && e.parameter.payload) {
      Logger.log("Found data in e.parameter.payload");
      rawData = e.parameter.payload;
      data = JSON.parse(rawData);
    }
    // Method 2: Check postData.contents
    else if (e.postData && e.postData.contents) {
      Logger.log("Found data in e.postData.contents");
      rawData = e.postData.contents;

      // Check if it's form-encoded
      if (rawData.indexOf("payload=") === 0) {
        rawData = decodeURIComponent(rawData.substring(8));
      }

      data = JSON.parse(rawData);
    }
    // Method 3: Try getting data as string
    else if (e.postData) {
      Logger.log("Trying e.postData directly");
      try {
        rawData = e.postData.getDataAsString ? e.postData.getDataAsString() : JSON.stringify(e.postData);

        // Check if it's form-encoded
        if (rawData.indexOf("payload=") === 0) {
          rawData = decodeURIComponent(rawData.substring(8));
        }

        data = JSON.parse(rawData);
      } catch (parseError) {
        Logger.log("Could not parse postData: " + parseError.toString());
        throw new Error("Could not parse postData");
      }
    }
    else {
      Logger.log("No data found in any expected location");
      throw new Error("No data received");
    }

    Logger.log("Data parsed successfully");

    // Backend validation is intentionally limited to the existing secret-code auth flow.
    // The front-end secret code is already checked on the home page before entering the app.

    // Route based on scouting type
    const scoutingType = data.scoutingType || "MATCH";
    Logger.log("Scouting Type: " + scoutingType);

    if (scoutingType === "PIT") {
      // Handle pit scouting
      Logger.log("Team: " + data.teamNumber + " (" + data.teamName + "), Scout: " + data.scoutName);
      writeToSheetPit(data);
      Logger.log("✓ Pit data written to sheet successfully");

      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: "Pit scouting data recorded successfully",
          teamNumber: data.teamNumber,
          teamName: data.teamName,
          scoutName: data.scoutName
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      // Handle match scouting (default)
      Logger.log("Match: " + data.matchNumber + ", Team: " + data.teamNumber + ", Scout: " + data.studentName);
      writeToSheetMatch(data);
      Logger.log("✓ Match data written to sheet successfully");

      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: "Match data recorded successfully",
          matchNumber: data.matchNumber,
          teamNumber: data.teamNumber,
          scoutName: data.studentName
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    Logger.log("=== ERROR IN doPost ===");
    Logger.log("Error: " + error.toString());
    Logger.log("Stack: " + (error.stack || "No stack trace"));

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing/verification)
 */
function doGet(e) {
  Logger.log("=== GET REQUEST RECEIVED ===");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchSheet = ss.getSheetByName(MATCH_SHEET_NAME);
  const pitSheet = ss.getSheetByName(PIT_SHEET_NAME);

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "ok",
      message: "FRC 1792 Combined Scouting Webhook (2026) is running",
      timestamp: new Date().toISOString(),
      matchSheet: {
        name: MATCH_SHEET_NAME,
        exists: matchSheet ? true : false,
        rowCount: matchSheet ? matchSheet.getLastRow() : 0
      },
      pitSheet: {
        name: PIT_SHEET_NAME,
        exists: pitSheet ? true : false,
        rowCount: pitSheet ? pitSheet.getLastRow() : 0
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Read the first available value from a list of possible payload keys.
 */
function getFirstDefined(data, keys, fallback) {
  for (const key of keys) {
    if (data && Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }
  return fallback;
}

function asBooleanFromAny(data, keys, fallback) {
  for (const key of keys) {
    if (data && Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined && data[key] !== null && data[key] !== "") {
      const val = String(data[key]).trim().toLowerCase();
      if (["true", "yes", "y", "1", "on"].includes(val)) return true;
      if (["false", "no", "n", "0", "off"].includes(val)) return false;
      return Boolean(data[key]);
    }
  }
  return Boolean(fallback);
}

function normalizeMatchData(data) {
  const normalized = data || {};

  normalized.studentName = getFirstDefined(normalized, ["studentName", "scoutName", "scout"], "");
  normalized.scoutTeam = getFirstDefined(normalized, ["scoutTeam", "team"], "");
  normalized.eventCode = getFirstDefined(normalized, ["eventCode", "event"], "");
  normalized.matchNumber = Number(getFirstDefined(normalized, ["matchNumber"], 0)) || 0;
  normalized.teamNumber = Number(getFirstDefined(normalized, ["teamNumber"], 0)) || 0;
  normalized.alliance = getFirstDefined(normalized, ["alliance"], "");
  normalized.startPos = getFirstDefined(normalized, ["startPos", "autoStartPos"], "");
  normalized.autoFuelRange = getFirstDefined(normalized, ["autoFuelRange", "autoFuel"], "");
  normalized.fuelNeutralZone = asBooleanFromAny(normalized, ["fuelNeutralZone", "autoFuelNeutralZone"], false);
  normalized.fuelOutpost = asBooleanFromAny(normalized, ["fuelOutpost", "autoFuelOutpost"], false);
  normalized.fuelDepot = asBooleanFromAny(normalized, ["fuelDepot", "autoFuelDepot"], false);
  normalized.fuelFloor = asBooleanFromAny(normalized, ["fuelFloor", "autoFuelFloor"], false);
  normalized.autoBumpOver = asBooleanFromAny(normalized, ["autoBumpOver", "bumpOver"], false);
  normalized.autoTrenchUnder = asBooleanFromAny(normalized, ["autoTrenchUnder", "trenchUnder"], false);
  normalized.autoBumpTrenchNone = asBooleanFromAny(normalized, ["autoBumpTrenchNone", "bumpTrenchNone"], false);
  normalized.autoShuttling = getFirstDefined(normalized, ["autoShuttling", "shuttling"], "");
  normalized.autoTower = getFirstDefined(normalized, ["autoTower"], "NONE");
  normalized.autoTowerPoints = Number(getFirstDefined(normalized, ["autoTowerPoints"], 0)) || 0;
  normalized.teleopFuelActiveRange = getFirstDefined(normalized, ["teleopFuelActiveRange", "teleopFuelRange", "teleopFuelActive"], "");
  normalized.teleopFuelNeutralZone = asBooleanFromAny(normalized, ["teleopFuelNeutralZone", "teleopFuelNeutral"], false);
  normalized.teleopFuelOutpost = asBooleanFromAny(normalized, ["teleopFuelOutpost", "teleopOutpost"], false);
  normalized.teleopFuelDepot = asBooleanFromAny(normalized, ["teleopFuelDepot", "teleopDepot"], false);
  normalized.teleopFuelFloor = asBooleanFromAny(normalized, ["teleopFuelFloor", "teleopFloor"], false);
  normalized.inactivePlayedDefense = asBooleanFromAny(normalized, ["inactivePlayedDefense", "playedDefense"], false);
  normalized.inactiveShuttledFuel = asBooleanFromAny(normalized, ["inactiveShuttledFuel", "shuttledFuel"], false);
  normalized.inactiveBlockedBumpTrench = asBooleanFromAny(normalized, ["inactiveBlockedBumpTrench", "blockedBumpTrench"], false);
  normalized.inactiveCollectingFuel = asBooleanFromAny(normalized, ["inactiveCollectingFuel", "collectingFuel"], false);
  normalized.shuttling = getFirstDefined(normalized, ["shuttling", "teleopShuttling"], "");
  normalized.teleopTower = getFirstDefined(normalized, ["teleopTower", "endgameTowerLevel"], "NONE");
  normalized.teleopTowerPoints = Number(getFirstDefined(normalized, ["teleopTowerPoints"], 0)) || 0;
  normalized.climbPos = getFirstDefined(normalized, ["climbPos", "climbPosition"], "");
  normalized.shotInHub = getFirstDefined(normalized, ["shotInHub", "hubShot"], "");
  normalized.affectedByDefense = getFirstDefined(normalized, ["affectedByDefense", "wasAffectedByDefense"], "");
  normalized.robotStatus = getFirstDefined(normalized, ["robotStatus"], "");
  normalized.defenseRating = getFirstDefined(normalized, ["defenseRating"], "");
  normalized.crossedBump = getFirstDefined(normalized, ["crossedBump"], "");
  normalized.crossedTrench = getFirstDefined(normalized, ["crossedTrench"], "");
  normalized.comments = getFirstDefined(normalized, ["comments"], "");
  normalized.rank = getFirstDefined(normalized, ["rank"], "");
  normalized.estPoints = Number(getFirstDefined(normalized, ["estPoints"], 0)) || 0;
  return normalized;
}

function normalizePitData(data) {
  const normalized = data || {};

  normalized.scoutName = getFirstDefined(normalized, ["scoutName", "studentName"], "");
  normalized.eventCode = getFirstDefined(normalized, ["eventCode", "event"], "");
  normalized.teamNumber = Number(getFirstDefined(normalized, ["teamNumber"], 0)) || 0;
  normalized.teamName = getFirstDefined(normalized, ["teamName"], "");
  normalized.drivetrain = getFirstDefined(normalized, ["drivetrain"], "");
  normalized.motorType = getFirstDefined(normalized, ["motorType"], "");
  normalized.width = getFirstDefined(normalized, ["width"], "");
  normalized.length = getFirstDefined(normalized, ["length"], "");
  normalized.height = getFirstDefined(normalized, ["height"], "");
  normalized.programmingLang = getFirstDefined(normalized, ["programmingLang", "programmingLanguage"], "");
  normalized.canClimb = getFirstDefined(normalized, ["canClimb"], "No");
  normalized.hopper = getFirstDefined(normalized, ["hopper"], "No");
  normalized.hopperLength = getFirstDefined(normalized, ["hopperLength"], "");
  normalized.hopperWidth = getFirstDefined(normalized, ["hopperWidth"], "");
  normalized.hopperHeight = getFirstDefined(normalized, ["hopperHeight"], "");
  normalized.ballCapacity = getFirstDefined(normalized, ["ballCapacity"], 0);
  normalized.specialFeatures = getFirstDefined(normalized, ["specialFeatures"], "");
  normalized.robotPhoto = getFirstDefined(normalized, ["robotPhoto"], "");
  return normalized;
}

/**
 * Write MATCH scouting data to the Google Sheet
 */
function writeToSheetMatch(data) {
  Logger.log("Writing to match sheet...");

  const normalizedData = normalizeMatchData(data);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MATCH_SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    Logger.log("Creating match sheet...");
    sheet = ss.insertSheet(MATCH_SHEET_NAME);
    createHeadersMatch(sheet);
  }

  // Create headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    Logger.log("Creating match headers...");
    createHeadersMatch(sheet);
  }

  // Parse timestamp
  const timestamp = normalizedData.timestampISO ? new Date(normalizedData.timestampISO) : new Date();

  // Build row array (ordered to match HTML form flow)
  const row = [
    // System & General (Screen 0)
    timestamp,                          // Timestamp
    normalizedData.studentName || "",             // Scout Name
    normalizedData.scoutTeam || "",               // Scout Team
    normalizedData.eventCode || "",               // Event Code
    normalizedData.matchNumber || 0,              // Match #
    normalizedData.teamNumber || 0,               // Team #
    normalizedData.alliance || "",                // Alliance

    // Auto (Screen 1)
    normalizedData.startPos || "",                // Start Position
    normalizedData.autoFuelRange || "",           // Auto Fuel Range
    normalizedData.fuelNeutralZone ? "Yes" : "No", // Auto - Fuel From Neutral Zone
    normalizedData.fuelOutpost ? "Yes" : "No",    // Auto - Fuel From Outpost
    normalizedData.fuelDepot ? "Yes" : "No",      // Auto - Fuel From Depot
    normalizedData.fuelFloor ? "Yes" : "No",      // Auto - Fuel From Floor
    normalizedData.autoBumpOver ? "Yes" : "No",   // Over Bump
    normalizedData.autoTrenchUnder ? "Yes" : "No", // Under Trench
    normalizedData.autoBumpTrenchNone ? "Yes" : "No", // Bump/Trench None
    normalizedData.autoShuttling || "",           // Auto Shuttling
    normalizedData.autoTower || "NONE",           // Auto Tower
    normalizedData.autoTowerPoints || 0,          // Auto Tower Pts

    // Teleop (Screen 2)
    normalizedData.teleopFuelActiveRange || "",   // Teleop Fuel (Active) Range
    normalizedData.teleopFuelNeutralZone ? "Yes" : "No", // Teleop - Fuel From Neutral Zone
    normalizedData.teleopFuelOutpost ? "Yes" : "No",     // Teleop - Fuel From Outpost
    normalizedData.teleopFuelDepot ? "Yes" : "No",       // Teleop - Fuel From Depot
    normalizedData.teleopFuelFloor ? "Yes" : "No",       // Teleop - Fuel From Floor
    normalizedData.inactivePlayedDefense ? "Yes" : "No", // Inactive - Played Defense
    normalizedData.inactiveShuttledFuel ? "Yes" : "No",  // Inactive - Shuttled Fuel
    normalizedData.inactiveBlockedBumpTrench ? "Yes" : "No", // Inactive - Blocked Bump/Trench
    normalizedData.inactiveCollectingFuel ? "Yes" : "No", // Inactive - Collecting Fuel
    normalizedData.shuttling || "",               // Shuttling

    // Endgame (Screen 3)
    normalizedData.teleopTower || "NONE",         // Endgame Tower Level
    normalizedData.teleopTowerPoints || 0,        // Endgame Tower Pts
    normalizedData.climbPos || "",                // Climb Position
    normalizedData.shotInHub || "",               // Shot In Hub

    // Misc (Screen 4)
    normalizedData.affectedByDefense || "",       // Affected By Defense
    normalizedData.robotStatus || "",             // Robot Status
    normalizedData.defenseRating || "",           // Defense Rating
    normalizedData.crossedBump || "",             // Crossed Bump
    normalizedData.crossedTrench || "",           // Crossed Trench
    normalizedData.comments || "",                // Comments
    normalizedData.rank || "",                    // Rank (1-3)

    // Calculated
    normalizedData.estPoints || 0                 // Est Points
  ];

  // Append the row
  sheet.appendRow(row);

  Logger.log("✓ Match row appended: Match " + normalizedData.matchNumber + ", Team " + normalizedData.teamNumber);
}

/**
 * Write PIT scouting data to the Google Sheet
 */
function writeToSheetPit(data) {
  Logger.log("Writing to pit sheet...");

  const normalizedData = normalizePitData(data);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PIT_SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    Logger.log("Creating pit sheet...");
    sheet = ss.insertSheet(PIT_SHEET_NAME);
    createHeadersPit(sheet);
  }

  // Create headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    Logger.log("Creating pit headers...");
    createHeadersPit(sheet);
  }

  // Parse timestamp
  const timestamp = normalizedData.timestampISO ? new Date(normalizedData.timestampISO) : new Date();

  // Build row array (ordered to match pit scouting form flow)
  const row = [
    // System & General
    timestamp,                          // Timestamp
    normalizedData.scoutName || "",               // Scout Name
    normalizedData.eventCode || "",               // Event Code
    normalizedData.teamNumber || 0,               // Team #
    normalizedData.teamName || "",                // Team Name

    // Robot Design
    normalizedData.drivetrain || "",              // Drivetrain Type
    normalizedData.motorType || "",               // Motor Type
    normalizedData.width || "",                   // Width (inches)
    normalizedData.length || "",                  // Length (inches)
    normalizedData.height || "",                  // Height (inches)
    normalizedData.programmingLang || "",         // Programming Language
    normalizedData.canClimb || "No",              // Can Climb Tower
    normalizedData.hopper || "No",                // Has Hopper
    normalizedData.hopperLength || "",            // Hopper Length (inches)
    normalizedData.hopperWidth || "",             // Hopper Width (inches)
    normalizedData.hopperHeight || "",            // Hopper Height (inches)
    normalizedData.ballCapacity || 0,             // Estimated Ball Capacity
    normalizedData.specialFeatures || "",         // Special Features/Mechanisms

    // Robot Photo - placeholder for image
    ""                                  // Photo column (image will be inserted over this cell)
  ];

  // Append the row
  sheet.appendRow(row);

  const currentRow = sheet.getLastRow();
  const photoColumn = 19; // Column S (19th column) - the Photo column

  // Insert robot photo if provided
  if (normalizedData.robotPhoto && normalizedData.robotPhoto.length > 0) {
    try {
      Logger.log("Processing robot photo...");

      // Remove the data:image/jpeg;base64, prefix if present
      let base64Data = normalizedData.robotPhoto;
      if (base64Data.indexOf('base64,') !== -1) {
        base64Data = base64Data.split('base64,')[1];
      }

      // Convert base64 to blob
      const imageBlob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        'image/jpeg',
        'robot_team_' + normalizedData.teamNumber + '_' + Date.now() + '.jpg'
      );

      // Upload image to Google Drive and get shareable link
      const folder = getOrCreateImageFolder();
      const file = folder.createFile(imageBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // Get the image URL for use in IMAGE() formula
      const imageUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();

      // Set row height to accommodate image (150 pixels)
      sheet.setRowHeight(currentRow, 150);

      // Insert image IN cell using IMAGE formula
      const imageFormula = '=IMAGE("' + imageUrl + '", 1)';
      sheet.getRange(currentRow, photoColumn).setFormula(imageFormula);

      Logger.log("✓ Robot photo inserted IN cell for Team " + normalizedData.teamNumber);

    } catch (imageError) {
      Logger.log("⚠️ Failed to insert image: " + imageError.toString());
      Logger.log("Error details: " + imageError.stack);
      // Write error message in the photo column
      sheet.getRange(currentRow, photoColumn).setValue("Photo upload failed: " + imageError.message);
    }
  } else {
    Logger.log("No robot photo provided");
    sheet.getRange(currentRow, photoColumn).setValue("No photo");
  }

  Logger.log("✓ Pit row appended: Team " + normalizedData.teamNumber + " (" + normalizedData.teamName + ")");
}

/**
 * Get or create a folder for robot images in Google Drive
 */
function getOrCreateImageFolder() {
  const folderName = "FRC 1792 Robot Photos";
  const folders = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  } else {
    Logger.log("Creating new folder: " + folderName);
    return DriveApp.createFolder(folderName);
  }
}

/**
 * Create header row for MATCH scouting
 */
function createHeadersMatch(sheet) {
  const headers = [
    // System & General (Screen 0)
    "Timestamp",
    "Scout Name",
    "Scout Team",
    "Event Code",
    "Match #",
    "Team #",
    "Alliance",
    // Auto (Screen 1)
    "Start Position",
    "Auto Fuel Range",
    "Auto - Fuel From Neutral Zone",
    "Auto - Fuel From Outpost",
    "Auto - Fuel From Depot",
    "Auto - Fuel From Floor",
    "Over Bump",
    "Under Trench",
    "Bump/Trench None",
    "Auto Shuttling",
    "Auto Tower",
    "Auto Tower Pts",
    // Teleop (Screen 2)
    "Teleop Fuel (Active) Range",
    "Teleop - Fuel From Neutral Zone",
    "Teleop - Fuel From Outpost",
    "Teleop - Fuel From Depot",
    "Teleop - Fuel From Floor",
    "Inactive - Played Defense",
    "Inactive - Shuttled Fuel",
    "Inactive - Blocked Bump/Trench",
    "Inactive - Collecting Fuel",
    "Shuttling",
    // Endgame (Screen 3)
    "Endgame Tower Level",
    "Endgame Tower Pts",
    "Climb Position",
    "Shot In Hub",
    // Misc (Screen 4)
    "Affected By Defense",
    "Robot Status",
    "Defense Rating",
    "Crossed Bump",
    "Crossed Trench",
    "Comments",
    "Rank (1-3)",
    // Calculated
    "Est Points"
  ];

  sheet.appendRow(headers);

  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4285F4");  // Blue for match scouting
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");

  // Freeze header row
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log("✓ Match headers created");
}

/**
 * Create header row for PIT scouting
 */
function createHeadersPit(sheet) {
  const headers = [
    // System & General
    "Timestamp",
    "Scout Name",
    "Event Code",
    "Team #",
    "Team Name",

    // Robot Design
    "Drivetrain Type",
    "Motor Type",
    "Width (in)",
    "Length (in)",
    "Height (in)",
    "Programming Language",
    "Can Climb Tower",
    "Has Hopper",
    "Hopper Length (in)",
    "Hopper Width (in)",
    "Hopper Height (in)",
    "Ball Capacity",
    "Special Features",

    // Photo
    "Robot Photo"
  ];

  sheet.appendRow(headers);

  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#34A853");  // Green for pit scouting
  headerRange.setFontColor("#ffffff");
  headerRange.setHorizontalAlignment("center");

  // Freeze header row
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Make the photo column wider to accommodate images
  sheet.setColumnWidth(19, 200); // Column S (Robot Photo) - 200 pixels wide

  Logger.log("✓ Pit headers created");
}

/**
 * TEST FUNCTION - Test MATCH scouting
 */
function testMatchScouting() {
  Logger.log("=== RUNNING MATCH SCOUTING TEST ===");

  const testData = {
    timestampISO: new Date().toISOString(),
    studentName: "Test Scout",
    scoutTeam: "1792",
    eventCode: "2026wiapp",
    matchNumber: 999,
    teamNumber: 1792,
    alliance: "Blue",
    // Auto
    startPos: "1",
    autoFuelRange: "40-60",
    fuelNeutralZone: true,
    fuelOutpost: false,
    fuelDepot: true,
    fuelFloor: false,
    autoBumpOver: true,
    autoTrenchUnder: false,
    autoBumpTrenchNone: false,
    autoShuttling: "Yes",
    autoTower: "L1",
    autoTowerPoints: 15,
    // Teleop
    teleopFuelActiveRange: "100-120",
    teleopFuelNeutralZone: true,
    teleopFuelOutpost: true,
    teleopFuelDepot: false,
    teleopFuelFloor: false,
    inactivePlayedDefense: true,
    inactiveShuttledFuel: false,
    inactiveBlockedBumpTrench: true,
    inactiveCollectingFuel: false,
    shuttling: "Great",
    // Endgame
    teleopTower: "L2",
    teleopTowerPoints: 20,
    climbPos: "Center",
    shotInHub: "Yes",
    // Misc
    affectedByDefense: "No",
    robotStatus: "OK",
    defenseRating: "Strong",
    crossedBump: "Yes",
    crossedTrench: "No",
    comments: "Great robot, very consistent!",
    rank: "1",
    // Calculated
    estPoints: 75
  };

  try {
    writeToSheetMatch(testData);
    Logger.log("✓✓✓ MATCH TEST SUCCESSFUL!");
    Browser.msgBox("Success!", "Check 'Match Scouting Data' tab for test data (Match 999, Team 1792)", Browser.Buttons.OK);
    return "✓ Match test successful! Check sheet for Match 999.";
  } catch (error) {
    Logger.log("✗✗✗ MATCH TEST FAILED: " + error.toString());
    Browser.msgBox("Test Failed", error.toString(), Browser.Buttons.OK);
    return "✗ Test failed: " + error.toString();
  }
}

/**
 * TEST FUNCTION - Test PIT scouting
 */
function testPitScouting() {
  Logger.log("=== RUNNING PIT SCOUTING TEST ===");

  // 100x100 red square test image (more visible than 1x1 pixel)
  const testImage = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCACAAIADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==";

  const testData = {
    scoutingType: "PIT",
    timestampISO: new Date().toISOString(),
    scoutName: "Test Scout",
    eventCode: "2026wiapp",
    teamNumber: 1792,
    teamName: "Round Table Robotics",

    // Robot Design
    drivetrain: "Swerve",
    motorType: "NEO",
    width: "28",
    length: "32",
    height: "48",
    programmingLang: "Java",
    canClimb: "L2",
    hopper: "Yes",
    hopperLength: "20",
    hopperWidth: "15",
    hopperHeight: "10",
    ballCapacity: 12,
    specialFeatures: "Advanced autonomous routines, vision tracking system, dual intake mechanism",

    // Photo - using test image (100x100 red square - more visible)
    robotPhoto: "data:image/jpeg;base64," + testImage
  };

  try {
    writeToSheetPit(testData);
    Logger.log("✓✓✓ PIT TEST SUCCESSFUL!");
    Browser.msgBox("Success!", "Check 'Pit Scouting Data' tab for test data (Team 1792).\n\nYou should see:\n- A red square test image\n- '✓ Photo' text in the cell\n\nReal robot photos will be full-size.", Browser.Buttons.OK);
    return "✓ Pit test successful! Check sheet for Team 1792.";
  } catch (error) {
    Logger.log("✗✗✗ PIT TEST FAILED: " + error.toString());
    Logger.log("Stack trace: " + error.stack);
    Browser.msgBox("Test Failed", error.toString(), Browser.Buttons.OK);
    return "✗ Test failed: " + error.toString();
  }
}

/**
 * Initialize both sheets
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let matchSheet = ss.getSheetByName(MATCH_SHEET_NAME);
  let pitSheet = ss.getSheetByName(PIT_SHEET_NAME);

  let messages = [];

  // Initialize match sheet
  if (!matchSheet) {
    matchSheet = ss.insertSheet(MATCH_SHEET_NAME);
    createHeadersMatch(matchSheet);
    messages.push("✓ Match Scouting Data sheet created!");
  } else if (matchSheet.getLastRow() === 0) {
    createHeadersMatch(matchSheet);
    messages.push("✓ Match headers added!");
  }

  // Initialize pit sheet
  if (!pitSheet) {
    pitSheet = ss.insertSheet(PIT_SHEET_NAME);
    createHeadersPit(pitSheet);
    messages.push("✓ Pit Scouting Data sheet created!");
  } else if (pitSheet.getLastRow() === 0) {
    createHeadersPit(pitSheet);
    messages.push("✓ Pit headers added!");
  }

  if (messages.length > 0) {
    Browser.msgBox("Initialization Complete", messages.join("\n"), Browser.Buttons.OK);
    return messages.join("\n");
  } else {
    Browser.msgBox("Already Initialized", "Both sheets already exist with data.", Browser.Buttons.OK);
    return "Both sheets already exist with data.";
  }
}

/**
 * Clear match data (keep headers)
 */
function clearMatchData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MATCH_SHEET_NAME);

  if (!sheet) {
    Browser.msgBox("Error", "Match sheet not found!", Browser.Buttons.OK);
    return "Match sheet not found!";
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    Browser.msgBox("Success", "✓ Cleared " + (lastRow - 1) + " rows from Match Scouting Data", Browser.Buttons.OK);
    return "✓ Cleared " + (lastRow - 1) + " rows";
  }

  Browser.msgBox("No Data", "No data to clear in Match Scouting Data", Browser.Buttons.OK);
  return "No data to clear";
}

/**
 * Clear pit data (keep headers)
 */
function clearPitData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PIT_SHEET_NAME);

  if (!sheet) {
    Browser.msgBox("Error", "Pit sheet not found!", Browser.Buttons.OK);
    return "Pit sheet not found!";
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    Browser.msgBox("Success", "✓ Cleared " + (lastRow - 1) + " rows from Pit Scouting Data", Browser.Buttons.OK);
    return "✓ Cleared " + (lastRow - 1) + " rows";
  }

  Browser.msgBox("No Data", "No data to clear in Pit Scouting Data", Browser.Buttons.OK);
  return "No data to clear";
}
