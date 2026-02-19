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

// Allowed submit codes for submission (server-side security gate)
// IMPORTANT: These codes are stored ONLY in Apps Script, NOT in the public repo
// Add/change codes here to authorize scouts to submit data
const ALLOWED_SUBMIT_CODES = ["Your-Password-Here", "Another-Valid-Code"]; // <-- REPLACE with your actual codes

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

    // Validate submit code
    const submitCode = data.submitCode || "";
    if (!submitCode || ALLOWED_SUBMIT_CODES.indexOf(submitCode) === -1) {
      Logger.log("REJECTED: Invalid or missing submit code: " + submitCode);
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "error",
          message: "Invalid submit code. Ask your lead scout for the correct code."
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    Logger.log("Submit code validated: " + submitCode);

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
 * Write MATCH scouting data to the Google Sheet
 */
function writeToSheetMatch(data) {
  Logger.log("Writing to match sheet...");

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
  const timestamp = data.timestampISO ? new Date(data.timestampISO) : new Date();

  // Helper function to extract cycle data
  const getCycleData = (cycles, maxCycles) => {
    const cycleData = [];
    for (let i = 0; i < maxCycles; i++) {
      if (cycles && cycles[i]) {
        cycleData.push(cycles[i].hopperFill || 0);
        cycleData.push(cycles[i].accuracy || 0);
      } else {
        cycleData.push("");  // Empty if cycle doesn't exist
        cycleData.push("");
      }
    }
    return cycleData;
  };

  // Build row array (ordered to match HTML form flow)
  const row = [
    // System & General (Screen 0)
    timestamp,                          // Timestamp
    data.studentName || "",             // Scout Name
    data.scoutTeam || "",               // Scout Team
    data.eventCode || "",               // Event Code
    data.matchNumber || 0,              // Match #
    data.teamNumber || 0,               // Team #
    data.alliance || "",                // Alliance

    // Auto (Screen 1)
    data.startPos || "",                // Start Position
    ...getCycleData(data.autoCycles, 20), // Auto Cycles 1-20 (Hopper %, Accuracy %)
    data.fuelNeutralZone ? "Yes" : "No", // Auto - Fuel From Neutral Zone
    data.fuelOutpost ? "Yes" : "No",    // Auto - Fuel From Outpost
    data.fuelDepot ? "Yes" : "No",      // Auto - Fuel From Depot
    data.fuelFloor ? "Yes" : "No",      // Auto - Fuel From Floor
    data.autoBumpOver ? "Yes" : "No",   // Over Bump
    data.autoTrenchUnder ? "Yes" : "No", // Under Trench
    data.autoBumpTrenchNone ? "Yes" : "No", // Bump/Trench None
    data.autoShuttling || "",           // Auto Shuttling
    data.autoTower || "NONE",           // Auto Tower
    data.autoTowerPoints || 0,          // Auto Tower Pts

    // Teleop (Screen 2)
    ...getCycleData(data.teleopCycles, 20), // Teleop Cycles 1-20 (Hopper %, Accuracy %)
    data.teleopFuelNeutralZone ? "Yes" : "No", // Teleop - Fuel From Neutral Zone
    data.teleopFuelOutpost ? "Yes" : "No",     // Teleop - Fuel From Outpost
    data.teleopFuelDepot ? "Yes" : "No",       // Teleop - Fuel From Depot
    data.teleopFuelFloor ? "Yes" : "No",       // Teleop - Fuel From Floor
    data.inactivePlayedDefense ? "Yes" : "No", // Inactive - Played Defense
    data.inactiveShuttledFuel ? "Yes" : "No",  // Inactive - Shuttled Fuel
    data.inactiveBlockedBumpTrench ? "Yes" : "No", // Inactive - Blocked Bump/Trench
    data.inactiveCollectingFuel ? "Yes" : "No", // Inactive - Collecting Fuel
    data.shuttling || "",               // Shuttling

    // Endgame (Screen 3)
    data.teleopTower || "NONE",         // Endgame Tower Level
    data.teleopTowerPoints || 0,        // Endgame Tower Pts
    data.climbPos || "",                // Climb Position
    data.shotInHub || "",               // Shot In Hub

    // Misc (Screen 4)
    data.affectedByDefense || "",       // Affected By Defense
    data.robotStatus || "",             // Robot Status
    data.defenseRating || "",           // Defense Rating
    data.crossedBump || "",             // Crossed Bump
    data.crossedTrench || "",           // Crossed Trench
    data.comments || "",                // Comments
    data.rank || ""                     // Rank (1-3)
  ];

  // Append the row
  sheet.appendRow(row);

  Logger.log("✓ Match row appended: Match " + data.matchNumber + ", Team " + data.teamNumber);
}

/**
 * Write PIT scouting data to the Google Sheet
 */
function writeToSheetPit(data) {
  Logger.log("Writing to pit sheet...");

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
  const timestamp = data.timestampISO ? new Date(data.timestampISO) : new Date();

  // Build row array (ordered to match pit scouting form flow)
  const row = [
    // System & General
    timestamp,                          // Timestamp
    data.scoutName || "",               // Scout Name
    data.eventCode || "",               // Event Code
    data.teamNumber || 0,               // Team #
    data.teamName || "",                // Team Name

    // Robot Design
    data.drivetrain || "",              // Drivetrain Type
    data.motorType || "",               // Motor Type
    data.width || "",                   // Width (inches)
    data.length || "",                  // Length (inches)
    data.height || "",                  // Height (inches)
    data.programmingLang || "",         // Programming Language
    data.canClimb || "No",              // Can Climb Tower
    data.hopper || "No",                // Has Hopper
    data.hopperLength || "",            // Hopper Length (inches)
    data.hopperWidth || "",             // Hopper Width (inches)
    data.hopperHeight || "",            // Hopper Height (inches)
    data.ballCapacity || 0,             // Estimated Ball Capacity
    data.specialFeatures || "",         // Special Features/Mechanisms

    // Robot Photo - placeholder for image
    ""                                  // Photo column (image will be inserted over this cell)
  ];

  // Append the row
  sheet.appendRow(row);

  const currentRow = sheet.getLastRow();
  const photoColumn = 19; // Column S (19th column) - the Photo column

  // Insert robot photo if provided
  if (data.robotPhoto && data.robotPhoto.length > 0) {
    try {
      Logger.log("Processing robot photo...");

      // Remove the data:image/jpeg;base64, prefix if present
      let base64Data = data.robotPhoto;
      if (base64Data.indexOf('base64,') !== -1) {
        base64Data = base64Data.split('base64,')[1];
      }

      // Convert base64 to blob
      const imageBlob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        'image/jpeg',
        'robot_team_' + data.teamNumber + '_' + Date.now() + '.jpg'
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

      Logger.log("✓ Robot photo inserted IN cell for Team " + data.teamNumber);

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

  Logger.log("✓ Pit row appended: Team " + data.teamNumber + " (" + data.teamName + ")");
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
  // Generate cycle headers
  const autoCycleHeaders = [];
  for (let i = 1; i <= 20; i++) {
    autoCycleHeaders.push(`Auto Cycle ${i} Hopper %`);
    autoCycleHeaders.push(`Auto Cycle ${i} Accuracy %`);
  }

  const teleopCycleHeaders = [];
  for (let i = 1; i <= 20; i++) {
    teleopCycleHeaders.push(`Teleop Cycle ${i} Hopper %`);
    teleopCycleHeaders.push(`Teleop Cycle ${i} Accuracy %`);
  }

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
    ...autoCycleHeaders,  // Auto Cycles 1-20
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
    ...teleopCycleHeaders,  // Teleop Cycles 1-20
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
    "Rank (1-3)"
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
    autoCycles: [
      { hopperFill: 50, accuracy: 75 },
      { hopperFill: 60, accuracy: 100 },
      { hopperFill: 45, accuracy: 50 }
    ],
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
    teleopCycles: [
      { hopperFill: 80, accuracy: 100 },
      { hopperFill: 70, accuracy: 75 },
      { hopperFill: 90, accuracy: 100 },
      { hopperFill: 85, accuracy: 100 }
    ],
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
    submitCode: "1792x1259"
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
