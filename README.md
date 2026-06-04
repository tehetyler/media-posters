# Media Artwork Manager

A locally-hosted web app for reviewing and selecting artwork for your movie and TV show libraries. It scans your movie library for NFO files written by TinyMediaManager and your TV show directory for season folders, fetches poster, backdrop, clearlogo, and season poster options from TMDB, and lets you select and download artwork directly into each folder.

## Features

### Movies
- Scans movie directories recursively for `.nfo` files written by TinyMediaManager
- Fetches poster, backdrop, and clearlogo options from TMDB
- Downloads selected artwork directly to each movie's folder
- Tracks review status per movie in SQLite

### TV Shows
- Scans TV show directory for show folders and detects season subfolders automatically
- Auto-matches shows to TMDB by title/year (configurable confidence threshold)
- Fetches series poster, background, clearlogo, and per-season poster options from TMDB
- "Fix Match" button to correct or change the TMDB match for any show
- Season poster sections hidden for shows with no season subfolders
- Resets shows to pending when new seasons are detected on rescan
- Removes stale DB entries when shows/movies are deleted from disk

### General
- Currently-on-disk artwork shown alongside TMDB options for reference
- Library browser with search, sort, and filter by status
- PWA — installable on mobile devices
- Accessible from other devices on the local network
- Options page with force sync and mark-skipped-as-reviewed for both movies and TV

## Requirements

- Node.js v22 or later
- A TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/settings/api))
- Movies must have `.nfo` files written by TinyMediaManager (or any Kodi-compatible scraper)

## Setup

**1. Clone the repo**
```
git clone https://github.com/tehetyler/media-posters.git
cd media-posters
```

**2. Create `server/.env`**
```
MOVIE_DIR=D:\path\to\your\movies
TV_SHOW_DIR=D:\path\to\your\tv shows
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3001
TV_MATCH_MIN_POPULARITY=5
```

**3. Run**
```
start.bat
```
Or manually:
```
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Open `http://localhost:5173` in your browser. From other devices on the same network, use `http://<your-machine-ip>:5173`.

## Artwork file naming

### Movies
| Type | Files written |
|---|---|
| Poster | `poster.jpg` |
| Background | `backdrop.jpg` + `fanart.jpg` |
| Clear Logo | `clearlogo.png` (or original extension) |

### TV Shows (written to show root folder)
| Type | Files written |
|---|---|
| Series Poster | `poster.jpg` |
| Background | `fanart.jpg` + `backdrop.jpg` |
| Clear Logo | `clearlogo.png` (or original extension) |
| Season N Poster | `Season01.jpg` inside the season subfolder (e.g. `Show Season 01/Season01.jpg`) |

## Project structure

```
media-posters/
├── server/
│   ├── db.js            # SQLite database (movies + TV shows)
│   ├── scanner.js       # NFO file scanner (movies)
│   ├── tvscanner.js     # TV show directory scanner + TMDB auto-match
│   ├── tmdb.js          # TMDB API client (movies + TV)
│   ├── downloader.js    # Downloads and writes movie artwork
│   ├── tvdownloader.js  # Downloads and writes TV artwork
│   ├── routes.js        # Express API routes
│   └── index.js         # Server entry point
└── client/
    └── src/
        ├── App.jsx
        └── components/
            ├── HomePage.jsx
            ├── LibraryPage.jsx
            ├── TvLibraryPage.jsx
            ├── ReviewScreen.jsx
            ├── TvReviewScreen.jsx
            ├── TvReviewerPage.jsx
            ├── ArtworkPanel.jsx
            ├── CurrentArtworkBanner.jsx
            ├── ReviewerNav.jsx
            ├── NavBar.jsx
            └── OptionsPage.jsx
```

---

## Migration / Backup

Two files are not in the repo and must be backed up manually:

### 1. `server/.env` ⚠️ Required
Contains your TMDB API key and directory paths.

### 2. `server/data.db` ⚠️ Required to preserve review history
The SQLite database storing all movie and TV show records and their review status. Losing this resets all items to pending.

### Migration steps

1. Clone the repo and install dependencies on the new machine.
2. Copy `server/.env` from the old machine.
3. Copy `server/data.db` from the old machine.
4. Update `MOVIE_DIR` and `TV_SHOW_DIR` in `server/.env` if paths differ.
5. Run `start.bat`.

> If folder paths change, existing DB records will have stale paths. Run a fresh scan from the Options page — items at new paths will appear as pending again.
