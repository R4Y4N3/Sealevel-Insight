# Sealevel Insight CLI

Sealevel Insight is a local, deterministic architecture and code-metrics CLI for Solana programs. It reads Rust, Anchor, Native Rust, Pinocchio, Steel, Quasar, Solang Solidity, and hand-written sBPF assembly source without executing the target program or contacting a network.

## Install

```bash
npm install --global sealevel-insight
```

For a one-off run:

```bash
npx sealevel-insight analyze . --format json --output report.json
```

Node.js 18 or newer is required. Analysis is local and offline; the parser grammars are shipped in the package. The optional real-world validation scripts in the source repository are separate development workflows and are not run by the CLI.

## Commands

```text
sealevel-insight analyze [root] [options]
sealevel-insight scope [root] [options]
sealevel-insight diff <before.json> <after.json> [--format json|markdown|html]
sealevel-insight baseline save [root] [--output baseline.json]
sealevel-insight cache clear [root]
```

Useful options include `--enable-idl`, `--cargo-metadata`, `--target`, repeated `--cfg`, `--cfg-complete`, `--no-cache`, `--format`, and `--output`. Exit code `0` means success, `1` means an analysis/configuration failure, and `2` means a configured quality policy failed.

Reports include metrics, programs, modules, functions, instruction reachability, call paths, accounts, CPIs, PDAs, state and asset-flow evidence, IDL reconciliation, semantic coverage, and explicit unresolved limitations. Review signals are not vulnerability findings or a security verdict.

## Publishing

The source repository also contains the VS Code extension, so its root manifest is private. The public CLI is generated and validated separately:

```bash
npm run package:cli
npm run test:cli-package
npm publish ./dist-cli-package --access public
```

The generated package declares its dual-use content policy and includes `DISCLOSURE` at its root. Use npm's required interactive two-factor-authenticated publish or staged publishing flow for this package.

## Cargo workspaces

The CLI understands Cargo workspaces and reads `Cargo.toml` files without running Cargo. For reproducible CI, provide saved metadata with `--cargo-metadata cargo-metadata.json`. A Rust installation is not required to run the analyzer.

To create that metadata outside the analyzer, use Cargo's locked/offline mode when the dependency cache is available, then pass the resulting file to Sealevel Insight:

```bash
cargo metadata --format-version 1 --locked --offline > cargo-metadata.json
sealevel-insight analyze . --cargo-metadata cargo-metadata.json --no-cache
```

Cargo is an input and metadata source here, not a runtime dependency. The published CLI remains a Node.js package; a future `cargo install` package would require a separately maintained native Rust engine or launcher.

## Privacy and safety

Normal execution reads the selected local files and writes the requested report/cache. It does not upload source code, use telemetry, access wallets or private keys, call Solana RPC, invoke AI APIs, or execute the analyzed program.

See the repository's `SECURITY.md`, `SUPPORT.md`, and `THIRD_PARTY_NOTICES.md` for reporting and dependency information.
