/* ═══════════════════════════════════════════════
   HUNCHOPLUS — api.js
   All TMDB API calls live here.
═══════════════════════════════════════════════ */

export const TMDB_API_KEY   = '60593241d155f26b1b83caacb48326a8';
export const TMDB_BASE      = 'https://api.themoviedb.org/3';
export const TMDB_IMG_W500  = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMG_ORIG  = 'https://image.tmdb.org/t/p/original';

/* ── generic fetch helper ── */
async function tmdb(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${endpoint}${sep}api_key=${TMDB_API_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

/* ── Trending (hero slideshow) — mixed movies + TV ── */
export async function fetchTrending() {
  try {
    const [mov, tv] = await Promise.all([
      tmdb('/trending/movie/week'),
      tmdb('/trending/tv/week'),
    ]);
    const movies = (mov.results || []).filter(m => m.backdrop_path).map(m => ({ ...m, media_type: 'movie' }));
    const shows  = (tv.results  || []).filter(t => t.backdrop_path).map(t => ({ ...t, media_type: 'tv' }));
    const merged = [];
    for (let i = 0; i < Math.max(movies.length, shows.length); i++) {
      if (movies[i]) merged.push(movies[i]);
      if (shows[i])  merged.push(shows[i]);
    }
    return merged.slice(0, 10);
  } catch (e) { console.error('fetchTrending:', e); return []; }
}

/* ── Popular Movies ── */
export async function fetchPopularMovies() {
  try {
    const d = await tmdb('/movie/popular');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchPopularMovies:', e); return []; }
}

/* ── Popular TV Shows ── */
export async function fetchPopularTV() {
  try {
    const d = await tmdb('/tv/popular');
    return (d.results || []).filter(t => t.poster_path).slice(0, 20)
      .map(t => ({ ...t, media_type: 'tv' }));
  } catch (e) { console.error('fetchPopularTV:', e); return []; }
}

/* ── Top Rated Movies ── */
export async function fetchTopRated() {
  try {
    const d = await tmdb('/movie/top_rated');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchTopRated:', e); return []; }
}

/* ── Upcoming Movies ── */
export async function fetchUpcoming() {
  try {
    const d = await tmdb('/movie/upcoming');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchUpcoming:', e); return []; }
}

/* ── Anime (Animation genre on TV) ── */
export async function fetchAnime() {
  try {
    const d = await tmdb('/discover/tv?with_genres=16&sort_by=popularity.desc&with_origin_country=JP');
    return (d.results || []).filter(t => t.poster_path).slice(0, 20)
      .map(t => ({ ...t, media_type: 'tv' }));
  } catch (e) { console.error('fetchAnime:', e); return []; }
}

/* ── Action & Adventure Movies ── */
export async function fetchActionMovies() {
  try {
    const d = await tmdb('/discover/movie?with_genres=28,12&sort_by=popularity.desc');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchActionMovies:', e); return []; }
}

/* ── Horror Movies ── */
export async function fetchHorror() {
  try {
    const d = await tmdb('/discover/movie?with_genres=27&sort_by=popularity.desc');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchHorror:', e); return []; }
}

/* ── Sci-Fi & Fantasy ── */
export async function fetchSciFi() {
  try {
    const d = await tmdb('/discover/movie?with_genres=878,14&sort_by=popularity.desc');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchSciFi:', e); return []; }
}

/* ── Romance Movies ── */
export async function fetchRomance() {
  try {
    const d = await tmdb('/discover/movie?with_genres=10749&sort_by=popularity.desc');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchRomance:', e); return []; }
}

/* ── Documentaries ── */
export async function fetchDocumentaries() {
  try {
    const d = await tmdb('/discover/movie?with_genres=99&sort_by=popularity.desc');
    return (d.results || []).filter(m => m.poster_path).slice(0, 20)
      .map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) { console.error('fetchDocumentaries:', e); return []; }
}

/* ── Search ── */
export async function searchContent(query) {
  if (!query || query.length < 2) return [];
  try {
    const d = await tmdb(`/search/multi?query=${encodeURIComponent(query)}`);
    return (d.results || [])
      .filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
      .slice(0, 8);
  } catch (e) { console.error('searchContent:', e); return []; }
}

/* ── Fetch Trailer (YouTube key) ── */
export async function fetchTrailer(id, type = 'movie') {
  try {
    const endpoint = type === 'tv'
      ? `/tv/${id}/videos`
      : `/movie/${id}/videos`;
    const d = await tmdb(endpoint);
    const videos = d.results || [];
    const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                 || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
                 || videos.find(v => v.site === 'YouTube');
    return trailer ? trailer.key : null;
  } catch (e) { console.error('fetchTrailer:', e); return null; }
}