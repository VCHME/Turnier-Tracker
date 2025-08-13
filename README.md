# VCHME Turnier-Tracker (WordPress Plugin)

Version: 1.3.3  
Datum: 2025-08-13

Dieses Repository enthält das WordPress-Plugin **vchme-tournament-tracker** (Gruppenphase + KO).

## Installation (WordPress)
1. Ordner `vchme-tournament-tracker` als ZIP packen (oder die bereits erzeugte ZIP benutzen) und in WordPress unter **Plugins → Installieren → Plugin hochladen** installieren.
2. Plugin **aktivieren**.
3. Eine Seite mit folgendem Shortcode anlegen:
   ```
   [tournament_tracker id="beach2025"]
   ```

## Push zu GitHub

### Schnellstart (macOS/Linux)
```bash
./push.sh https://github.com/VCHME/Turnier-Tracker.git "Version 1.3.3"
```

### Schnellstart (Windows PowerShell)
```powershell
./push.ps1 -Remote "https://github.com/VCHME/Turnier-Tracker.git" -Message "Version 1.3.3"
```

### Manuell (alle Plattformen)
```bash
git init
git branch -M main
git remote add origin https://github.com/VCHME/Turnier-Tracker.git
git add .
git commit -m "Version 1.3.3"
git push -u origin main
```

> Hinweis: Falls dein Default-Branch `master` ist, ersetze oben `main` durch `master`.

## Ordnerstruktur
```
Turnier-Tracker/
└── vchme-tournament-tracker/
    ├── vchme-tournament-tracker.php
    └── assets/
        ├── app.v133.js
        └── style.v133.css
```

## Changelog
- **1.3.3**
  - Reines ES5 JavaScript (keine shorthand-Property-Initializers, keine nullish-Operatoren, keine trailing commas).
  - Alle Formfelder mit `id`/`name`.
  - Gruppenphase: Planung nach Runden & Courts, „Abgeschlossen“ oben, „Nächste Spiele“ unten.
  - KO-Phase: Play‑In (bei ungerader Teilnehmerzahl), Viertel/Halb/Finale + Bronze; Courts für SF/Finale = Platz 1.
  - Rangliste nach Bronze/Finale.

## Lizenz
© 2025 VCHME. Alle Rechte vorbehalten.
