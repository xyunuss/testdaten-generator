# Case: Testdaten-Generator – Planung

## Ziel
Eine Produktmanagerin (keine Entwicklerin) kann **selbstständig** realistische Girokonto-Transaktionen als CSV erzeugen,
um den Datei-Import und die Kategorisierung der Copilot-App zu testen – ohne echte Nutzerdaten.

## Input (was die Nutzerin einstellt)
- Anzahl Zeilen (z. B. 50, 300)
- Zeitraum (von / bis, z. B. 2025)
- Bank-Format (Export-Layout verschiedener Banken)
- *Nice-to-have:* Persona (Studentin, Angestellter, Familie mit Eigenheim, Rentner)
- *Nice-to-have:* Seed → gleiche Einstellungen = gleiche Datei (reproduzierbare Tests)

## Gewünschter Output
- CSV-Datei, die aussieht wie ein echter Bank-Export (Spalten, Trennzeichen, Datums-/Zahlenformat, Kopfzeilen)
- Referenz-Format = Beispiel-CSV (18 Spalten, `;`, Datum `TT.MM.JJJJ`, Dezimalpunkt, neueste Buchung zuerst)
- *Nice-to-have:* Ansicht „Banking-App-Screenshot“ → als PDF/PNG speicherbar

## Wichtigste Annahmen
- Nutzerin will **nichts installieren** und **keinen API-Key** brauchen → läuft im Browser, per Doppelklick
- Realismus kommt aus **Regeln**, nicht aus einem LLM: feste Termine (Miete am 1., Gehalt am Monatsende),
  wiederkehrende Abos mit festem Betrag, variable Beträge im Alltag, plausible Händler, Wochenend-Muster
- Fiktive Gegenstellen-IBANs mit **gültiger Prüfziffer** (der Import validiert sie evtl.), aber keine echten Konten
- Echte Händlernamen (ALDI, REWE …) sind ok – die Beispiel-CSV macht das auch; Personen/Firmen = „Beispiel …“
- Andere Bank-Formate sind **an öffentlich bekannte Exporte angelehnt**, aber nicht 1:1 gegen echte Dateien geprüft

## Entscheidung: Werkzeug
| Option | Pro | Contra |
|---|---|---|
| **Eine HTML-Datei (JS im Browser)** ✅ | kein Install, kein Key, offline, Formular-UI, sofort teilbar | Logik im Browser, kein zentrales Deployment |
| n8n-Workflow (Form Trigger → Code → CSV) | passt zur Taskforce, Formular als Link | braucht eine n8n-Instanz bei Finanzfluss; meine Instanz ist nicht ihre |
| Python-Skript | schnell gebaut | Nicht-Entwicklerin müsste Python + Terminal nutzen |
| LLM generiert Zeilen | viel Abwechslung | Key nötig, nicht deterministisch, langsam/teuer bei 300+ Zeilen, Zahlen unzuverlässig |

→ **HTML-Tool als Kern.** Die Generator-Logik ist reines JS und kann später 1:1 in einen n8n-Code-Node wandern.

## Minimalversion (MVP – muss bis Abgabe laufen)
1. HTML-Formular: Zeilen, Zeitraum, Format → „CSV herunterladen“
2. Format „Beispielbank“ exakt wie die Beispiel-CSV
3. Regelbasierter Generator: Gehalt, Miete, Strom, Abos, Supermarkt, Café, Tanken, Drogerie, Online-Shopping
4. Vorschau der ersten Zeilen im Browser

## Ausbaustufen (in dieser Reihenfolge)
1. Personas (Studentin / Angestellter / Familie / Rentner) mit eigenem Einkommen, Miete, Händler-Mix
2. Weitere Bank-Formate (z. B. Sparkasse CAMT, DKB, ING – andere Spalten, Komma-Dezimal, Kopfzeilen)
3. Seed für Reproduzierbarkeit
4. Banking-App-Ansicht → Screenshot/PDF über Druckdialog
5. Optional: n8n-Wrapper mit derselben Logik

## Mögliche Fehlerfälle / Risiken
- Zeitraum ungültig (bis < von) oder sehr kurz bei vielen Zeilen → Validierung + Hinweis
- Zeilenanzahl ≠ gewünscht, weil Fixkosten pro Monat feststehen → Fixkosten zuerst, Rest mit Alltagsbuchungen auffüllen, exakt kürzen
- Encoding: Umlaute in Excel kaputt → UTF-8 mit BOM
- Dezimal-/Trennzeichen pro Format falsch → pro Format konfigurieren
- Kontostand wird negativ / unrealistisch → Persona-Budget so wählen, dass das Konto grob aufgeht
- Fremdwährung, Rückbuchungen, Storno: bewusst **nicht** im MVP (später als Edge-Case-Schalter)

## Zeitplan (105 min)
- 0–10 Planung (diese Datei)
- 10–55 MVP bauen + testen
- 55–85 Personas + weitere Formate
- 85–95 Banking-App-Ansicht (falls Zeit)
- 95–105 README, Abgabe-Mail

## Entscheidungs-Log (für das Gespräch)
- **HTML statt n8n:** Die Nutzerin soll das Tool ohne mich und ohne Zugang zu irgendeiner Instanz nutzen. n8n wäre mein Lieblingswerkzeug, passt hier aber nicht zum Nutzer. Die Logik ist trotzdem n8n-fähig (reines JS ohne DOM).
- **Regeln statt LLM:** Für Testdaten brauche ich Kontrolle: exakte Zeilenzahl, gültige IBANs, reproduzierbar per Seed, kein Key. Ein LLM wäre bei 300+ Zeilen langsam und teuer, und Summen wären unzuverlässig. Gut wäre ein LLM später für mehr Vielfalt bei Händlernamen und Verwendungszwecken, als Liste vorab generiert, nicht pro Lauf.
- **Lösungsschlüssel:** Die Aufgabe erwähnt „prüfen, ob richtig kategorisiert wird“. Dafür braucht man eine Soll-Kategorie. Banken exportieren keine Kategorie, deshalb steht sie in einer separaten Datei.
- **Zeilenzahl ist heilig:** Die Nutzerin will „300 Zeilen“, also kommen exakt 300. Wenn das mit dem Zeitraum unrealistisch wird, warnt das Tool, statt still etwas anderes zu liefern.

- **Bonus 1, Link zum Reproduzieren:** Seed allein reicht im Alltag nicht, die Nutzerin muss den Zustand *weitergeben* können (Bug-Ticket). Deshalb steht jede Einstellung im Link, plus Versionsnummer, damit ein alter Link nach einem Update nicht still andere Daten liefert. Das Einfüge-Feld gibt es, weil eine lokale Datei bei jedem einen anderen Pfad hat.
- **Bonus 2, Testfälle:** Die Nutzerin will meist *etwas Bestimmtes* testen, nicht „zufällige Daten“. Wichtigste Designentscheidung: Jeder Testfall hat einen eigenen Zufallsstrom. Ein Haken verändert nur genau dieses Ereignis, der Rest bleibt identisch. Nur so ist ein Vorher/Nachher-Vergleich möglich.

## Hürden beim Bauen (und Lösung)
1. **Leere Mandatsreferenz bei Lastschriften:** Die Gegenstelle wurde zuerst beim Verwendungszweck (Kundennummer) angelegt, noch ohne SEPA-Daten, und danach aus dem Cache gelesen. → Stammdaten immer vollständig anlegen, je Buchungsart filtern. Gefunden durch einen Test-Durchlauf über alle 64 Kombinationen.
2. **Kontostand wuchs unrealistisch:** Bei 15–25 Buchungen pro Monat stehen den Fixkosten zu wenige Alltagsausgaben gegenüber, also +2.000 €/Monat bei der Familie. → Monatsbudget je Persona, große Einkäufe werden in Grenzen (×0,6–2) skaliert, Kaffee und Bargeld bleiben unverändert. Zusätzlich ein Hinweis bei geringer Dichte.
3. **Buchungen nach dem Enddatum:** Eine Kartenzahlung am Freitag wird erst am Montag gebucht und lag damit außerhalb des gewählten Zeitraums. → Auf das Enddatum begrenzen. Gefunden in der Browser-Vorschau.

4. **Testfälle hätten den ganzen Datensatz verändert:** Alle Zufallswerte kommen aus einer Kette. Jeder zusätzliche Zufallswurf verschiebt alles danach, sodass ein Haken andere Beträge überall erzeugt hätte. → Eigener Zufallsstrom je Testfall, Kontodaten vor den Testfällen festgelegt, und für Testfall-Zeilen fallen die *zuletzt erzeugten* Alltagsbuchungen weg (nicht zufällige). Per Test geprüft: Alle nicht betroffenen Zeilen sind identisch mit dem Basisdatensatz.

5. **Buchung an einem Sonntag:** Endete der Zeitraum an einem Sonntag, wurden Kartenzahlungen vom Wochenende auf genau diesen Sonntag gezogen. Das war ein Nebeneffekt des Fixes aus Hürde 3. → Auf den letzten Bankarbeitstag im Zeitraum begrenzen. Gefunden durch den neuen Test „Keine Buchung am Wochenende“ mit dem Szenario „Start Samstag, Ende Sonntag“.
- **Entscheidung beim Testen:** Passen *alle* Testfälle nicht in sehr wenige Zeilen (z. B. 5), haben die angehakten Testfälle Vorrang vor der Zeilenzahl, und das Tool warnt sichtbar. Ein still verschluckter Testfall wäre schlimmer.

## Getestet
- **`node tests/run-tests.js`**: 28 Prüfungen, alle grün (siehe README).
- Node-Test: 4 Personas × 4 Formate × 4 Szenarien (50 / 300 / 5 / 1.000 Zeilen). Geprüft werden exakte Zeilenzahl, IBAN-Prüfziffer (mod 97), 18 Spalten im Beispielformat, Reproduzierbarkeit per Seed und Datumsvalidierung.
- Testfälle: 4 Personas × 4 Szenarien × (jeder Testfall einzeln + alle zusammen). Geprüft werden exakte Zeilenzahl, Zeitraum, keine `undefined`/`NaN` in allen Formaten und dass unbetroffene Zeilen unverändert bleiben.
- Link: Einstellungen verstellt → Link mit fremdem Pfad geladen → CSV byte-identisch. Alter Versions-Link → Warnung.
- Browser: Vorschau, CSV-Rohtext, App-Ansicht, keine Konsolenfehler.
