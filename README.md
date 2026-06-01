# Media Posters

A locally-hosted web app for reviewing and selecting movie artwork. It scans your movie library for NFO files written by TinyMediaManager, fetches poster, backdrop, and clearlogo options from TMDB, and lets you select and download artwork directly into each movie's folder.

## Features

- Scans movie directories recursively for `.nfo` files
- Fetches poster, backdrop, and clearlogo options from TMDB
- Shows currently-on-disk artwork alongside TMDB options
- Downloads selected images directly to the movie folder
- Tracks review status per movie in a local SQLite database
- Movie library browser with search, sort, and filter
- PWA support — installable on mobile devices
- Accessible from other devices on the local network

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
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3001
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

When you save a selection, files are written to the movie's folder as:

| Type | Files written |
|---|---|
| Poster | `poster.jpg` |
| Background | `backdrop.jpg` + `fanart.jpg` |
| Clear Logo | `clearlogo.png` (or original extension) |

## Project structure

```
media-posters/
├── server/
│   ├── db.js          # SQLite database
│   ├── scanner.js     # NFO file scanner
│   ├── tmdb.js        # TMDB API client
│   ├── downloader.js  # Downloads and writes artwork files
│   ├── routes.js      # Express API routes
│   └── index.js       # Server entry point
└── client/
    └── src/
        ├── App.jsx
        └── components/
            ├── HomePage.jsx
            ├── LibraryPage.jsx
            ├── ReviewScreen.jsx
            ├── ArtworkPanel.jsx
            ├── CurrentArtworkBanner.jsx
            ├── ReviewerNav.jsx
            ├── NavBar.jsx
            └── OptionsPage.jsx
```

---

## Migration / Backup

If you move this app to a new machine or need to restore it, two files are not in the repo and must be backed up manually:

### 1. `server/.env` ⚠️ Required
Contains your TMDB API key and movie directory path. Without this the server will not connect to TMDB or find your movies.

```
server/.env
```

### 2. `server/data.db` ⚠️ Required to preserve review history
The SQLite database that tracks every movie, its folder path, and whether it has been reviewed or skipped. Losing this means the entire review queue resets — all movies will appear as pending again.

```
server/data.db
```

### Migration steps

1. On the new machine, clone the repo and install dependencies as per Setup above.
2. Copy `server/.env` from the old machine.
3. Copy `server/data.db` from the old machine.
4. Update `MOVIE_DIR` in `server/.env` if the movie path is different on the new machine.
5. Run `start.bat`.

> If your movie folder paths change (e.g. drive letter differs), the existing database records will still exist but the folder paths stored in the database will be stale. Run a fresh scan from the Options page to re-discover movies at their new paths. Note: existing review status is matched by folder path, so movies at new paths will appear as pending again. To avoid this, keep the same drive letter and folder structure on the new machine.
