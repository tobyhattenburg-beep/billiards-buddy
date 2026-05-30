// Billiards Buddy — AI Proxy (Cloudflare Worker)
// Deploy this to Cloudflare Workers, then add ANTHROPIC_KEY as a secret.
// Set AI_PROXY_URL in index.html to your Worker's *.workers.dev URL.

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    if (!env.ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_KEY secret not configured on this Worker.' }),
        { status: 500, headers: corsHeaders() }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body.' }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const { image, cutAngle, shotType, difficulty } = body;

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided.' }),
        { status: 400, headers: corsHeaders() }
      );
    }

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
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: image }
              },
              { type: 'text', text: prompt }
            ]
          }]
        })
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        return new Response(
          JSON.stringify({ error: `Anthropic API ${resp.status}: ${errBody}` }),
          { status: 502, headers: corsHeaders() }
        );
      }

      const data = await resp.json();
      const advice = data.content?.[0]?.text?.trim() || 'Could not generate advice — try again.';
      return new Response(JSON.stringify({ advice }), { headers: corsHeaders() });

    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Worker error: ' + e.message }),
        { status: 500, headers: corsHeaders() }
      );
    }
  }
};
