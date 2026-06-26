// Billiards Buddy — Cloudflare Worker (AI coaching + Google Places proxy)
// Deploy to Cloudflare Workers, then add secrets:
//   ANTHROPIC_KEY     — for the Shot Analyzer AI coaching (existing feature)
//   GOOGLE_PLACES_KEY — venue finder via Google Places. Server-side only, never shipped to the browser.
//   YELP_API_KEY      — venue finder via Yelp Fusion. Either/both providers may be set; /venues merges them.
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
    // Queries Google Places AND Yelp Fusion (whichever keys are present)
    // in parallel and merges server-side. The client adds OpenStreetMap.
    if (path.endsWith('/venues') && request.method === 'POST') {
      if (!env.GOOGLE_PLACES_KEY && !env.YELP_API_KEY) {
        return json({ error: 'No venue provider configured (set GOOGLE_PLACES_KEY and/or YELP_API_KEY).' }, 500);
      }
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
      const { lat, lng } = body;
      const radius = Math.min(Math.max(parseInt(body.radius, 10) || 8000, 500), 50000);
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return json({ error: 'lat and lng (numbers) required.' }, 400);
      }
      const origin = `${url.protocol}//${url.host}`;

      // Google Places Nearby Search — keyword covers dedicated halls + bars with tables.
      async function googleVenues() {
        if (!env.GOOGLE_PLACES_KEY) return [];
        const params = `?location=${lat},${lng}&radius=${radius}` +
          `&keyword=${encodeURIComponent('billiards pool hall snooker pool table')}` +
          `&key=${env.GOOGLE_PLACES_KEY}`;
        const resp = await fetch(PLACES_NEARBY + params);
        const data = await resp.json();
        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
        return (data.results || []).map(function (p) {
          const loc = (p.geometry && p.geometry.location) || {};
          const ref = p.photos && p.photos[0] && p.photos[0].photo_reference;
          return {
            id: 'gp_' + p.place_id, placeId: p.place_id, name: p.name,
            lat: loc.lat, lng: loc.lng, rating: p.rating || null,
            userRatings: p.user_ratings_total || 0, address: p.vicinity || '',
            openNow: p.opening_hours ? !!p.opening_hours.open_now : null,
            types: p.types || [], source: 'google',
            photoUrl: ref ? `${origin}/photo?ref=${encodeURIComponent(ref)}&w=800` : null,
          };
        });
      }

      // Yelp Fusion business search — image_url is directly usable (no key needed to display).
      async function yelpVenues() {
        if (!env.YELP_API_KEY) return [];
        const params = `?latitude=${lat}&longitude=${lng}&radius=${Math.min(radius, 40000)}` +
          `&term=${encodeURIComponent('pool hall billiards pool table')}` +
          `&categories=poolhalls&limit=40&sort_by=distance`;
        const resp = await fetch('https://api.yelp.com/v3/businesses/search' + params, {
          headers: { Authorization: `Bearer ${env.YELP_API_KEY}` },
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        return (data.businesses || [])
          .filter(function (b) { return b && b.is_closed !== true && b.coordinates; })
          .map(function (b) {
            const co = b.coordinates || {};
            const da = (b.location && b.location.display_address) || [];
            return {
              id: 'yelp_' + b.id, name: b.name,
              lat: co.latitude, lng: co.longitude,
              rating: b.rating || null, userRatings: b.review_count || 0,
              address: da.join(', '), openNow: null,
              types: (b.categories || []).map(function (c) { return c.alias; }),
              photoUrl: b.image_url || null, source: 'yelp',
            };
          });
      }

      try {
        const lists = await Promise.all([
          googleVenues().catch(function () { return []; }),
          yelpVenues().catch(function () { return []; }),
        ]);
        // De-dup the same physical place across providers: same normalized
        // name OR within ~55m. Backfill a missing photo/rating from the dup.
        const norm = function (s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
        const venues = [];
        [].concat(lists[0], lists[1]).forEach(function (v) {
          if (!v || v.lat == null || v.lng == null) return;
          const dup = venues.find(function (o) {
            return (norm(o.name) && norm(o.name) === norm(v.name)) ||
              (Math.abs(o.lat - v.lat) < 0.0005 && Math.abs(o.lng - v.lng) < 0.0005);
          });
          if (!dup) { venues.push(v); return; }
          if (!dup.photoUrl && v.photoUrl) dup.photoUrl = v.photoUrl;
          if (!dup.rating && v.rating) dup.rating = v.rating;
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
