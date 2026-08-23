# Sealevel Insight

Framework-agnostic architecture, metrics, and security-surface analysis for Solana programs.

## What is Sealevel Insight?

Sealevel Insight is a local, offline VS Code extension and CLI for understanding Solana program source. It helps developers and auditors scope a repository, identify packages and program surfaces, inspect Rust complexity, and navigate evidence-backed instruction, account, PDA, and CPI relationships.

It does not upload source code, use telemetry, call RPC/API services, or invoke AI during normal analysis.

## Features

- Tree-sitter Rust parsing with per-file diagnostics
- LOC, nSLOC, comments, blanks, functions, structs, enums, traits, impls, macros, unsafe blocks, and source complexity
- Anchor, native Solana, and Pinocchio enrichment with generic fallback for unknown Rust frameworks
- Exact AST CPI and PDA call sites with locations, confidence, and evidence
- Anchor context-scoped account relationships and constraint extraction
- Architecture graph records, native Explorer, CodeLens, hover details, and source navigation
- SHA-256 scope and duplicate-source reporting
- Versioned JSON, Markdown, and standalone HTML output
- Offline CLI analysis, scope, and report diff commands

Review Surface signals are evidence for human review. They are not vulnerability findings, severity ratings, or exploitability conclusions.

## Quick start

```bash
npm install
npm run typecheck
npm test
npm run build
npm run package
code --install-extension sealevel-insight-0.4.0.vsix
```

In the Extension Development Host, open a Rust workspace and run **Sealevel Insight: Analyze Workspace**.

## Commands

- **Sealevel Insight: Analyze Workspace** analyzes all configured Rust sources.
- **Sealevel Insight: Export Analysis as JSON** exports the latest in-memory report.

CLI examples:

```bash
node dist/cli.js analyze . --format json --output report.json
node dist/cli.js analyze . --format markdown --output report.md
node dist/cli.js analyze . --format html --output report.html
node dist/cli.js scope . --format json --output scope.json
node dist/cli.js diff baseline.json report.json
```

The CLI and VS Code command share the same analysis engine. The CLI does not require Anchor CLI, Solana CLI, Cargo, rust-analyzer, network access, or RPC.

## Support matrix

| Style | Depth |
|---|---|
| Anchor | Enriched: program handlers, contexts, account fields, constraints, CPIs, PDAs |
| Native Rust | Enriched generic entrypoints, account signals, calls, CPIs, and PDAs |
| Pinocchio | Partial enrichment for common AccountView, entrypoint, CPI, and PDA patterns |
| Steel | Generic Rust fallback; dedicated adapter is future work |
| Quasar | Generic Rust fallback; dedicated adapter is future work |
| Custom Rust | Generic AST-first Rust and Solana analysis |
| Codama/Shank | No dedicated metadata adapter yet |
| Solang | Not yet parsed; files are ignored by the Rust adapter |
| sBPF assembly | Not yet parsed; assembly adapter is future work |

Unknown/custom frameworks still receive generic Rust and Solana analysis.

## How it works

```text
Source / metadata
        ↓
Tree-sitter Rust parser
        ↓
Generic Solana semantic model
        ↓
Optional framework enrichers
        ↓
Metrics / scope / architecture / review surface
        ↓
VS Code report or CLI export
```

## Metrics and Review Profile

LOC is physical source lines. nSLOC is the number of lines containing code outside whitespace and comments. Rust block comments are nested-aware, and comment-like text inside strings is not treated as a comment. Source-level cyclomatic complexity is `1 + decision points`, counting `if`, loops, match arms, and boolean decision operators.

Current Review Surface includes raw or unchecked accounts, signer and writable signals, owner/address checks, remaining accounts, unsafe code, serialization, reallocations, CPIs, and PDA derivations. These are review signals, not vulnerability findings.

Semantic Coverage reports denominators for parsed files, resolved instruction contexts, CPI targets, and PDA seeds. Unknown and dynamic results remain explicit.

## Scope workflow

Scope analysis hashes normalized file contents with SHA-256, records in-scope and excluded files, identifies generated/test paths, and reports exact duplicates. A future `.sealevel-insight.json` or `scopefile.txt` workflow can build on the core scope model; current CLI scope accepts the repository root and deterministic defaults.

## Graphs and IDL

The current architecture graph records evidence-backed program, instruction, account, PDA, and external-program relationships. The report also exposes graph data for future call/CPI/account visualizations. IDL discovery and source-to-IDL reconciliation are not yet implemented.

## Configuration

Implemented settings include `sealevelInsight.includePatterns`, `excludePatterns`, `showCodeLens`, `maxFileSize`, `autoAnalyze`, `includeTests`, and `enableIdlAnalysis`. The first two currently control workspace source discovery; other settings are conservative extension configuration for incremental implementation.

## Privacy and limitations

Analysis is local and deterministic. There is no telemetry, source upload, remote API, RPC, or AI integration. There is no vulnerability detector, severity system, deployed-binary analysis, IDL reconciliation, complete Cargo workspace resolver, full interprocedural call graph, Solang parser, sBPF parser, Steel adapter, Quasar adapter, or Marketplace publication automation.

## Roadmap

- Complete Cargo workspace and dependency graph resolution
- Conservative cross-file call graph and reachable instruction surface
- Dedicated Steel, Quasar, Codama/Shank, Solang, and sBPF adapters
- IDL discovery/reconciliation and richer interactive graph views
- Optional security detectors in a separate future rule engine

## Contributing

Keep the core framework-neutral and offline. Prefer AST evidence over broad text matching, retain locations/confidence/evidence, add exact synthetic fixtures, and run `npm run typecheck`, `npm test`, `npm run build`, `npm run package`, and `npm run verify:vsix` before submitting changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
