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

function normalizeImage(img, thumbSize) {
  return {
    thumbUrl:     `https://image.tmdb.org/t/p/${thumbSize}${img.file_path}`,
    downloadUrl:  `${FULL}${img.file_path}`,
    filePath:     img.file_path,
    width:        img.width,
    height:       img.height,
    language:     img.iso_639_1 ?? null,
    voteAverage:  img.vote_average ?? 0,
  };
}
