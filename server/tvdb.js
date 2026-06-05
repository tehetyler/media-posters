import axios from 'axios';

const TVDB_BASE = 'https://api4.thetvdb.com/v4';
const TMDB_BASE = 'https://api.themoviedb.org/3';

let cachedToken = null;
// Promise caches — concurrent requests for the same key share one in-flight call
const tvdbIdCache    = new Map(); // tmdb_id -> Promise<string|null>
const seasonIdCache  = new Map(); // tvdb_id -> Promise<{[n]: seasonId}>
const seriesArtCache = new Map(); // tvdb_id -> Promise<artwork[]>

async function login() {
  const body = { apikey: process.env.TVDB_API_KEY };
  if (process.env.TVDB_PIN) body.pin = process.env.TVDB_PIN;
  const { data } = await axios.post(`${TVDB_BASE}/login`, body, { timeout: 15000 });
  cachedToken = data.data.token;
  return cachedToken;
}

async function tvdbGet(path, params = {}) {
  const token = cachedToken ?? await login();
  try {
    const { data } = await axios.get(`${TVDB_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
      timeout: 15000,
    });
    return data;
  } catch (err) {
    if (err.response?.status === 401) {
      cachedToken = null;
      const fresh = await login();
      const { data } = await axios.get(`${TVDB_BASE}${path}`, {
        headers: { Authorization: `Bearer ${fresh}` },
        params,
        timeout: 15000,
      });
      return data;
    }
    throw err;
  }
}

// Resolve TVDB series ID from a TMDB show ID (cached per server session)
export function getTvdbId(tmdbId) {
  if (!tvdbIdCache.has(tmdbId)) {
    tvdbIdCache.set(tmdbId, (async () => {
      const { data } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}/external_ids`, {
        params: { api_key: process.env.TMDB_API_KEY },
        timeout: 15000,
      });
      return data.tvdb_id ? String(data.tvdb_id) : null;
    })());
  }
  return tvdbIdCache.get(tmdbId);
}

function normalizeArtwork(art) {
  return {
    thumbUrl:    art.thumbnail || art.image,
    downloadUrl: art.image,
    filePath:    null,
    width:       art.width  ?? 0,
    height:      art.height ?? 0,
    language:    art.language ?? null,
    voteAverage: art.score  ?? 0,
    source:      'tvdb',
  };
}

// Fetch and cache all artworks for a series (artworks live in data.artworks)
function getSeriesArtworks(tvdbId) {
  if (!seriesArtCache.has(tvdbId)) {
    seriesArtCache.set(tvdbId, (async () => {
      const res = await tvdbGet(`/series/${tvdbId}/artworks`);
      return res.data?.artworks ?? [];
    })());
  }
  return seriesArtCache.get(tvdbId);
}

// TVDB v4 artwork type IDs: 2=poster, 3=background, 7=season poster, 23=clearlogo
export async function fetchTvDbSeriesArtwork(tvdbId) {
  const all     = await getSeriesArtworks(tvdbId);
  const byScore = (a, b) => (b.score ?? 0) - (a.score ?? 0);
  return {
    posters:   all.filter(a => a.type === 2).sort(byScore).map(normalizeArtwork),
    backdrops: all.filter(a => a.type === 3).sort(byScore).map(normalizeArtwork),
    logos:     all.filter(a => a.type === 23).sort(byScore).map(normalizeArtwork),
  };
}

function getSeasonIds(tvdbId) {
  if (!seasonIdCache.has(tvdbId)) {
    seasonIdCache.set(tvdbId, (async () => {
      const all = await getSeriesArtworks(tvdbId);
      const uniqueSeasonIds = [...new Set(
        all.filter(a => a.type === 7 && a.seasonId).map(a => a.seasonId)
      )];
      const map = {};
      await Promise.all(uniqueSeasonIds.map(async (seasonId) => {
        try {
          const res = await tvdbGet(`/seasons/${seasonId}`);
          const n = res.data?.number;
          if (n != null) map[n] = seasonId;
        } catch {}
      }));
      return map;
    })());
  }
  return seasonIdCache.get(tvdbId);
}

// Season posters (type 7) are included in the series artworks with a seasonId field
export async function fetchTvDbSeasonArtwork(tvdbId, seasonNumber) {
  const [all, seasonIds] = await Promise.all([
    getSeriesArtworks(tvdbId),
    getSeasonIds(tvdbId),
  ]);
  const seasonId = seasonIds[Number(seasonNumber)];
  if (!seasonId) return { posters: [] };

  const byScore = (a, b) => (b.score ?? 0) - (a.score ?? 0);
  return {
    posters: all
      .filter(a => a.type === 7 && a.seasonId === seasonId)
      .sort(byScore)
      .map(normalizeArtwork),
  };
}
