async function req(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  return data;
}

// Drops undefined/null but keeps '' — an empty `year` means "search without a year filter"
function qs(params) {
  const pairs = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null);
  const query = new URLSearchParams(pairs).toString();
  return query ? `?${query}` : '';
}

export const fetchQueue          = ()                => req('GET',  '/api/queue');
export const fetchMovies         = ()                => req('GET',  '/api/movies');
export const fetchMovieById      = (id)              => req('GET',  `/api/movie/${id}`);
export const fetchArtwork        = (id)              => req('GET',  `/api/movie/${id}/artwork`);
export const fetchCurrentArtwork = (id)              => req('GET',  `/api/movie/${id}/current-artwork`);
export const searchMovieById     = (id, params)      => req('GET',  `/api/movie/${id}/search${qs(params)}`);
export const setMovieTmdbId      = (id, match)       => req('POST', `/api/movie/${id}/set-tmdb`, match);
export const saveSelections      = (id, selections)  => req('POST', `/api/movie/${id}/select`, { selections });
export const skipMovie           = (id)              => req('POST', `/api/movie/${id}/skip`);
export const scanNow         = ()                   => req('POST', '/api/scan');
export const fetchStatus            = ()  => req('GET',  '/api/status');
export const markSkippedAsReviewed  = ()  => req('POST', '/api/options/mark-skipped-reviewed');
export const markSkippedAsPending   = ()  => req('POST', '/api/options/mark-skipped-pending');
export const sync4kArtwork          = ()  => req('POST', '/api/options/sync-4k-artwork');

export const proxyUrl = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// ── Library directories ───────────────────────────────────────────────────────
export const fetchLibraries = ()            => req('GET',    '/api/libraries');
export const createLibrary  = (body)        => req('POST',   '/api/libraries', body);
export const updateLibrary  = (id, fields)  => req('PATCH',  `/api/libraries/${id}`, fields);
export const removeLibrary  = (id)          => req('DELETE', `/api/libraries/${id}`);

// ── TV Shows ──────────────────────────────────────────────────────────────────
export const fetchTvQueue          = ()              => req('GET',  '/api/tv/queue');
export const fetchTvShows          = ()              => req('GET',  '/api/tv/shows');
export const fetchTvStatus         = ()              => req('GET',  '/api/tv/status');
export const fetchTvShowById       = (id)            => req('GET',  `/api/tv/${id}`);
export const searchTvShowById      = (id, params)    => req('GET',  `/api/tv/${id}/search${qs(params)}`);
export const setTvShowTmdbId       = (id, match)     => req('POST', `/api/tv/${id}/set-tmdb`, match);
export const fetchTvArtwork        = (id)            => req('GET',  `/api/tv/${id}/artwork`);
export const fetchTvSeasonArtwork  = (id, n)         => req('GET',  `/api/tv/${id}/season/${n}/artwork`);
export const fetchTvCurrentArtwork = (id)            => req('GET',  `/api/tv/${id}/current-artwork`);
export const saveTvSelections      = (id, selections) => req('POST', `/api/tv/${id}/select`, { selections });
export const skipTvShow            = (id)            => req('POST', `/api/tv/${id}/skip`);
export const scanTvNow             = ()              => req('POST', '/api/tv/scan');
export const markTvSkippedAsReviewed = ()            => req('POST', '/api/tv/options/mark-skipped-reviewed');
export const markTvSkippedAsPending  = ()            => req('POST', '/api/tv/options/mark-skipped-pending');
