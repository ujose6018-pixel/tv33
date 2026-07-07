/**
 * TOP FUT — Proxy (Cloudflare Worker, plan gratis)
 * ---------------------------------------------------------------------------
 * El sitio es estático (GitHub Pages, sin servidor). Este Worker intermedia dos
 * APIs, añadiendo CORS y ocultando las claves (nunca llegan al navegador):
 *
 *   1) football-data.org  → rondas/jornadas COMPLETAS de fixtures (X-Auth-Token).
 *   2) YouTube Data API v3 → busca el "resumen/highlights" de un partido.
 *      Ruta: GET /yt/search?q=<texto>  → items[0].id.videoId es el video top.
 *
 * DÓNDE VAN LAS CLAVES (dos opciones, elige una):
 *   A) Secretos del Worker (recomendado): Settings → Variables and Secrets →
 *      añade FD_TOKEN y/o YT_KEY. Deja las constantes de abajo vacías.
 *   B) Pegadas aquí abajo (más simple): rellena las constantes. Esto va SOLO en
 *      el editor de Cloudflare, NUNCA en GitHub (este archivo del repo va vacío).
 *
 * Guía completa en proxy/README.md.
 */

// ── Opción B: pega tus claves aquí (SOLO en Cloudflare, NO en GitHub) ──
const YT_KEY_HARDCODED = '';    // clave de YouTube Data API v3
const FD_TOKEN_HARDCODED = '';  // token de football-data.org

// Rutas football-data permitidas (evita abuso de tu clave).
const ALLOWED = [
  /^\/v4\/competitions\/[A-Za-z0-9]+\/matches\/?$/,
  /^\/v4\/competitions\/[A-Za-z0-9]+\/?$/,
];

export default {
  async fetch(request, env) {
    const YT_KEY = env.YT_KEY || YT_KEY_HARDCODED;
    const FD_TOKEN = env.FD_TOKEN || FD_TOKEN_HARDCODED;

    const cors = {
      'Access-Control-Allow-Origin': '*',                 // o tu dominio exacto
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'GET') return json({ message: 'Solo GET' }, 405, cors);

    const url = new URL(request.url);

    // ── 2) YouTube: buscar resumen del partido (oculta YT_KEY) ──
    if (url.pathname === '/yt/search' || url.pathname === '/yt/search/') {
      if (!YT_KEY) return json({ message: 'Falta configurar YT_KEY en el Worker' }, 500, cors);
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return json({ message: 'Falta el parámetro q' }, 400, cors);
      const yt = 'https://www.googleapis.com/youtube/v3/search'
        + '?part=snippet&type=video&maxResults=1&safeSearch=none&relevanceLanguage=es'
        + '&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(YT_KEY);
      let up;
      try { up = await fetch(yt); } catch (e) { return json({ message: 'No se pudo contactar YouTube' }, 502, cors); }
      const body = await up.text();
      return new Response(body, {
        status: up.status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // ── 1) football-data.org: fixtures (oculta FD_TOKEN) ──
    if (!ALLOWED.some((rx) => rx.test(url.pathname))) {
      return json({ message: 'Ruta no permitida por el proxy' }, 400, cors);
    }
    if (!FD_TOKEN) {
      return json({ message: 'Falta configurar FD_TOKEN en el Worker' }, 500, cors);
    }
    const target = 'https://api.football-data.org' + url.pathname + url.search;
    let upstream;
    try {
      upstream = await fetch(target, { headers: { 'X-Auth-Token': FD_TOKEN } });
    } catch (e) {
      return json({ message: 'No se pudo contactar football-data.org' }, 502, cors);
    }
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
