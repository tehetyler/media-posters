# Media Artwork Manager

A locally-hosted web app for reviewing and selecting artwork for your movie and TV show libraries. It scans your movie library for NFO files written by TinyMediaManager and your TV show directory for season folders, fetches poster, backdrop, clearlogo, and season poster options from TMDB, and lets you select and download artwork directly into each folder.

## Features

### Libraries
- Any number of movie and TV directories, managed on the Options page
- Each movie library can have its own matching 4K directory
- Library pages can be filtered by source directory
- Removing a directory hides its items but keeps their review history — re-adding restores everything
- A directory that can't be read (offline drive, renamed folder) is skipped, never wiped

### Movies
- Scans every movie directory recursively for `.nfo` files written by TinyMediaManager
- Fetches poster, backdrop, and clearlogo options from TMDB
- Downloads selected artwork directly to each movie's folder
- "Fix Match" button to correct or change the TMDB match for any movie
- Tracks review status per movie in SQLite

### TV Shows
- Scans every TV directory for show folders and detects season subfolders automatically
- Auto-matches shows to TMDB by title/year (configurable confidence threshold)
- Fetches series poster, background, clearlogo, and per-season poster options from TMDB
- "Fix Match" button to correct or change the TMDB match for any show
- Season poster sections hidden for shows with no season subfolders
- Resets shows to pending when new seasons are detected on rescan
- Removes stale DB entries when shows/movies are deleted from disk

### Fixing a wrong match
The **Fix Match** panel on either review page is a full TMDB search, not just a list of guesses:
- Edit the **title** and **year**, then Search — clear the year entirely to search every release with that title
- Paste a **TMDB ID or URL** to jump straight to one specific title when search can't surface it
- Picking a match adopts that title's name and year, so the library list and any later search start from the correct values
- Manual matches are protected: a later scan won't revert them to the NFO or folder-derived values

### General
- Currently-on-disk artwork shown alongside TMDB options for reference
- Library browser with search, sort, and filter by status or source directory
- PWA — installable on mobile devices
- Accessible from other devices on the local network
- Options page with directory management, force sync, and mark-skipped-as-reviewed for both movies and TV

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
MOVIE_4K_DIR=D:\path\to\your\movies 4k
TV_SHOW_DIR=D:\path\to\your\tv shows
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3001
TV_MATCH_MIN_POPULARITY=5
```

`MOVIE_DIR`, `MOVIE_4K_DIR`, and `TV_SHOW_DIR` seed your first libraries on the very first run.
After that, add, rename, and remove directories on the **Options** page — the list lives in
`server/data.db` and `.env` is no longer consulted for paths.

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
│   ├── db.js            # SQLite database (movies + TV shows + libraries)
│   ├── paths.js         # Path normalization / containment helpers
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
            ├── MatchPanel.jsx
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
The SQLite database storing all movie and TV show records, their review status, **and your configured library directories**. Losing this resets all items to pending and reverts the directory list to the `.env` seed.

### Migration steps

1. Clone the repo and install dependencies on the new machine.
2. Copy `server/.env` from the old machine.
3. Copy `server/data.db` from the old machine.
4. Run `start.bat`.
5. If paths differ on the new machine, edit each directory on the **Options** page (`.env` is only read when `data.db` has no libraries yet).

> If folder paths change, existing DB records will have stale paths and show up as "items outside every directory" on the Options page. They keep their review status and are never deleted by a scan; items at the new paths appear as pending.
