/**
 * Premium Kosher Tours — CRM → Google Sheet link
 *
 * Paste this into the "Premium Kosher Tours: Client Quotes" sheet:
 * Extensions → Apps Script. See SETUP.md for the step-by-step guide.
 *
 * What it does when the CRM sends a quote:
 *  - Clients tab: adds the quote (or updates it, matched by Quote ID in column A).
 *    Writes only A–F (Quote ID, Client, Trip, Arrival, Departure, People),
 *    plus Added On / Quote PDF / Drive File ID (O–Q) on new rows.
 *  - Tours tab: writes one row per day (A–E) and keeps the Tax / Total / Per Person
 *    formulas (F–H) in place.
 *  - Never touches Status, Deposit Received, Notes or flight info, EXCEPT:
 *    if the sheet total doesn't match the CRM total, Status is set to "Check"
 *    and a note is added to Notes.
 */

// Choose your own private key and type the same key in the CRM (Backup → Google Sheet link).
const SECRET_KEY = 'CHANGE-ME';

// Only needed if you created this script at script.google.com (e.g. on an iPad) instead of
// through the sheet's Extensions menu: paste the sheet's ID here (the long code in the sheet's
// web address between /d/ and /edit).
const SHEET_ID = '';

const CLIENTS_TAB = 'Clients';
const TOURS_TAB = 'Tours';
const CLIENTS_FIRST_ROW = 6;
const TOURS_FIRST_ROW = 2;

function doGet(e) {
  const key = e && e.parameter ? e.parameter.key : '';
  if (SECRET_KEY === 'CHANGE-ME') return json_({ ok: false, error: 'Set SECRET_KEY in the script first, then deploy a new version.' });
  if (key !== SECRET_KEY) return json_({ ok: false, error: 'Wrong key. Check the key in the CRM matches the script.' });
  try {
    return json_({ ok: true, message: 'Connected to "' + book_().getName() + '"' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (SECRET_KEY === 'CHANGE-ME') return json_({ ok: false, error: 'Set SECRET_KEY in the script first, then deploy a new version.' });
    if (data.key !== SECRET_KEY) return json_({ ok: false, error: 'Wrong key. Check the key in the CRM matches the script.' });
    return json_(upsertQuote_(book_(), data.quote));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function upsertQuote_(ss, q) {
  if (!q || !String(q.quoteId || '').trim()) return { ok: false, error: 'The quote has no name.' };
  const quoteId = String(q.quoteId).trim();
  const clients = ss.getSheetByName(CLIENTS_TAB);
  const tours = ss.getSheetByName(TOURS_TAB);
  if (!clients || !tours) return { ok: false, error: 'Could not find the Clients and Tours tabs.' };

  // ── Clients row ──
  const cLast = Math.max(clients.getLastRow(), CLIENTS_FIRST_ROW);
  const cVals = clients.getRange(CLIENTS_FIRST_ROW, 1, cLast - CLIENTS_FIRST_ROW + 1, 2).getValues();
  let row = 0, lastUsed = CLIENTS_FIRST_ROW - 1;
  for (let i = 0; i < cVals.length; i++) {
    const id = String(cVals[i][0]).trim();
    if (id) lastUsed = CLIENTS_FIRST_ROW + i;
    if (id === quoteId) {
      const existingClient = String(cVals[i][1]).trim();
      if (existingClient && q.client && existingClient.toLowerCase() !== String(q.client).trim().toLowerCase()) {
        return { ok: false, error: 'The sheet already has a quote named "' + quoteId + '" for ' + existingClient + '. Rename this quote in the CRM and send it again.' };
      }
      row = CLIENTS_FIRST_ROW + i;
      break;
    }
  }
  const isNew = !row;
  if (isNew) row = lastUsed + 1;

  clients.getRange(row, 1, 1, 6).setValues([[quoteId, q.client || '', q.trip || '', toDate_(q.arrival), toDate_(q.departure), Number(q.pax) || '']]);
  clients.getRange(row, 4, 1, 2).setNumberFormat('mmm d, yyyy');
  if (isNew) {
    clients.getRange(row, 15, 1, 3).setValues([[new Date(), 'Sent from CRM', 'crm-' + (q.crmId || '')]]);
    clients.getRange(row, 15).setNumberFormat('mmm d, yyyy');
  }
  ensureClientFormulas_(clients, row);

  // ── Tours rows ──
  const days = Array.isArray(q.days) ? q.days : [];
  const tLast = Math.max(tours.getLastRow(), TOURS_FIRST_ROW);
  const tIds = tours.getRange(TOURS_FIRST_ROW, 1, tLast - TOURS_FIRST_ROW + 1, 1).getValues().map(r => String(r[0]).trim());
  const existing = [];
  let tLastUsed = TOURS_FIRST_ROW - 1;
  tIds.forEach((id, i) => {
    if (id) tLastUsed = TOURS_FIRST_ROW + i;
    if (id === quoteId) existing.push(TOURS_FIRST_ROW + i);
  });
  let nextFree = tLastUsed + 1;
  days.forEach((d, i) => {
    const r = i < existing.length ? existing[i] : nextFree++;
    tours.getRange(r, 1, 1, 5).setValues([[quoteId, q.client || '', d.date || '', d.activity || '', round2_(d.subtotal)]]);
    setTourFormulas_(tours, r);
  });
  // The quote now has fewer days than before: clear the leftover rows.
  for (let i = days.length; i < existing.length; i++) {
    tours.getRange(existing[i], 1, 1, 5).clearContent();
    setTourFormulas_(tours, existing[i]);
  }

  // ── Check the totals ──
  SpreadsheetApp.flush();
  const sheetTotal = round2_(clients.getRange(row, 10).getValue());
  const crmTotal = round2_(q.total);
  const tolerance = 0.01 + 0.005 * Math.max(days.length, 1); // per-row tax rounding
  const match = Math.abs(sheetTotal - crmTotal) <= tolerance;
  if (!match) {
    clients.getRange(row, 12).setValue('Check');
    const notes = clients.getRange(row, 18);
    const msg = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'MMM d') +
      ' (CRM): CRM total $' + crmTotal.toFixed(2) + ' but sheet total $' + sheetTotal.toFixed(2) +
      '. Check the tax rate in Tours K1 and the day prices.';
    const old = String(notes.getValue() || '').trim();
    notes.setValue(old ? old + ' | ' + msg : msg);
  }

  return {
    ok: true,
    action: isNew ? 'added' : 'updated',
    quoteId: quoteId,
    row: row,
    days: days.length,
    crmTotal: crmTotal,
    sheetTotal: sheetTotal,
    match: match
  };
}

function ensureClientFormulas_(sh, r) {
  const g = sh.getRange(r, 7);
  if (g.getFormula()) return;
  sh.getRange(r, 7, 1, 5).setFormulas([[
    '=IF($A' + r + '="","",COUNTIF(Tours!$A$2:$A,$A' + r + '))',
    '=IF($A' + r + '="","",SUMIF(Tours!$A$2:$A,$A' + r + ',Tours!$E$2:$E))',
    '=IF($A' + r + '="","",SUMIF(Tours!$A$2:$A,$A' + r + ',Tours!$F$2:$F))',
    '=IF($A' + r + '="","",SUMIF(Tours!$A$2:$A,$A' + r + ',Tours!$G$2:$G))',
    '=IF(OR($A' + r + '="",N($F' + r + ')=0),"",ROUND(N(J' + r + ')/F' + r + ',2))'
  ]]);
  sh.getRange(r, 14).setFormula('=IF($A' + r + '="","",N(J' + r + ')-N(M' + r + '))');
}

// The CRM charges 7% on every item, so the Tax column always uses the formula
// (this also replaces a typed 0 left over from an earlier version of the quote).
function setTourFormulas_(sh, r) {
  sh.getRange(r, 6, 1, 3).setFormulas([[
    '=IF(A' + r + '="","",ROUND(N(E' + r + ')*$K$1,2))',
    '=IF(A' + r + '="","",N(E' + r + ')+N(F' + r + '))',
    '=IF(A' + r + '="","",IFERROR(ROUND(G' + r + '/VLOOKUP(A' + r + ',Clients!$A$6:$F,6,FALSE),2),""))'
  ]]);
}

// "2027-01-20" is written as text so Sheets reads it as that calendar date,
// with no time-zone shift between the script and the sheet.
function toDate_(s) {
  return String(s || '').trim();
}

function book_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Paste the sheet ID into SHEET_ID in the script, then deploy a new version.');
  return ss;
}

function round2_(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
