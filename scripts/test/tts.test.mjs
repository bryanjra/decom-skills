import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, cacheKey, resolveCredentials } from '../core/tts.mjs';

const VOICE = {
  model: 'eleven_multilingual_v2',
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  output_format: 'mp3_44100_128',
};

test('buildRequest targets the voice, model and output format, and sends the text', () => {
  const r = buildRequest({ text: 'Hola. Te esperamos.', voice: VOICE, voiceId: 'VOZ123', apiKey: 'sk-secret' });
  assert.equal(r.url, 'https://api.elevenlabs.io/v1/text-to-speech/VOZ123?output_format=mp3_44100_128');
  assert.equal(r.init.method, 'POST');
  assert.equal(r.init.headers['xi-api-key'], 'sk-secret');
  assert.deepEqual(JSON.parse(r.init.body), {
    text: 'Hola. Te esperamos.',
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
  });
});

test('the API key never appears in the URL or the body', () => {
  const r = buildRequest({ text: 'Hola', voice: VOICE, voiceId: 'VOZ123', apiKey: 'sk-secret' });
  assert.equal(r.url.includes('sk-secret'), false);
  assert.equal(r.init.body.includes('sk-secret'), false);
});

test('cacheKey changes with the text, the voice id or any voice setting', () => {
  const base = cacheKey({ text: 'Hola', voice: VOICE, voiceId: 'A' });
  assert.equal(cacheKey({ text: 'Hola', voice: VOICE, voiceId: 'A' }), base);
  assert.notEqual(cacheKey({ text: 'Hola!', voice: VOICE, voiceId: 'A' }), base);
  assert.notEqual(cacheKey({ text: 'Hola', voice: VOICE, voiceId: 'B' }), base);
  assert.notEqual(cacheKey({ text: 'Hola', voice: { ...VOICE, stability: 0.6 }, voiceId: 'A' }), base);
});

test('resolveCredentials accepts both documented and existing .env names', () => {
  assert.deepEqual(resolveCredentials({ ELEVENLABS_API_KEY: 'k', ELEVENLABS_VOICE_ID: 'v' }), { apiKey: 'k', voiceId: 'v' });
  assert.deepEqual(resolveCredentials({ ELEVEN_LABS_API_KEY: 'k2', ELEVEN_LABS_VOICE_ID: 'v2' }), { apiKey: 'k2', voiceId: 'v2' });
  assert.deepEqual(resolveCredentials({}), { apiKey: null, voiceId: null });
});
