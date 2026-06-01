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

export const fetchQueue      = ()                   => req('GET',  '/api/queue');
export const fetchMovies     = ()                   => req('GET',  '/api/movies');
export const fetchMovieById  = (id)                 => req('GET',  `/api/movie/${id}`);
export const fetchArtwork        = (id) => req('GET', `/api/movie/${id}/artwork`);
export const fetchCurrentArtwork = (id) => req('GET', `/api/movie/${id}/current-artwork`);
export const saveSelections  = (id, selections)     => req('POST', `/api/movie/${id}/select`, { selections });
export const skipMovie       = (id)                 => req('POST', `/api/movie/${id}/skip`);
export const scanNow         = ()                   => req('POST', '/api/scan');
export const fetchStatus            = ()  => req('GET',  '/api/status');
export const markSkippedAsReviewed  = ()  => req('POST', '/api/options/mark-skipped-reviewed');

export const proxyUrl = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;
