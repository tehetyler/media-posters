import axios from 'axios';

const BASE  = 'https://api.themoviedb.org/3';
const THUMB = 'https://image.tmdb.org/t/p/w500';
const FULL  = 'https://image.tmdb.org/t/p/original';

function apiKey() {
  return process.env.TMDB_API_KEY;
}

export async function fetchArtwork(tmdbId) {
  const { data } = await axios.get(`${BASE}/movie/${tmdbId}/images`, {
    params: {
      api_key: apiKey(),
      include_image_language: 'en,null',
    },
    timeout: 15000,
  });

  const byArea = (a, b) => (b.width * b.height) - (a.width * a.height);

  return {
    posters:   (data.posters   ?? []).map(img => normalizeImage(img, 'w342')).sort(byArea),
    backdrops: (data.backdrops ?? []).map(img => normalizeImage(img, 'w780')).sort(byArea),
    logos:     (data.logos     ?? []).map(img => normalizeImage(img, 'w500')).sort(byArea),
  };
}

// Both /search/movie and /movie/{id} results collapse to this shape, as do their TV
// counterparts — the only difference is which field holds the title and the air date.
function toCandidate(r, titleKey, dateKey) {
  const date = r[dateKey];
  return {
    tmdbId:      r.id,
    name:        r[titleKey],
    year:        date ? parseInt(date.slice(0, 4)) : null,
    overview:    r.overview ?? null,
    posterPath:  r.poster_path ?? null,
    popularity:  r.popularity ?? 0,
  };
}

export async function searchMovie(title, year, limit = 20) {
  const params = {
    api_key: apiKey(),
    query: title,
    include_adult: false,
  };
  if (year) params.primary_release_year = year;

  const { data } = await axios.get(`${BASE}/search/movie`, { params, timeout: 15000 });
  return (data.results ?? []).slice(0, limit).map(r => toCandidate(r, 'title', 'release_date'));
}

export async function searchTvShow(title, year, limit = 20) {
  const params = {
    api_key: apiKey(),
    query: title,
    include_adult: false,
  };
  if (year) params.first_air_date_year = year;

  const { data } = await axios.get(`${BASE}/search/tv`, { params, timeout: 15000 });
  return (data.results ?? []).slice(0, limit).map(r => toCandidate(r, 'name', 'first_air_date'));
}

// Look up one title by its TMDB id — the escape hatch when no search terms surface it.
// Returns null for an id that doesn't exist.
export async function fetchMovieDetails(tmdbId) {
  return fetchDetails(`${BASE}/movie/${tmdbId}`, 'title', 'release_date');
}

export async function fetchTvDetails(tmdbId) {
  return fetchDetails(`${BASE}/tv/${tmdbId}`, 'name', 'first_air_date');
}

async function fetchDetails(url, titleKey, dateKey) {
  try {
    const { data } = await axios.get(url, { params: { api_key: apiKey() }, timeout: 15000 });
    return toCandidate(data, titleKey, dateKey);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function fetchTvArtwork(tmdbId) {
  const { data } = await axios.get(`${BASE}/tv/${tmdbId}/images`, {
    params: { api_key: apiKey(), include_image_language: 'en,null' },
    timeout: 15000,
  });
  const byArea = (a, b) => (b.width * b.height) - (a.width * a.height);
  return {
    posters:   (data.posters   ?? []).map(img => normalizeImage(img, 'w342')).sort(byArea),
    backdrops: (data.backdrops ?? []).map(img => normalizeImage(img, 'w780')).sort(byArea),
    logos:     (data.logos     ?? []).map(img => normalizeImage(img, 'w500')).sort(byArea),
  };
}

export async function fetchSeasonArtwork(tmdbId, seasonNumber) {
  const { data } = await axios.get(`${BASE}/tv/${tmdbId}/season/${seasonNumber}/images`, {
    params: { api_key: apiKey(), include_image_language: 'en,null' },
    timeout: 15000,
  });
  const byArea = (a, b) => (b.width * b.height) - (a.width * a.height);
  return {
    posters: (data.posters ?? []).map(img => normalizeImage(img, 'w342')).sort(byArea),
  };
}

function normalizeImage(img, thumbSize) {
  return {
    thumbUrl:     `https://image.tmdb.org/t/p/${thumbSize}${img.file_path}`,
    downloadUrl:  `${FULL}${img.file_path}`,
    filePath:     img.file_path,
    width:        img.width,
    height:       img.height,
    language:     img.iso_639_1 ?? null,
    voteAverage:  img.vote_average ?? 0,
    source:       'tmdb',
  };
}
