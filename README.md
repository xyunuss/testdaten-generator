# Testdaten-Generator für Girokonto-Transaktionen

**▶ Direkt im Browser öffnen:** https://xyunuss.github.io/testdaten-generator/

**Oder lokal:** `testdaten-generator.html` herunterladen und doppelklicken. Die Datei öffnet sich im Browser (Chrome, Safari, Firefox, Edge).
Es braucht **keine Installation, keinen API-Key und kein Internet**. Alle Daten sind komplett fiktiv.

## So benutzt du es
1. **Kontoinhaber** wählen: Studentin, Angestellter, Familie mit Eigenheim oder Rentnerin
2. **Bank-Format** wählen, also wie die CSV aufgebaut ist
3. **Anzahl Zeilen** und **Zeitraum** einstellen, z. B. 300 Zeilen für 2025
4. **CSV herunterladen**

Die Vorschau aktualisiert sich bei jeder Änderung sofort. Gelbe Hinweise warnen, wenn eine Kombination unrealistisch wird (z. B. 1.000 Buchungen in einem Monat).

| Funktion | Wofür |
|---|---|
| **Seed** | Gleicher Seed + gleiche Einstellungen = exakt dieselbe Datei. So lässt sich ein Fehler im Import nachstellen. 🎲 erzeugt einen neuen Datensatz. |
| **Lösungsschlüssel** | Zweite CSV mit der *Soll-Kategorie* je Zeile, um die Kategorisierung der App automatisch zu prüfen (Treffer zählen). |
| **🔗 Link zum Reproduzieren** | Alle Einstellungen (inkl. Seed und Testfälle) stecken im Link. Fehler gefunden? Link ins Ticket kopieren. Die Kollegin öffnet ihre eigene Kopie des Tools, fügt den Link unter „Link von jemand anderem öffnen“ ein und hat **exakt dieselbe Datei**, auch wenn das Tool bei ihr in einem anderen Ordner liegt. Stammt der Link von einer älteren Tool-Version, erscheint ein Hinweis. |
| **Testfälle einbauen** | Haken setzen, und genau dieses Ereignis kommt in die Daten. **Der restliche Datensatz bleibt identisch**, so lässt sich „mit vs. ohne Testfall“ direkt vergleichen. Die Infobox zeigt, was wo eingebaut wurde, und betroffene Zeilen sind in der Tabelle orange markiert. |
| **Banking-App-Ansicht** | Sieht aus wie ein Handy-Screenshot. Per „Als PDF speichern“ oder per Screenshot simulierst du, dass ein Nutzer ein Bild schickt. |

## Testfälle
| Testfall | Was passiert | Testet z. B. |
|---|---|---|
| 📈 Abo wird teurer | Ein Monatsabo kostet ab der Mitte des Zeitraums mehr (z. B. 11,99 → 13,99 €) | Erkennt der Copilot Preiserhöhungen? |
| ➕ Neues Abo | Ein neues Abo (YouTube, Disney+, Audible, DAZN) startet in der Mitte | Abo-Erkennung ab der 1. bzw. 2. Abbuchung |
| ✂️ Abo gekündigt | Abbuchungen eines Abos hören auf | Wird ein beendetes Abo nicht mehr als laufend angezeigt? |
| 💼 Einkommen ändert sich | Jobwechsel (neuer Arbeitgeber, neue IBAN, +8 %), bei Rentnerin Rentenanpassung | Gehaltserkennung trotz neuer Gegenstelle |
| ↩️ Rücklastschrift | Eine Lastschrift wird per Widerspruch zurückgeholt (Gutschrift, Grund MD06) | Wird die Ausgabe neutralisiert statt doppelt gezählt? |
| 🧾 Kartenzahlung storniert | Einkauf + Gutschrift über denselben Betrag | Erkennung von Erstattungen |
| 💱 Fremdwährung | Kartenzahlung in USD/GBP/CHF (Betrag + Kurs im Verwendungszweck) + 1,75 % Auslandseinsatzentgelt | Parser für Verwendungszweck, Gebühren-Kategorie |
| 🗂️ Alter Bank-Export | Datei in Windows-1252 statt UTF-8, Zeilenende CRLF | Encoding-Erkennung im Import (Umlaute, €) |

Im Lösungsschlüssel steht bei jeder betroffenen Zeile in der Spalte „Testfall“, was dort passiert. Die Zeilenzahl bleibt exakt: Für zusätzliche Testfall-Zeilen fallen die zuletzt erzeugten Alltagsbuchungen weg.

## Was den Datensatz realistisch macht
- **Fixkosten an festen Tagen:** Gehalt am letzten Bankarbeitstag, Miete am 1., Abos und Versicherungen mit festem Betrag, Rundfunkbeitrag quartalsweise, Kfz-Versicherung jährlich, Weihnachtsgeld im November
- **Bankarbeitstage:** Fällt ein Termin aufs Wochenende oder einen Feiertag (inkl. Ostern/Pfingsten), wird am nächsten Bankarbeitstag gebucht. Kartenzahlungen werden oft einen Tag später gebucht (Valuta ≠ Buchungsdatum).
- **Alltag:** Beträge sind schief verteilt (viele kleine, wenige große Einkäufe). Jede Person hat einen Lieblingssupermarkt. Freitag und Samstag wird mehr gekauft, sonntags haben Supermärkte zu (Bäcker, Café und Tankstelle nicht).
- **Personas unterscheiden sich** in Einkommen (BAföG + Minijob, Gehalt, zwei Gehälter + Kindergeld, Rente), Fixkosten (WG-Miete, Kredit + Grundsteuer, Kita, Tageszeitung …) und im Händler-Mix (Mensa und Lieferdienst, Baumarkt und Spielzeug, Apotheke und Bargeld)
- **Budget-Kalibrierung:** Die Alltagsausgaben passen grob zum Einkommen, damit der Kontostand nicht unrealistisch wächst oder schrumpft
- **Echte Formate:** Gültige IBAN-Prüfziffern, SEPA-Mandatsreferenzen und Gläubiger-IDs. Eine Gegenstelle hat jeden Monat dieselbe IBAN und Kundennummer. Gelegentlich gibt es Rücksendungen (Gutschrift) und Überweisungen unter Freunden.

## Bank-Formate
| Format | Merkmale |
|---|---|
| Beispielbank | **exakt wie die mitgeschickte Beispiel-CSV:** 18 Spalten, `;`, Dezimalpunkt, UTF-8 |
| Sparkasse-Stil (CSV-CAMT V2) | alle Felder in Anführungszeichen, Datum `TT.MM.JJ`, Dezimalkomma, Buchungstext wie `FOLGELASTSCHRIFT` |
| DKB-Stil | Kopfbereich mit Kontostand vor der Tabelle, Zahlungspflichtige*r/Empfänger*in getrennt |
| ING-Stil | langer Kopfbereich, Tausenderpunkt, laufender Saldo in jeder Zeile |

## Tests
```bash
node tests/run-tests.js
```
Es braucht nur Node.js und keine weitere Installation. Die Tests laden den Generator direkt aus der HTML-Datei, geprüft wird also genau der Code, den die Nutzerin benutzt. 28 Prüfungen über 4 Personas × 6 Szenarien × 4 Formate, darunter: exakte Zeilenzahl, keine Wochenendbuchungen, gültige IBANs, Kopfzeile identisch mit der Beispiel-CSV, Saldo geht auf, gleicher Seed ergibt dieselbe Datei, jeder Testfall verändert nur seine eigenen Zeilen.
