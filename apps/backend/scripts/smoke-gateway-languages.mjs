import { createGatewayTokenManagerFromEnv } from '../dist/src/gateway-token-manager.js';

const gateway = createGatewayTokenManagerFromEnv(process.env);
if (!gateway) throw new Error('Gateway credentials are not configured.');
const baseUrl = gateway.getBaseUrl();
const accessToken = await gateway.getAccessToken();
const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
const expected = new Map([['eng', 'hashie-medgemma'], ['swa', 'hashie-medgemma'], ['lug', 'hashie-sunflower'], ['akh', 'hashie-sunflower'], ['amh', 'hashie-sunflower']]);
const requestedLanguages = process.env.HASHIE_GATEWAY_LANGUAGE_CODES ? process.env.HASHIE_GATEWAY_LANGUAGE_CODES.split(',').map((value) => value.trim()).filter(Boolean) : [...expected.keys()];
const languageChecks = requestedLanguages.map((language) => [language, expected.get(language)]).filter((entry) => entry[1]);
const timeoutMs = Number(process.env.HASHIE_GATEWAY_SMOKE_TIMEOUT_MS ?? 20_000);
const requestOptions = { signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20_000) };
const onlyStream = process.env.HASHIE_GATEWAY_ONLY_STREAM === 'true';

if (!onlyStream) {
  const modelsResponse = await fetch(`${baseUrl}/v1/models`, { headers: { Authorization: `Bearer ${accessToken}` }, ...requestOptions });
  const modelsPayload = modelsResponse.ok ? await modelsResponse.json() : null;
  console.log(JSON.stringify({ check: 'models', status: modelsResponse.status, models: Array.isArray(modelsPayload?.data) ? modelsPayload.data.map((model) => model.id).filter((id) => typeof id === 'string') : [] }));
  if (!modelsResponse.ok) process.exitCode = 1;

  for (const [language, expectedModel] of languageChecks) {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST', headers, ...requestOptions,
      body: JSON.stringify({ model: 'hashie-medgemma', messages: [{ role: 'user', content: 'Please give one short, non-sensitive wellbeing greeting.' }], country: 'Ghana', language, max_tokens: 32 }),
    });
    const payload = response.ok ? await response.json() : null;
    const model = typeof payload?.model === 'string' ? payload.model : null;
    const nonEmpty = typeof payload?.choices?.[0]?.message?.content === 'string' && payload.choices[0].message.content.length > 0;
    console.log(JSON.stringify({ check: 'language', language, status: response.status, model, expectedModel, nonEmpty }));
    if (!response.ok || model !== expectedModel || !nonEmpty) process.exitCode = 1;
  }

  const unsupported = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST', headers, ...requestOptions,
    body: JSON.stringify({ model: 'hashie-medgemma', messages: [{ role: 'user', content: 'A short safe test.' }], language: 'zzz', max_tokens: 16 }),
  });
  console.log(JSON.stringify({ check: 'unsupported-language', language: 'zzz', status: unsupported.status, expectedStatus: 422 }));
  if (unsupported.status !== 422) process.exitCode = 1;
}

if (process.env.HASHIE_GATEWAY_SKIP_STREAM !== 'true') {
  const streamResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST', headers, ...requestOptions,
    body: JSON.stringify({ model: 'hashie-medgemma', messages: [{ role: 'user', content: 'Please give one short, non-sensitive wellbeing greeting.' }], country: 'Ghana', language: 'eng', max_tokens: 32, stream: true }),
  });
  let bytes = 0;
  if (streamResponse.body) for await (const chunk of streamResponse.body) bytes += chunk.length;
  console.log(JSON.stringify({ check: 'english-stream', status: streamResponse.status, contentType: streamResponse.headers.get('content-type'), receivedBytes: bytes, nonEmpty: bytes > 0 }));
  if (!streamResponse.ok || bytes === 0) process.exitCode = 1;
}
