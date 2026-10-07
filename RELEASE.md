# Releasing `@vedika-io/mcp-server`

The fix for the 2026-07-20 credential-routing incident
(`docs/ops/incidents/2026-07-20-mcp-server-credential-routing-risk.md`) has been
in this source tree since 2026-07-26 and has never been published. `2.0.3` —
published 2026-06-12 and still the `latest` tag — sends the caller's API key to
whatever `VEDIKA_BASE_URL` names, and follows redirects while carrying it.
`2.0.4` in this tree pins both.

Publishing is the only remaining step and it is the founder's call.

## The one command

```bash
cd integrations/mcp-server && npm ci && npm publish
```

That is the whole release. It is self-gating: `npm publish` runs
`prepublishOnly` → `npm test` → `pretest` → `npm run build`, so the 24 tests run
against a freshly compiled `dist/`, and `prepack` rebuilds `dist/` again into
the tarball. A failing test or a broken build aborts before anything reaches the
registry.

The `npm ci` is not optional on a fresh checkout. `node_modules/` is not
committed, and without it `tsc` cannot resolve `zod` or the MCP SDK, so
`prepublishOnly` aborts on a wall of TS2307 errors rather than on anything
meaningful. Verified on 2026-09-07 by deleting `node_modules/` and `dist/`:
`npm test` alone fails to compile; `npm ci && npm test` gives 24 passing and
`npm pack --dry-run` gives 90 files.

`npm login` first if `npm whoami` errors. The publishing identity is the
`vedika-io` npm org; the sole maintainer on record is `kaalchakrteam@gmail.com`,
which is a personal Google account, so the login and its OTP need the founder.

## Optional preflight (read-only, changes nothing)

```bash
cd integrations/mcp-server && npm ci && npm test && npm pack --dry-run
```

Expect: 24 passing tests, then a `2.0.4` tarball of **90 files** containing
`dist/tools/vastu.js`, `README.md` and `package.json` and nothing else. A count
of 2 means the build did not run.

## Why `prepack` and `pretest` exist

`dist/` is gitignored repo-wide (`.gitignore:23`, `**/dist/`), so a clean clone
has no compiled output at all. `npm pack` does **not** run `prepublishOnly`, so
before this change `npm pack` on a clean clone produced a 2-file tarball with no
code in it, and in a working copy with a stale `dist/` it produced an 88-file
tarball missing all seven Vastu tools. Either way the artifact you could inspect
was not the artifact `npm publish` would upload, which makes pre-publish
verification impossible. `prepack: npm run build` makes pack and publish produce
the same bytes; `files: ["dist", "README.md"]` is an allowlist, so a new
top-level file cannot ship by being forgotten.

## After publishing

1. Confirm the registry moved: `npm view @vedika-io/mcp-server version` → `2.0.4`.
2. Confirm the shipped bytes carry the fix, from a throwaway directory:
   `npm pack @vedika-io/mcp-server@2.0.4 && tar xzf vedika-io-mcp-server-2.0.4.tgz`
   then `grep -c PUBLIC_API_ORIGIN package/dist/client.js` → non-zero, and
   `grep -c "redirect: 'manual'" package/dist/client.js` → 1.
3. Recommended, founder's call, and a registry write that reaches every
   installed user:
   `npm deprecate @vedika-io/mcp-server@"<2.0.4" "Sends the API key to any VEDIKA_BASE_URL; upgrade to 2.0.4."`
   Every published version leaks, not only `2.0.3`: the tarballs for `1.5.0`,
   `1.6.0`, `2.0.0`, `2.0.1`, `2.0.2` and `2.0.3` were all fetched and read on
   2026-09-07, and all six carry the same unvalidated `baseUrl` and no
   `redirect` option, so `<2.0.4` is the right range. The registry counted
   1,222 downloads in the year to 2026-09-06 (downloads, not installs — that
   number includes mirrors and CI) spread across all six. Deprecation is the
   only channel that reaches an existing install. Nothing in this repository can
   revoke a key that already left a machine.
4. Update the incident record's `Live remediation` field and its `INDEX.csv` row
   from `not deployed` to `deployed`.

## What is not automated, on purpose

No CI workflow publishes this package — `.github/` holds only `dependabot.yml`.
Merging the release-prep PR ships nothing. That is intentional: publishing
reaches an audience.

## Known metadata disagreement (not changed here)

`package.json` `repository.url` names `github.com/vedika-io/vedika-mcp-server`,
a separate repository from this monorepo. That repository is **public**, not
archived, and was last pushed 2026-05-29; its `main` still carries the
vulnerable `src/client.ts` (`this.baseUrl = (process.env['VEDIKA_BASE_URL'] ||
'https://api.vedika.io').replace(/\/$/, '')`, no origin check, no `redirect`
option). Publishing from this monorepo also stamps a `gitHead` that does not
exist there. Both are founder decisions — retire, archive, or resync that
repository, and decide whether `repository.url` should follow — so nothing here
touches it. It does not block the publish.
