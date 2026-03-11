/**
 * Google Apps Script for Ads Reporting Dashboard
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet (FreedomBusiness Registration List)
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Save (Ctrl+S)
 * 5. Click Deploy > New Deployment
 * 6. Type: Web App
 * 7. Execute as: Me
 * 8. Who has access: Anyone
 * 9. Click Deploy and authorize permissions
 * 10. Copy the Web App URL and paste it as APPS_SCRIPT_URL in your Vercel environment variables
 */

// ============================================================
// CONFIG - Update these if your sheet tab names are different
// ============================================================
var CONFIG = {
  COUNT1_SHEET: 'COUNT1',
  DAILY_REPORTING_SHEET: 'Daily Reporting',
  WEBINAR_NAME: 'AI 网络自由创业',
  // Column indices in Daily Reporting (0-based)
  // A=0, B=1, C=2, D=3, E=4, F=5, G=6(hidden), H=7, I=8, J=9, K=10, L=11, M=12, N=13
  COL_DATE: 1,          // B: Date
  COL_SPENT_NO_TAX: 7,  // H: Total Ad Spent (Without Tax)
  COL_SPENT_WITH_TAX: 8, // I: Total Ad Spent (With Tax)
  COL_OPTINS: 11,        // L: Total Leads (Phone Number)
  COL_CPL: 12,           // M: Total Cost Per Leads
  COL_VIEWS: 13,         // N: Number of Unique View
  DAILY_DATA_START_ROW: 6 // Row 7 in Sheets = index 6 (0-based)
};

function doGet(e) {
  try {
    var data = getDashboardData();
    var output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch (err) {
    var errorOutput = ContentService.createTextOutput(JSON.stringify({
      error: err.message,
      stack: err.stack
    }));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

function getDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var count1 = ss.getSheetByName(CONFIG.COUNT1_SHEET);
  var dailySheet = ss.getSheetByName(CONFIG.DAILY_REPORTING_SHEET);

  if (!count1) throw new Error('COUNT1 sheet not found');
  if (!dailySheet) throw new Error('Daily Reporting sheet not found');

  // ---- Registration data from COUNT1 ----
  var c1 = count1.getRange('A1:D16').getValues();

  // Row indices (0-based): Row 7 = index 6, Row 8 = index 7, etc.
  var totalRegistrants = safeNum(c1[6][1]);   // B7
  var totalChange      = safeNum(c1[6][2]);   // C7
  var adsTotal         = safeNum(c1[2][1]);   // B3
  var adsTotalChange   = safeNum(c1[3][1]);   // B4 (yesterday+)
  var adsTarget        = safeNum(c1[2][0]);   // A3
  var kolTotal         = safeNum(c1[2][3]);   // D3
  var kolTotalChange   = safeNum(c1[3][3]);   // D4

  var adsPaid          = safeNum(c1[7][1]);   // B8
  var adsPaidChange    = safeNum(c1[7][2]);   // C8
  var adsOrganic       = safeNum(c1[8][1]);   // B9
  var adsOrganicChange = safeNum(c1[8][2]);   // C9

  var kols = [
    { name: 'KOL #01 - Cody',    emoji: '🟣', count: safeNum(c1[9][1]),  change: safeNum(c1[9][2])  },
    { name: 'KOL #02 - DDW',     emoji: '🔵', count: safeNum(c1[10][1]), change: safeNum(c1[10][2]) },
    { name: 'KOL #03 - CHARLES', emoji: '🟠', count: safeNum(c1[11][1]), change: safeNum(c1[11][2]) },
    { name: 'KOL #04 - Kvin',    emoji: '🟤', count: safeNum(c1[12][1]), change: safeNum(c1[12][2]) },
    { name: 'KOL #05 - Kokee',   emoji: '🟢', count: safeNum(c1[13][1]), change: safeNum(c1[13][2]) }
  ];

  // ---- Date calculations ----
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var webinarDate = getNextWednesday(today);
  var countdownDays = Math.round((webinarDate - today) / 86400000);

  var webinarSession = Utilities.formatDate(webinarDate, Session.getScriptTimeZone(), 'MMdd');
  var webinarDateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'MMM dd').toUpperCase()
    + ' (' + Utilities.formatDate(today, Session.getScriptTimeZone(), 'EEE').toUpperCase() + ')';

  // ---- Ads spending data from Daily Reporting ----
  var lastThursday = getLastThursday(today);
  var yesterday    = new Date(today); yesterday.setDate(today.getDate() - 1);

  var allRows = dailySheet.getDataRange().getValues();
  var weeklyStats    = aggregateRows(allRows, lastThursday, today);
  var yesterdayStats = aggregateRows(allRows, yesterday,   yesterday);

  // Weekly date range label
  var thurStr = Utilities.formatDate(lastThursday, Session.getScriptTimeZone(), 'dd/MM');
  var wedStr  = Utilities.formatDate(today, Session.getScriptTimeZone(), 'dd/MM');
  var weeklyDateRange = thurStr + ' Thursday - ' + wedStr + ' ' +
    Utilities.formatDate(today, Session.getScriptTimeZone(), 'EEEE') +
    ' (' + CONFIG.WEBINAR_NAME + ')';

  var yesterdayStr = Utilities.formatDate(yesterday, Session.getScriptTimeZone(), 'dd MMM (EEE)').toUpperCase();

  return {
    webinarSession:   webinarSession,
    webinarDate:      webinarDateStr,
    totalRegistrants: totalRegistrants,
    totalChange:      totalChange,
    adsTotal:         adsTotal,
    adsTotalChange:   adsTotalChange,
    adsTarget:        adsTarget,
    adsPaid:          adsPaid,
    adsPaidChange:    adsPaidChange,
    adsOrganic:       adsOrganic,
    adsOrganicChange: adsOrganicChange,
    kolTotal:         kolTotal,
    kolTotalChange:   kolTotalChange,
    kols:             kols,
    weekly: {
      dateRange:       weeklyDateRange,
      spentWithoutTax: weeklyStats.spentWithoutTax,
      spentWithTax:    weeklyStats.spentWithTax,
      views:           weeklyStats.views,
      optins:          weeklyStats.optins,
      cpl:             weeklyStats.cpl,
      cplWithTax:      weeklyStats.cplWithTax
    },
    yesterday: {
      date:            yesterdayStr,
      spentWithoutTax: yesterdayStats.spentWithoutTax,
      spentWithTax:    yesterdayStats.spentWithTax,
      views:           yesterdayStats.views,
      optins:          yesterdayStats.optins,
      cpl:             yesterdayStats.cpl,
      cplWithTax:      yesterdayStats.cplWithTax
    },
    countdownDays: countdownDays,
    lastUpdated:   new Date().toISOString()
  };
}

// Aggregate rows between startDate and endDate (inclusive)
function aggregateRows(allRows, startDate, endDate) {
  var start = new Date(startDate); start.setHours(0,0,0,0);
  var end   = new Date(endDate);   end.setHours(23,59,59,999);

  var spentWithoutTax = 0, spentWithTax = 0, views = 0, optins = 0;

  for (var i = CONFIG.DAILY_DATA_START_ROW; i < allRows.length; i++) {
    var row = allRows[i];
    var dateCell = row[CONFIG.COL_DATE];
    if (!dateCell || !(dateCell instanceof Date)) continue;

    var rowDate = new Date(dateCell);
    if (rowDate >= start && rowDate <= end) {
      spentWithoutTax += safeNum(row[CONFIG.COL_SPENT_NO_TAX]);
      spentWithTax    += safeNum(row[CONFIG.COL_SPENT_WITH_TAX]);
      optins          += safeNum(row[CONFIG.COL_OPTINS]);
      views           += safeNum(row[CONFIG.COL_VIEWS]);
    }
  }

  var cpl        = optins > 0 ? spentWithoutTax / optins : 0;
  var cplWithTax = optins > 0 ? spentWithTax    / optins : 0;

  return { spentWithoutTax, spentWithTax, views, optins, cpl, cplWithTax };
}

// Returns the most recent Thursday (or today if today is Thursday)
function getLastThursday(today) {
  var d = new Date(today);
  // Shift reference by -4 days then get weekday (Mon=1 Sun=7 logic)
  var shifted = new Date(d); shifted.setDate(d.getDate() - 4);
  var dow = shifted.getDay(); // 0=Sun,1=Mon,...,6=Sat
  var mode2 = (dow === 0) ? 7 : dow; // Mon=1...Sun=7
  var result = new Date(d);
  result.setDate(d.getDate() - mode2);
  result.setHours(0,0,0,0);
  return result;
}

// Returns current Wednesday if today is Wed, otherwise next Wednesday
function getNextWednesday(today) {
  var d = new Date(today);
  var dow = d.getDay(); // 0=Sun, 3=Wed
  var daysToWed = (3 - dow + 7) % 7;
  d.setDate(d.getDate() + daysToWed);
  return d;
}

function safeNum(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// For testing in Apps Script editor
function test() {
  Logger.log(JSON.stringify(getDashboardData(), null, 2));
}
