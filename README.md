# Notizen

Notizen-App mit Ordnern, Kalender, Zeichnungen, Audio-Notizen, Zeitplänen und
Erinnerungen, die auch bei geschlossener App als Push-Benachrichtigung ankommen.

## Architektur: bewusst zweigeteilt

Diese App läuft **hybrid** auf zwei Anbietern, weil sie zwei unterschiedliche
Dinge braucht:

| Was | Wo | Warum |
|---|---|---|
| App selbst (`index.html`, `sw.js`, Icons) | **GitHub Pages** | Rein statische Dateien, kostenlos & zeitlich unbegrenzt hostbar |
| Erinnerungs-Funktionen (`check.mjs`, `save.mjs`) | **Netlify** (`maximusprime-notes.netlify.app`) | Brauchen einen echten Server: `check.mjs` läuft jede Minute im Hintergrund und verschickt fällige Push-Benachrichtigungen — das kann GitHub Pages als reines Static Hosting nicht |

Der Code für die Funktionen liegt **nicht** in diesem Repository, sondern im
separaten, privaten Repo `notizen` (Netlify-verbunden, deployt automatisch bei
jedem Push dorthin).

Die einzige Verbindung zwischen beiden Seiten ist eine einzelne Konstante in
`index.html`:

```js
const PUSH_URL='https://maximusprime-notes.netlify.app/.netlify/functions/save';
```

Die Funktion `save.mjs` erlaubt Anfragen von jeder Herkunft
(`access-control-allow-origin: "*"`), deshalb funktioniert der Aufruf von
GitHub Pages aus ohne weitere Einrichtung.

**Warum diese Aufteilung?** Vorher lief die komplette App (Seite *und*
Funktionen) auf Netlify. Weil `sw.js` die Seite bei jeder Nutzung frisch vom
Netz lädt (network-first, damit Updates sofort ankommen), zählte jeder
App-Start als Netlify-Traffic — das lief irgendwann gegen das kostenlose
Kontingent. Nur die Erinnerungs-Funktionen brauchen wirklich einen Server;
die App selbst nicht.

## Lokal starten

```bash
python -m http.server 8322
```

Dann `http://localhost:8322` öffnen. Die Erinnerungs-Funktionen laufen dabei
weiterhin gegen die echte, produktive Netlify-Adresse — es gibt keine lokale
Version davon. Zum Testen der reinen Notizfunktionen (ohne Erinnerungen)
reicht das trotzdem aus.

## Deployen

```bash
git add -A
git commit -m "Kurze Beschreibung der Änderung"
git push
```

GitHub Pages baut die Seite nach jedem Push automatisch neu (dauert ca. 1–2
Minuten). Der Service Worker erkennt neue Versionen automatisch beim nächsten
App-Start, weil die Seite selbst immer frisch vom Netz geladen wird.

## Wenn sich an den Erinnerungs-Funktionen etwas ändern muss

Das betrifft **nicht** dieses Repository, sondern das separate `notizen`-Repo
mit dem `netlify/functions/`-Ordner. Änderungen dort werden automatisch von
Netlify deployt, sobald sie gepusht werden.

## Daten

Alle Notizen liegen ausschließlich lokal auf dem Gerät (`localStorage` +
`IndexedDB` für Bilder/Audio/Zeichnungen) — nicht auf einem Server. Nur wenn
Erinnerungen aktiviert werden, verlässt eine kleine Datenmenge (Gerätekennung,
Push-Adresse, Titel/Zeitpunkt der Termine mit Erinnerung) das Gerät und wird
bei Netlify gespeichert, damit `check.mjs` sie jede Minute prüfen kann.
