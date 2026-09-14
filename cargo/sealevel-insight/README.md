# Sealevel Insight

`sealevel-insight` is the Cargo distribution of the Sealevel Insight CLI. It
embeds the same bundled JavaScript analyzer and Tree-sitter WASM grammars as
the npm package, then launches them with the local Node.js runtime.

This is an honest launcher crate, not a native Rust rewrite of the analyzer.
Node.js 18 or newer must be installed and available as `node` (or `nodejs`).
After installation, analysis is local and offline: the launcher extracts its
embedded CLI and grammars into a versioned user cache and does not download
code, grammars, or dependencies.

## Install

```bash
cargo install sealevel-insight
sealevel-insight --help
sealevel-insight analyze . --format markdown --output report.md
```

The CLI supports Anchor, native Rust, Pinocchio, Steel, Quasar, custom Rust,
Solang Solidity, and hand-written sBPF assembly evidence. See the main
[project README](https://github.com/R4Y4N3/Sealevel-Insight#readme) for the
complete command and feature documentation.

## Security and privacy

The analyzer reads the source tree you select and writes reports where you
request them. It does not execute analyzed programs, access wallets or private
keys, contact Solana RPC endpoints, upload source, collect telemetry, invoke
AI services, or provide offensive payloads. Review `DISCLOSURE`, `SECURITY.md`,
and `THIRD_PARTY_NOTICES.md` shipped with this crate.

## Development and release

From the repository root:

```bash
npm run package:cli
node scripts/package-cargo.js
cargo check --manifest-path cargo/sealevel-insight/Cargo.toml
cargo test --manifest-path cargo/sealevel-insight/Cargo.toml
cargo package --manifest-path cargo/sealevel-insight/Cargo.toml --allow-dirty
```

The Cargo crate version and embedded assets are released together with the
matching npm CLI version. Publishing to crates.io is permanent; run
`cargo package --list` and `cargo publish --dry-run` before `cargo publish`.
