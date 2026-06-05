// Billiards Buddy — Cloudflare Worker (AI coaching + Google Places proxy)
// Deploy to Cloudflare Workers, then add secrets:
//   ANTHROPIC_KEY   — for the Shot Analyzer AI coaching (existing feature)
//   GOOGLE_PLACES_KEY — for the venue finder (new). Server-side only, never shipped to the browser.
//
// In index.html set:
//   AI_PROXY_URL    = "https://<your-worker>.workers.dev"          (AI coaching — root path)
//   VENUE_PROXY_URL = "https://<your-worker>.workers.dev/venues"   (venue search)
// The worker also serves photos at /photo?ref=... so the API key stays secret.

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const PLACES_NEARBY = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const PLACES_PHOTO = 'https://maps.googleapis.com/maps/api/place/photo';

function corsHeaders(extra) {
  return Object.assign({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }, extra || {});
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: corsHeaders() });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, ''); // strip trailing slash

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // ── Route: venue photo proxy ─────────────────────────────
    // GET /photo?ref=<photo_reference>&w=800  → streams the image with the key kept server-side.
    if (path.endsWith('/photo') && request.method === 'GET') {
      if (!env.GOOGLE_PLACES_KEY) return json({ error: 'GOOGLE_PLACES_KEY not configured.' }, 500);
      const ref = url.searchParams.get('ref');
      if (!ref) return json({ error: 'Missing photo ref.' }, 400);
      const w = Math.min(parseInt(url.searchParams.get('w') || '800', 10) || 800, 1200);
      const photoUrl = `${PLACES_PHOTO}?maxwidth=${w}&photo_reference=${encodeURIComponent(ref)}&key=${env.GOOGLE_PLACES_KEY}`;
      const img = await fetch(photoUrl);
      return new Response(img.body, {
        status: img.status,
        headers: {
          'Content-Type': img.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // ── Route: venue nearby search ───────────────────────────
    // POST /venues  { lat, lng, radius }  → { venues: [...] }
    if (path.endsWith('/venues') && request.method === 'POST') {
      if (!env.GOOGLE_PLACES_KEY) return json({ error: 'GOOGLE_PLACES_KEY not configured.' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
      const { lat, lng } = body;
      const radius = Math.min(Math.max(parseInt(body.radius, 10) || 8000, 500), 50000);
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return json({ error: 'lat and lng (numbers) required.' }, 400);
      }
      // "keyword" matches name + types; covers dedicated halls and bars with tables.
      const params = `?location=${lat},${lng}&radius=${radius}` +
        `&keyword=${encodeURIComponent('billiards pool hall snooker pool table')}` +
        `&key=${env.GOOGLE_PLACES_KEY}`;
      try {
        const resp = await fetch(PLACES_NEARBY + params);
        const data = await resp.json();
        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          return json({ error: `Places API: ${data.status}`, detail: data.error_message || '' }, 502);
        }
        const origin = `${url.protocol}//${url.host}`;
        const venues = (data.results || []).map(function (p) {
          const loc = (p.geometry && p.geometry.location) || {};
          const ref = p.photos && p.photos[0] && p.photos[0].photo_reference;
          return {
            id: 'gp_' + p.place_id,
            placeId: p.place_id,
            name: p.name,
            lat: loc.lat,
            lng: loc.lng,
            rating: p.rating || null,
            userRatings: p.user_ratings_total || 0,
            address: p.vicinity || '',
            openNow: p.opening_hours ? !!p.opening_hours.open_now : null,
            types: p.types || [],
            photoUrl: ref ? `${origin}/photo?ref=${encodeURIComponent(ref)}&w=800` : null,
          };
        });
        return json({ venues });
      } catch (e) {
        return json({ error: 'Worker error: ' + e.message }, 500);
      }
    }

    // ── Route: AI shot coaching (default, unchanged) ─────────
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }
    if (!env.ANTHROPIC_KEY) {
      return json({ error: 'ANTHROPIC_KEY secret not configured on this Worker.' }, 500);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }

    const { image, cutAngle, shotType, difficulty } = body;
    if (!image) return json({ error: 'No image provided.' }, 400);

    const prompt =
      `You are an expert billiards coach reviewing a shot through a live camera overlay.\n\n` +
      `Markers on screen:\n` +
      `- White circle "C" = cue ball position\n` +
      `- Gold circle "O" = object ball to pocket\n` +
      `- "P" = target pocket\n` +
      `- Solid white arrow = cue ball travel line to ghost ball aim point\n` +
      `- Dashed white circle = ghost ball (where cue ball center must be at contact)\n` +
      `- Gold arrow = projected object ball path to pocket\n` +
      `- Dashed white arrow = cue ball deflection after contact (90° rule)\n\n` +
      `Calculated geometry: ${Math.round(cutAngle)}° cut — ${shotType} — Difficulty ${parseFloat(difficulty).toFixed(1)}/10\n\n` +
      `Respond in exactly 3 sentences:\n` +
      `1. Confirm the aim line is correct or state the key adjustment needed.\n` +
      `2. Recommend stroke speed and any spin (top/draw/left/right English) for this cut angle.\n` +
      `3. One mental key for executing this shot under pressure.`;

    try {
      const resp = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 240,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        return json({ error: `Anthropic API ${resp.status}: ${errBody}` }, 502);
      }

      const data = await resp.json();
      const advice = data.content?.[0]?.text?.trim() || 'Could not generate advice — try again.';
      return json({ advice });
    } catch (e) {
      return json({ error: 'Worker error: ' + e.message }, 500);
    }
  },
};
