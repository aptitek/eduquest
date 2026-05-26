import { Hono } from 'hono';
import type { UserPayload } from '../middleware/auth';

type Bindings = {
  ASSETS?: R2Bucket;
  ASSET_PUBLIC_BASE_URL?: string;
};

type Variables = {
  user?: UserPayload;
};

type AssetKind = 'avatar' | 'school-logo' | 'guild-icon';

type AssetPolicy = {
  maxBytes: number;
  allowedTypes: readonly string[];
  allowSvg: boolean;
  requiresAdmin?: boolean;
};

const assetPolicies: Record<AssetKind, AssetPolicy> = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    allowSvg: false,
  },
  'school-logo': {
    maxBytes: 2 * 1024 * 1024,
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    allowSvg: true,
    requiresAdmin: true,
  },
  'guild-icon': {
    maxBytes: 2 * 1024 * 1024,
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    allowSvg: true,
    requiresAdmin: true,
  },
};

const extensionByType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export const assetRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
export const publicAssetRouter = new Hono<{ Bindings: Bindings }>();

assetRouter.post('/assets/:kind', async (c) => {
  const bucket = c.env.ASSETS;
  if (!bucket) {
    return c.json({ success: false, error: 'Asset storage is not configured.' }, 503);
  }

  const kind = c.req.param('kind') as AssetKind;
  const policy = assetPolicies[kind];
  if (!policy) {
    return c.json({ success: false, error: 'Unsupported asset kind.' }, 400);
  }

  const user = c.get('user');
  if (policy.requiresAdmin && !user?.isAdmin) {
    return c.json({ success: false, error: 'Forbidden.' }, 403);
  }

  const body = await c.req.parseBody();
  const file = body.file;
  const entityId = typeof body.entityId === 'string' ? body.entityId : undefined;

  if (!(file instanceof File)) {
    return c.json({ success: false, error: 'Asset file is required.' }, 400);
  }

  if (file.size > policy.maxBytes) {
    return c.json({ success: false, error: 'Asset file is too large.' }, 400);
  }

  const contentType = normalizeContentType(file.type);
  if (!policy.allowedTypes.includes(contentType)) {
    return c.json({ success: false, error: 'Unsupported asset type.' }, 400);
  }

  if (contentType === 'image/svg+xml' && !policy.allowSvg) {
    return c.json({ success: false, error: 'SVG is not allowed for this asset kind.' }, 400);
  }

  const bytes = await file.arrayBuffer();
  let assetBody: string | ArrayBuffer = bytes;
  try {
    assetBody =
      contentType === 'image/svg+xml'
        ? sanitizeSvg(new TextDecoder().decode(bytes))
        : bytes;
  } catch (error) {
    console.warn('Rejected unsafe SVG upload:', error instanceof Error ? error.message : error);
    return c.json({ success: false, error: 'Unsafe SVG content.' }, 400);
  }
  const key = buildAssetKey(kind, user, entityId, contentType);

  await bucket.put(key, assetBody, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      kind,
      uploadedBy: user?.id || 'unknown',
    },
  });

  return c.json({
    success: true,
    key,
    url: buildAssetUrl(c.req.url, c.env.ASSET_PUBLIC_BASE_URL, key),
    contentType,
  });
});

publicAssetRouter.get('/*', async (c) => {
  const bucket = c.env.ASSETS;
  if (!bucket) {
    return c.text('Asset storage is not configured.', 503);
  }

  const key = decodeURIComponent(c.req.path.replace(/^\/assets\/?/, ''));
  if (!key || key.includes('..')) {
    return c.text('Invalid asset key.', 400);
  }

  const object = await bucket.get(key);
  if (!object) {
    return c.text('Asset not found.', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', headers.get('cache-control') || 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');

  if (headers.get('content-type')?.startsWith('image/svg+xml')) {
    headers.set('content-security-policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
  }

  return new Response(object.body, { headers });
});

function normalizeContentType(type: string) {
  return type === 'image/jpg' ? 'image/jpeg' : type;
}

function buildAssetKey(
  kind: AssetKind,
  user: UserPayload | undefined,
  entityId: string | undefined,
  contentType: string
) {
  const extension = extensionByType[contentType] || 'bin';
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();

  if (kind === 'avatar') {
    return `users/${user?.id || 'anonymous'}/avatar-${timestamp}-${randomId}.${extension}`;
  }

  const safeEntityId = (entityId || randomId).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${kind === 'school-logo' ? 'schools' : 'guilds'}/${safeEntityId}/${kind}-${timestamp}-${randomId}.${extension}`;
}

function buildAssetUrl(requestUrl: string, publicBaseUrl: string | undefined, key: string) {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${encodeAssetKey(key)}`;
  }

  const url = new URL(requestUrl);
  url.pathname = `/assets/${encodeAssetKey(key)}`;
  url.search = '';
  return url.toString();
}

function encodeAssetKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function sanitizeSvg(source: string) {
  const trimmed = source.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith('<svg') && !lower.startsWith('<?xml')) {
    throw new Error('Invalid SVG document.');
  }

  const forbiddenPatterns = [
    /<!doctype/i,
    /<script[\s>]/i,
    /<foreignobject[\s>]/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i,
    /<link[\s>]/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
    /data:/i,
    /https?:\/\//i,
    /url\(\s*['"]?(?!#)/i,
  ];

  if (forbiddenPatterns.some((pattern) => pattern.test(trimmed))) {
    throw new Error('Unsafe SVG content.');
  }

  return trimmed
    .replace(/<\?xml[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+xmlns:xlink=["'][^"']*["']/gi, '')
    .trim();
}
