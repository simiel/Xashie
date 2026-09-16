import { AgentService } from '../dist/src/agent.js';
import { createGatewayTokenManagerFromEnv } from '../dist/src/gateway-token-manager.js';

const gateway = createGatewayTokenManagerFromEnv(process.env);
if (!gateway) throw new Error('Gateway credentials are not configured.');
const agent = new AgentService(gateway, null);
const response = await agent.stream({
  actor: { type: 'guest', sessionId: 'synthetic-smoke-session' },
  userContext: { name: 'Not provided', ageGroup: 'Not provided', preferredLanguage: 'english', accessibilityPreferences: [], sessionType: 'guest' },
  message: 'Please give one short, non-sensitive wellbeing greeting.',
  history: [],
  requestId: 'synthetic-agent-stream-smoke',
  abortSignal: AbortSignal.timeout(60_000),
});
let bytes = 0;
if (response.body) for await (const chunk of response.body) bytes += chunk.length;
console.log(JSON.stringify({ check: 'ai-sdk-agent-stream', status: response.status, contentType: response.headers.get('content-type'), receivedBytes: bytes, nonEmpty: bytes > 0 }));
if (!response.ok || bytes === 0) process.exitCode = 1;
