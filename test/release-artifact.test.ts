// Controls on the bytes that actually ship.
//
// Every other test in this package exercises src/ through tsx. Consumers never
// run src/: `files` ships dist/, README.md and LICENSE only, and dist/ is gitignored, so
// it exists only as a build product. The credential-routing fix once sat in
// source for months while the published artifact still carried the defect, so
// the origin policy is re-asserted here against the compiled artifact rather
// than against the TypeScript.
//
// `pretest` runs `npm run build`, so dist/ is current whenever this file runs.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const packageRoot = new URL('../', import.meta.url);
const distDir = new URL('dist/', packageRoot);
const srcDir = new URL('src/', packageRoot);

const ALLOWED_HOSTS = new Set(['api.vedika.io', 'vedika.io']);

function listFiles(dir: URL, extension: string): string[] {
  const found: string[] = [];
  const walk = (current: URL, prefix: string): void => {
    for (const entry of readdirSync(fileURLToPath(current), { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, current), `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith(extension)) {
        found.push(`${prefix}${entry.name}`);
      }
    }
  };
  walk(dir, '');
  return found.sort();
}

/** Every absolute http(s) host referenced by a blob of shipped JavaScript. */
function hostsIn(source: string): string[] {
  const hosts = new Set<string>();
  for (const match of source.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
    hosts.add(match[1]!);
  }
  return [...hosts].sort();
}

test('the build ships a compiled module for every source module', () => {
  assert.ok(existsSync(fileURLToPath(distDir)), 'dist/ is missing; run npm run build');

  const expected = listFiles(srcDir, '.ts').map((f) => f.replace(/\.ts$/, '.js'));
  const shipped = new Set(listFiles(distDir, '.js'));

  const missing = expected.filter((f) => !shipped.has(f));
  assert.deepEqual(
    missing,
    [],
    `dist/ is stale — these source modules were never compiled: ${missing.join(', ')}`,
  );
  // Known-positive control: the comparison really does detect an absent module.
  assert.ok(!shipped.has('tools/not-a-real-module.js'));
  assert.deepEqual(
    ['tools/not-a-real-module.js'].filter((f) => !shipped.has(f)),
    ['tools/not-a-real-module.js'],
  );
});

test('the shipped artifact reaches no host outside vedika.io', () => {
  const offenders: string[] = [];
  for (const file of listFiles(distDir, '.js')) {
    const source = readFileSync(fileURLToPath(new URL(file, distDir)), 'utf8');
    for (const host of hostsIn(source)) {
      if (!ALLOWED_HOSTS.has(host)) offenders.push(`${file} -> ${host}`);
    }
  }
  assert.deepEqual(offenders, [], `non-Vedika hosts in shipped bytes: ${offenders.join(', ')}`);

  // Known-positive control: the extractor fires on a host it should reject.
  assert.deepEqual(
    hostsIn('await fetch("https://evil.example/collect")').filter((h) => !ALLOWED_HOSTS.has(h)),
    ['evil.example'],
  );
});

test('the shipped client pins credentials to the canonical API origin', async () => {
  const { resolveVedikaBaseUrl } = await import('../dist/client.js');

  assert.equal(resolveVedikaBaseUrl(undefined), 'https://api.vedika.io');
  assert.equal(resolveVedikaBaseUrl(''), 'https://api.vedika.io');
  assert.equal(resolveVedikaBaseUrl('  https://api.vedika.io  '), 'https://api.vedika.io');
  assert.equal(resolveVedikaBaseUrl('https://api.vedika.io:443/'), 'https://api.vedika.io');

  for (const unsafeUrl of [
    'http://api.vedika.io',                    // downgraded scheme
    'https://api.vedika.io.evil.example',      // suffix lookalike
    'https://api-vedika.io',                   // dash lookalike
    'https://apivedika.io',                    // dot-elision lookalike
    'https://vedika.io',                       // sibling origin, still not the API
    'https://api.vedika.io:8443',              // non-default port
    'https://api.vedika.io/v2',                // path-bearing
    'https://api.vedika.io/?to=evil.example',  // query-bearing
    'https://api.vedika.io/#evil.example',     // fragment-bearing
    'https://user:password@api.vedika.io',     // user-info
    'https://api.vedika.io@evil.example',      // user-info lookalike
    'http://127.0.0.1:8080',                   // loopback proxy
    'http://169.254.169.254',                  // cloud metadata
    'ftp://api.vedika.io',                     // non-HTTP scheme
    'api.vedika.io',                           // schemeless, unparseable
    '//evil.example',                          // protocol-relative
  ]) {
    assert.throws(
      () => resolveVedikaBaseUrl(unsafeUrl),
      /VEDIKA_BASE_URL must be exactly https:\/\/api\.vedika\.io/,
      `shipped client accepted ${unsafeUrl}`,
    );
  }
});

test('the shipped client refuses a redirect instead of resending the key', async () => {
  const previousApiKey = process.env['VEDIKA_API_KEY'];
  const previousBaseUrl = process.env['VEDIKA_BASE_URL'];
  const previousFetch = globalThis.fetch;
  const destinations: string[] = [];
  let observedRedirect: RequestRedirect | undefined;

  process.env['VEDIKA_API_KEY'] = 'vk_test_release_artifact';
  delete process.env['VEDIKA_BASE_URL'];
  globalThis.fetch = async (input, init) => {
    destinations.push(String(input));
    observedRedirect = init?.redirect;
    return new Response(JSON.stringify({ message: 'redirect blocked' }), {
      status: 302,
      headers: { Location: 'https://evil.example/collect' },
    });
  };

  try {
    const { VedikaApiClient } = await import('../dist/client.js');
    const client = new VedikaApiClient();
    await assert.rejects(
      () => client.get('/v2/astrology/horoscope/aries'),
      /Vedika API error \(302\)/,
    );
    assert.equal(observedRedirect, 'manual');
    assert.deepEqual(destinations, ['https://api.vedika.io/v2/astrology/horoscope/aries']);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env['VEDIKA_API_KEY'];
    else process.env['VEDIKA_API_KEY'] = previousApiKey;
    if (previousBaseUrl === undefined) delete process.env['VEDIKA_BASE_URL'];
    else process.env['VEDIKA_BASE_URL'] = previousBaseUrl;
  }
});

test('a misconfigured base URL fails without printing the key', async () => {
  const previousApiKey = process.env['VEDIKA_API_KEY'];
  const previousBaseUrl = process.env['VEDIKA_BASE_URL'];
  const secret = 'vk_live_release_artifact_secret';

  process.env['VEDIKA_API_KEY'] = secret;
  process.env['VEDIKA_BASE_URL'] = 'https://evil.example';

  try {
    const { VedikaApiClient } = await import('../dist/client.js');
    assert.throws(
      () => new VedikaApiClient(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /VEDIKA_BASE_URL must be exactly https:\/\/api\.vedika\.io/);
        assert.ok(!err.message.includes(secret), 'startup error disclosed the API key');
        assert.ok(!(err.stack ?? '').includes(secret), 'stack trace disclosed the API key');
        return true;
      },
    );
  } finally {
    if (previousApiKey === undefined) delete process.env['VEDIKA_API_KEY'];
    else process.env['VEDIKA_API_KEY'] = previousApiKey;
    if (previousBaseUrl === undefined) delete process.env['VEDIKA_BASE_URL'];
    else process.env['VEDIKA_BASE_URL'] = previousBaseUrl;
  }
});

test('an API failure surfaced to the MCP host never carries the key', async () => {
  const previousApiKey = process.env['VEDIKA_API_KEY'];
  const previousBaseUrl = process.env['VEDIKA_BASE_URL'];
  const previousFetch = globalThis.fetch;
  const secret = 'vk_live_never_surfaced_to_the_model';

  process.env['VEDIKA_API_KEY'] = secret;
  delete process.env['VEDIKA_BASE_URL'];
  // The API echoing the key back is the worst realistic case; the wrapper must
  // still not hand it to the model, so assert on a body that contains it.
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: `bad key ${secret}` }), { status: 401 });

  try {
    const { VedikaApiClient } = await import('../dist/client.js');
    const { safeTool } = await import('../dist/tool-wrapper.js');
    const client = new VedikaApiClient();

    const result = await safeTool(async () => {
      const data = await client.get('/v2/astrology/horoscope/aries');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
    });

    assert.equal(result.isError, true);
    const text = result.content.map((c) => c.text).join('\n');
    assert.ok(!text.includes(secret), `tool error disclosed the API key: ${text}`);
    assert.match(text, /Invalid API key/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env['VEDIKA_API_KEY'];
    else process.env['VEDIKA_API_KEY'] = previousApiKey;
    if (previousBaseUrl === undefined) delete process.env['VEDIKA_BASE_URL'];
    else process.env['VEDIKA_BASE_URL'] = previousBaseUrl;
  }
});

test('the release gates cannot pack or publish an unbuilt tree', () => {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('package.json', packageRoot)), 'utf8'),
  ) as { scripts: Record<string, string>; files: string[] };

  // `npm pack` skips prepublishOnly, so without prepack the verification
  // tarball and the published tarball are different bytes.
  assert.equal(pkg.scripts['prepack'], 'npm run build');
  assert.equal(pkg.scripts['prepublishOnly'], 'npm test');
  assert.equal(pkg.scripts['pretest'], 'npm run build');

  // An allowlist, so a new top-level file cannot ship by being forgotten.
  assert.deepEqual(pkg.files, ['dist', 'README.md', 'LICENSE']);
});
