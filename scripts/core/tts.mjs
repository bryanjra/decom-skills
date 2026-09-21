// ElevenLabs text-to-speech, REST only (not the MCP connector) so that a past
// week can be re-generated from version-controlled settings.

import { createHash } from 'node:crypto';

const API = 'https://api.elevenlabs.io/v1/text-to-speech';

/** The request to send. The key goes in a header, never in the URL or body. */
export function buildRequest({ text, voice, voiceId, apiKey }) {
  return {
    url: `${API}/${encodeURIComponent(voiceId)}?output_format=${voice.output_format}`,
    init: {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: voice.model,
        voice_settings: {
          stability: voice.stability,
          similarity_boost: voice.similarity_boost,
          style: voice.style,
          use_speaker_boost: voice.use_speaker_boost,
        },
      }),
    },
  };
}

/** Identifies one exact audio result, so an unchanged script is never paid for twice. */
export function cacheKey({ text, voice, voiceId }) {
  const { model, stability, similarity_boost, style, use_speaker_boost, output_format } = voice;
  return createHash('sha256')
    .update(JSON.stringify({ text, voiceId, model, stability, similarity_boost, style, use_speaker_boost, output_format }))
    .digest('hex');
}

/** Accepts the names CLAUDE.md documents and the ones already used in .env. */
export function resolveCredentials(env) {
  return {
    apiKey: env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY || null,
    voiceId: env.ELEVENLABS_VOICE_ID || env.ELEVEN_LABS_VOICE_ID || null,
  };
}
