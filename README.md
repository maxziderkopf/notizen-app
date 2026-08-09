# Notizen

Notizen-App mit Ordnern, Kalender, Zeichnungen, Audio-Notizen, Zeitplänen und
Erinnerungen, die auch bei geschlossener App als Push-Benachrichtigung ankommen.

## Architektur: bewusst zweigeteilt

Diese App läuft **hybrid** auf zwei Anbietern, weil sie zwei unterschiedliche
Dinge braucht:

| Was | Wo | Warum |
|---|---|---|
| App selbst (`index.html`, `sw.js`, Icons) | **GitHub Pages** | Rein statische Dateien, kostenlos & zeitlich unbegrenzt hostbar |
| Erinnerungs-Funktionen | **Cloudflare Workers** (`notizen-erinnerungen.3dacceleration.workers.dev`) | Braucht einen echten Server: läuft jede Minute im Hintergrund und verschickt fällige Push-Benachrichtigungen — das kann GitHub Pages als reines Static Hosting nicht |

Der Code für das Erinnerungs-Backend liegt **nicht** in diesem Repository,
sondern im separaten Repo `notizen-erinnerungen` (Cloudflare-Worker-Projekt,
`wrangler deploy`).

Die einzige Verbindung zwischen beiden Seiten sind zwei Konstanten in
`index.html`:

```js
const VAPID='BN8H...';       // muss zum Schlüsselpaar des Workers passen
const PUSH_URL='https://notizen-erinnerungen.3dacceleration.workers.dev/';
```

Der Worker erlaubt Anfragen von jeder Herkunft
(`access-control-allow-origin: "*"`), deshalb funktioniert der Aufruf von
GitHub Pages aus ohne weitere Einrichtung.

### Vorgeschichte

Ursprünglich liefen App *und* Erinnerungs-Funktionen zusammen auf Netlify.
Weil `sw.js` die Seite bei jeder Nutzung frisch vom Netz lädt (network-first,
damit Updates sofort ankommen), zählte jeder App-Start als Netlify-Traffic —
das lief irgendwann gegen das kostenlose Kontingent, bis Netlify die
**komplette Domain** mit einer Login-Sperre (HTTP 401, auch auf den
Funktionen) blockierte. Da GitHub Pages für reines Hosting kein Kontingent
kennt und Cloudflare Workers einen großzügigen kostenlosen Cron-Trigger ohne
diese Sperr-Problematik bietet, wurden beide Teile dorthin umgezogen.

## Lokal starten

```bash
python -m http.server 8322
```

Dann `http://localhost:8322` öffnen. Die Erinnerungs-Funktionen laufen dabei
weiterhin gegen den echten, produktiven Cloudflare Worker — es gibt keine
lokale Version davon. Zum Testen der reinen Notizfunktionen (ohne
Erinnerungen) reicht das trotzdem aus.

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

Das betrifft **nicht** dieses Repository, sondern das separate
`notizen-erinnerungen`-Repo. Änderungen dort werden per
`npx wrangler deploy` veröffentlicht (siehe README dort).

## Daten

Alle Notizen liegen ausschließlich lokal auf dem Gerät (`localStorage` +
`IndexedDB` für Bilder/Audio/Zeichnungen) — nicht auf einem Server. Nur wenn
Erinnerungen aktiviert werden, verlässt eine kleine Datenmenge (Gerätekennung,
Push-Adresse, Titel/Zeitpunkt der Termine mit Erinnerung) das Gerät und wird
in Cloudflare KV gespeichert, damit der Worker sie jede Minute prüfen kann.
