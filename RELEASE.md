# Releasing `@vedika-io/mcp-server`

Use this procedure from the public package repository. A source merge, an npm release and an MCP Registry listing are separate steps. Keep their evidence separate. Publishing requires an authorized package maintainer and control of the intended registry namespace.

## Prepare one release

Use the Node.js version declared by `package.json`. Start from the reviewed release revision with no unrelated changes. Keep the package version, lockfile root version, runtime version and `server.json` package version aligned. `package.json` must declare `mcpName` equal to the server name in `server.json`.

Review the release diff, dependency changes, installation examples and package allowlist. Descriptions must describe supported capabilities and limitations. Do not infer performance, calculation accuracy or language availability from a package version.

## Build, test and inspect

```sh
npm ci
npm test
npm pack --json
```

The package scripts build before tests and packing. `npm pack` does not replace the full test run. Keep the produced tarball and its recorded integrity value; do not rebuild a different artifact for publication.

Inspect the actual tarball. It must contain the executable entry point, type declarations, runtime modules, README, license, package metadata and `server.json` required by the reviewed release. Reject unexpected files, credentials, source maps or incomplete compiled output. Review the package contents rather than relying on a historical file count.

Install that exact tarball in an isolated consumer directory and run the public mock-protocol and credential-routing checks against its compiled code. Verify initialization and tool listing, representative mocked tool calls, allowed API-origin handling and redirect refusal. Use synthetic credentials and mocked responses; these checks require no production API request.

Before uploading, verify that the intended version is unused and the publisher has the existing package permissions. An authentication or registry failure is not proof that a version is available. Never reuse an existing name/version combination, even after a failed-looking publication attempt. See the [npm publication rules](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

## Publish the inspected tarball

Use the established publisher authentication without printing or committing credentials. Publish the exact reviewed tarball, rather than the working directory. For a release whose version is `2.0.9`, the command is:

```sh
npm publish ./vedika-io-mcp-server-2.0.9.tgz --access public
```

Replace the example version with the reviewed release version. Stop if authentication, approval or validation fails. Do not change package ownership or publish under a different name as a workaround.

Read back the exact version:

```sh
npm view @vedika-io/mcp-server@2.0.9 version dist.integrity dist.tarball mcpName --json
```

Compare `dist.integrity` with the SHA-512 integrity of the inspected tarball. Download the exact published version into a separate directory, inspect its package metadata and executable entry point, and repeat the isolated consumer checks. Verify the intended distribution tag separately; a package version existing does not prove that `latest` points to it.

The [npm pack documentation](https://docs.npmjs.com/cli/v11/commands/npm-pack/) describes package inspection and tarball output.

## Publish MCP discovery metadata

The intended registry name is `io.github.vedika-io/vedika-mcp-server`. Publish metadata only after npm readback proves the matching package version and `mcpName`. Validate the descriptor against the current official server schema, publish through the official publisher or documented registry API, then read back the exact name and version from the registry.

Organization namespace authentication needs proof of organization ownership. The current interactive device login does not grant organization publishing; use a supported authentication method that proves the required role. Do not expose a token in command arguments or logs, substitute a personal namespace, or create credentials to bypass a refusal. Follow the current [official authentication guidance](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx).

The descriptor must identify the exact npm package/version and standard input/output transport, and declare the production API key as a secret environment input without embedding a value. The name must match package `mcpName`; see [package ownership verification](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

A successful npm upload does not prove an MCP listing. Follow the [official registry publishing procedure](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx) and verify the returned listing independently.

## If a release needs correction

Preserve published versions and their evidence. Publish corrected code under a new version. Moving a distribution tag to a previously verified version is a separate maintainer action; read the tag back afterward. Updating a tag does not change clients already pinned to another version. Do not unpublish or deprecate versions automatically.
