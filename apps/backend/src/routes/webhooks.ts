import { Hono } from 'hono';
import {
  createEventContext,
  getEventProviderRegistry,
  publishEvents,
} from '../events';
import { getDb } from '../db';

type Bindings = {
  DATABASE_URL?: string;
  GITHUB_WEBHOOK_SECRET?: string;
};

const webhooksRouter = new Hono<{ Bindings: Bindings }>();

async function verifyGitHubSignature(
  secret: string | undefined,
  payload: string,
  signatureHeader: string | undefined
): Promise<boolean> {
  if (!secret) {
    return true;
  }

  if (!signatureHeader?.startsWith('sha256=')) {
    return false;
  }

  const signature = signatureHeader.slice('sha256='.length);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return expected === signature;
}

webhooksRouter.post('/github', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256');
  const isValid = await verifyGitHubSignature(c.env.GITHUB_WEBHOOK_SECRET, rawBody, signature);

  if (!isValid) {
    return c.json({ success: false, error: 'Invalid GitHub webhook signature.' }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: 'Invalid JSON payload.' }, 400);
  }

  const providerRegistry = getEventProviderRegistry();
  const parsed = providerRegistry.parse('github', payload, { headers: c.req.raw.headers });
  if (!parsed) {
    return c.json({ success: true, ignored: true, events: [] });
  }

  const events = Array.isArray(parsed) ? parsed : [parsed];
  const databaseUrl = c.env.DATABASE_URL;
  const context = createEventContext({
    db: databaseUrl ? getDb(databaseUrl) : undefined,
    env: c.env,
  });

  const results = await publishEvents(events, context);

  return c.json({
    success: true,
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      source: event.source,
    })),
    handlerCount: results.reduce((total, result) => total + result.handlerCount, 0),
  });
});

webhooksRouter.get('/providers', (c) => {
  const providers = getEventProviderRegistry().list().map((provider) => ({
    id: provider.id,
    label: provider.label,
  }));

  return c.json({ success: true, providers });
});

export { webhooksRouter };
