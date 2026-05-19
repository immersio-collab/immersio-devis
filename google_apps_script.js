function doGet(e) {
  var response = { status: "Immersio Apps Script is live" };
  var output = ContentService.createTextOutput(JSON.stringify(response));
  output.setMimeType(ContentService.MimeType.JSON);
  return addCorsHeaders(output);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Sheet1 handling
    var sheet1 = ss.getSheetByName("Sheet1");
    if (!sheet1) {
      sheet1 = ss.insertSheet("Sheet1");
    }
    
    if (sheet1.getLastRow() === 0) {
      var headers = ["devis_number", "timestamp", "client_nom", "client_tel", "client_email", "client_ville", "type_bien", "superficie", "tour3d_price", "options_selected", "options_total", "hebergement_duree", "hebergement_price", "subtotal", "remise_pct", "remise_amt", "total_ttc", "notes", "validite_jours", "auto_pricing_used", "statut"];
      sheet1.appendRow(headers);
    }
    
    var lastRow = sheet1.getLastRow();
    var lastDevisNum = lastRow >= 2 ? sheet1.getRange(lastRow, 1).getValue() : "IMM-" + new Date().getFullYear() + "-0000";
    var lastCount = parseInt(lastDevisNum.split("-")[2]) || 0;
    var devisNumber = "IMM-" + new Date().getFullYear() + "-" + ("000" + (lastCount + 1)).slice(-4);
    
    var d = new Date();
    var timestamp = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    
    var rowData = [
      devisNumber,
      timestamp,
      payload.client_nom || "",
      payload.client_tel || "",
      payload.client_email || "",
      payload.client_ville || "",
      payload.type_bien || "",
      payload.superficie || "",
      payload.tour3d_price || 0,
      payload.options_selected || "",
      payload.options_total || 0,
      payload.hebergement_duree || "",
      payload.hebergement_price || 0,
      payload.subtotal || 0,
      payload.remise_pct || 0,
      payload.remise_amt || 0,
      payload.total_ttc || 0,
      payload.notes || "",
      payload.validite_jours || "",
      payload.auto_pricing_used === true ? "TRUE" : "FALSE",
      "En attente" // statut
    ];
    
    sheet1.appendRow(rowData);
    
    // Sheet2 (Statistiques) handling
    setupStatsSheet(ss);
    
    var out = ContentService.createTextOutput(JSON.stringify({ success: true, devis_number: devisNumber }));
    out.setMimeType(ContentService.MimeType.JSON);
    return addCorsHeaders(out);
    
  } catch (err) {
    var errOut = ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }));
    errOut.setMimeType(ContentService.MimeType.JSON);
    return addCorsHeaders(errOut);
  }
}

function setupStatsSheet(ss) {
  var statsSheet = ss.getSheetByName("Statistiques");
  if (!statsSheet) {
    statsSheet = ss.insertSheet("Statistiques");
  }
  
  if (statsSheet.getLastRow() === 0) {
    var statsData = [
      ["Statistiques", ""],
      ["Total devis", '=COUNTA(Sheet1!A2:A)'],
      ["CA total (MAD)", '=SUM(Sheet1!Q2:Q)'],
      ["Acceptés", '=COUNTIF(Sheet1!U2:U,"Accepté")'],
      ["En attente", '=COUNTIF(Sheet1!U2:U,"En attente")'],
      ["Refusés", '=COUNTIF(Sheet1!U2:U,"Refusé")'],
      ["Panier moyen (MAD)", '=IFERROR(B3/B2,0)']
    ];
    statsSheet.getRange(1, 1, statsData.length, 2).setValues(statsData);
  }
}

function addCorsHeaders(output) {
  return output
    .setHeader("Access-Control-Allow-Origin", "https://immersio-devis.vercel.app")
    .setHeader("Access-Control-Allow-Methods", "POST")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
