// Tests für den Testdaten-Generator. Starten mit:  node tests/run-tests.js
// Keine Installation nötig. Der Generator wird direkt aus der HTML-Datei geladen,
// getestet wird also genau der Code, den die Nutzerin im Browser benutzt.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'testdaten-generator.html'), 'utf8');
const code = html.match(/<script id="generator">([\s\S]*?)<\/script>/)[1];
const g = { module: { exports: {} } };
vm.runInNewContext(code, g);
const { generate, toCsv, toSolutionKey, toLegacyBytes, PERSONAS, FORMATS, EVENTS, mod97 } = g.module.exports;

// ---------- Mini-Testframework ----------
let passed = 0, failed = 0;
function test(name, fn) {
  const errors = [];
  fn((cond, msg) => { if (!cond && errors.length < 3) errors.push(msg); });
  if (errors.length) { failed++; console.log(`  ✗ ${name}`); errors.forEach(e => console.log(`      → ${e}`)); }
  else { passed++; console.log(`  ✓ ${name}`); }
}

// ---------- Testmatrix ----------
const PERSONA_KEYS = Object.keys(PERSONAS);
const FORMAT_KEYS = Object.keys(FORMATS);
const EVENT_KEYS = Object.keys(EVENTS);
const SCENARIOS = [
  { name: '50 Zeilen, 3 Monate', rows: 50, from: '2026-04-01', to: '2026-07-10' },
  { name: '300 Zeilen, Jahr 2025', rows: 300, from: '2025-01-01', to: '2025-12-31' },
  { name: '5 Zeilen, halbes Jahr', rows: 5, from: '2025-01-01', to: '2025-06-30' },
  { name: '1000 Zeilen, 1 Monat', rows: 1000, from: '2026-06-01', to: '2026-06-30' },
  { name: 'Start Samstag, Ende Sonntag', rows: 120, from: '2025-02-15', to: '2025-05-18' },
  { name: 'Über Ostern + Jahreswechsel', rows: 200, from: '2025-12-01', to: '2026-04-30' },
];
const all = [];
for (const persona of PERSONA_KEYS) for (const s of SCENARIOS) {
  all.push({ persona, ...s, res: generate({ persona, rows: s.rows, from: s.from, to: s.to, seed: 'test' }) });
}
const D = s => new Date(s + 'T00:00:00Z');
const isWeekend = d => d.getUTCDay() === 0 || d.getUTCDay() === 6;
const fmt = d => d.toISOString().slice(0, 10);
const label = c => `${c.persona} / ${c.name}`;

console.log(`\nTestdaten-Generator – ${PERSONA_KEYS.length} Personas × ${SCENARIOS.length} Szenarien × ${FORMAT_KEYS.length} Formate\n`);

console.log('Grundregeln');
test('Exakt so viele Zeilen wie gewünscht', ok => {
  for (const c of all) ok(c.res.txs.length === c.rows, `${label(c)}: ${c.res.txs.length} statt ${c.rows}`);
});
test('Alle Buchungen liegen im gewählten Zeitraum', ok => {
  for (const c of all) for (const t of c.res.txs) ok(t.booking >= D(c.from) && t.booking <= D(c.to), `${label(c)}: Buchung am ${fmt(t.booking)}`);
});
test('Keine Buchung am Wochenende (Banken buchen nur werktags)', ok => {
  for (const c of all) for (const t of c.res.txs) ok(!isWeekend(t.booking), `${label(c)}: ${t.cp} am ${fmt(t.booking)}`);
});
test('Valuta nie nach dem Buchungsdatum', ok => {
  for (const c of all) for (const t of c.res.txs) ok(t.valuta <= t.booking, `${label(c)}: ${t.cp} Valuta ${fmt(t.valuta)} > Buchung ${fmt(t.booking)}`);
});
test('Beträge sind ganze Cent und nie 0', ok => {
  for (const c of all) for (const t of c.res.txs) ok(Number.isInteger(t.cents) && t.cents !== 0, `${label(c)}: ${t.cp} = ${t.cents}`);
});
test('Alle IBANs haben eine gültige Prüfziffer (mod 97)', ok => {
  for (const c of all) for (const ib of [c.res.meta.iban, ...c.res.txs.map(t => t.iban).filter(Boolean)]) {
    ok(/^DE\d{20}$/.test(ib) && mod97(ib.slice(4) + '1314' + ib.slice(2, 4)) === 1, `${label(c)}: ${ib}`);
  }
});
test('Lastschriften haben Mandatsreferenz und Gläubiger-ID, Karten nicht', ok => {
  for (const c of all) for (const t of c.res.txs) {
    if (t.kind === 'debit' || t.kind === 'online') ok(t.mandate && t.creditorId, `${label(c)}: ${t.cp} ohne Mandat`);
    if (t.kind === 'card') ok(!t.mandate && !t.iban, `${label(c)}: Karte ${t.cp} mit SEPA-Daten`);
  }
});
test('Laufender Saldo geht auf (Start + alle Buchungen = Endstand)', ok => {
  for (const c of all) {
    const sum = c.res.txs.reduce((s, t) => s + t.cents, 0);
    ok(c.res.meta.startBalance + sum === c.res.meta.endBalance, label(c));
    ok(c.res.txs[0].balance === c.res.meta.endBalance, `${label(c)}: Saldo der neuesten Zeile ≠ Endstand`);
  }
});

console.log('\nFormate');
test('Beispielbank: Kopfzeile identisch mit der Beispiel-CSV aus dem Anhang', ok => {
  // Kopfzeile 1:1 aus der Beispiel-CSV, die der Aufgabe beilag
  const sampleHead = 'Wertstellungsdatum;Buchungsdatum;Betrag;Steuerbetrag;Währung;Zweck;Gegenstelle;IBAN der Gegenstelle;BIC der Gegenstelle;BLZ der Gegenstelle;Bankname der Gegenstelle;Mandatsreferenz der Gegenstelle;Kundenreferenz der Gegenstelle;Gläubiger-ID der Gegenstelle;Transaktionstyp;ZKA-Code;SWIFT-Nachrichtentyp;Kommentar';
  for (const c of all) ok(toCsv(c.res, 'beispielbank').split('\n')[0] === sampleHead, label(c));
});
test('Beispielbank: jede Zeile hat genau 18 Spalten', ok => {
  for (const c of all) toCsv(c.res, 'beispielbank').trim().split('\n').forEach((l, i) => ok(l.split(';').length === 18, `${label(c)} Zeile ${i + 1}`));
});
test('Beispielbank: Datum TT.MM.JJJJ und Dezimalpunkt wie im Original', ok => {
  for (const c of all) toCsv(c.res, 'beispielbank').trim().split('\n').slice(1).forEach(l => {
    const f = l.split(';');
    ok(/^\d{2}\.\d{2}\.\d{4}$/.test(f[0]) && /^-?\d+\.\d{2}$/.test(f[2]), `${label(c)}: ${f[0]} / ${f[2]}`);
  });
});
test('Kein „undefined“ oder „NaN“ in irgendeinem Format', ok => {
  for (const c of all) for (const f of FORMAT_KEYS) ok(!/undefined|NaN/.test(toCsv(c.res, f)), `${label(c)} / ${f}`);
});
test('Neueste Buchung steht oben (wie bei Bank-Exporten)', ok => {
  for (const c of all) c.res.txs.forEach((t, i, a) => i && ok(a[i - 1].booking >= t.booking, `${label(c)} Zeile ${i}`));
});

console.log('\nReproduzierbarkeit (Seed)');
test('Gleicher Seed + gleiche Einstellungen = byte-identische Datei', ok => {
  for (const f of FORMAT_KEYS) {
    const p = { persona: 'familie', rows: 150, from: '2025-03-01', to: '2025-08-31', seed: 'abc', events: ['storno'] };
    ok(toCsv(generate(p), f) === toCsv(generate(p), f), f);
  }
});
test('Anderer Seed = andere Datei', ok => {
  const p = { persona: 'familie', rows: 150, from: '2025-03-01', to: '2025-08-31' };
  ok(toCsv(generate({ ...p, seed: 'a' }), 'beispielbank') !== toCsv(generate({ ...p, seed: 'b' }), 'beispielbank'), 'Seeds a und b liefern dieselbe Datei');
});

console.log('\nTestfälle');
const key = t => [+t.booking, t.cp, t.cents, t.purpose || ''].join('|');
for (const ev of EVENT_KEYS) {
  test(`${EVENTS[ev].label}: eingebaut, Zeilenzahl exakt, Rest unverändert`, ok => {
    for (const persona of PERSONA_KEYS) {
      const p = { persona, rows: 150, from: '2026-01-01', to: '2026-06-30', seed: 'test' };
      const base = generate(p), r = generate({ ...p, events: [ev] });
      const baseKeys = new Set(base.txs.map(key));
      ok(r.txs.length === 150, `${persona}: ${r.txs.length} Zeilen`);
      ok(r.txs.some(t => t.event), `${persona}: keine Testfall-Zeile markiert`);
      ok(r.evInfo.length === 1, `${persona}: keine Info zum Testfall`);
      // Bei Kündigung fallen Abbuchungen weg und gleich viele Alltagsbuchungen rücken nach
      const allowed = ev === 'abo_weg' ? base.txs.filter(t => t.fixed).length - r.txs.filter(t => t.fixed).length : 0;
      const changed = r.txs.filter(t => !t.event && !baseKeys.has(key(t))).length;
      ok(changed === allowed, `${persona}: ${changed} unbeteiligte Zeilen verändert (erlaubt: ${allowed})`);
    }
  });
}
test('Alle Testfälle gleichzeitig: Zeilenzahl exakt (oder sichtbare Warnung), Saldo geht auf', ok => {
  for (const persona of PERSONA_KEYS) for (const s of SCENARIOS) {
    const r = generate({ persona, rows: s.rows, from: s.from, to: s.to, seed: 'test', events: EVENT_KEYS });
    const sum = r.txs.reduce((a, t) => a + t.cents, 0);
    // Angehakte Testfälle haben Vorrang: Passen sie nicht in die Zeilenzahl, muss das Tool warnen
    const warned = r.warnings.some(w => w.includes('mindestens'));
    ok(r.txs.length === s.rows || warned, `${persona} / ${s.name}: ${r.txs.length} statt ${s.rows} ohne Warnung`);
    ok(r.meta.startBalance + sum === r.meta.endBalance, `${persona} / ${s.name}: Saldo`);
  }
});
test('Rücklastschrift = exakt der Gegenbetrag der Original-Lastschrift', ok => {
  for (const persona of PERSONA_KEYS) {
    const r = generate({ persona, rows: 150, from: '2026-01-01', to: '2026-06-30', seed: 'test', events: ['ruecklastschrift'] });
    const back = r.txs.find(t => t.event === 'Rücklastschrift'), orig = r.txs.find(t => t.event === 'Lastschrift (später zurückgegeben)');
    ok(back && orig && back.cents === -orig.cents && back.cp === orig.cp && back.booking > orig.booking, persona);
  }
});
test('Lösungsschlüssel: gleiche Zeilen in gleicher Reihenfolge wie die CSV', ok => {
  const r = generate({ persona: 'studentin', rows: 80, from: '2026-01-01', to: '2026-03-31', seed: 'k', events: ['storno'] });
  const csv = toCsv(r, 'beispielbank').trim().split('\n').slice(1), keyRows = toSolutionKey(r, 'studentin').trim().split('\n').slice(1);
  ok(csv.length === keyRows.length, 'Zeilenzahl');
  csv.forEach((l, i) => { const a = l.split(';'), b = keyRows[i].split(';'); ok(a[1] === b[1] && a[2] === b[2] && a[6] === b[3], `Zeile ${i + 1}`); });
});
test('Alter Bank-Export: Windows-1252 (ä = E4, € = 80) und CRLF', ok => {
  const b = toLegacyBytes('Gläubiger €\n');
  ok(b[2] === 0xE4 && b[10] === 0x80 && b[11] === 0x0D && b[12] === 0x0A, [...b].map(x => x.toString(16)).join(' '));
});

console.log('\nEingaben prüfen');
test('Enddatum vor Startdatum wird abgelehnt', ok => ok(generate({ persona: 'familie', rows: 10, from: '2025-03-01', to: '2025-02-01', seed: 'a' }).error, 'kein Fehler'));
test('0 oder 6.000 Zeilen werden abgelehnt', ok => {
  for (const rows of [0, 6000]) ok(generate({ persona: 'familie', rows, from: '2025-01-01', to: '2025-02-01', seed: 'a' }).error, `${rows} angenommen`);
});

console.log(`\n${failed ? '❌' : '✅'} ${passed} bestanden, ${failed} fehlgeschlagen\n`);
process.exit(failed ? 1 : 0);
