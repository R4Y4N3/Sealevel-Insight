# Sealevel Insight v0.6

Local program intelligence, architecture, metrics, and audit-scoping for Solana source code. Sealevel Insight is a VS Code extension and CLI designed to make an unfamiliar program repository answerable: what is in scope, what is externally reachable, which accounts and state are involved, where CPIs and PDAs occur, and which conclusions remain unresolved.

Normal analysis is deterministic and offline. It does not upload source, use telemetry, call RPC, invoke an AI API, or require the Solana/Anchor toolchains.

## Quick start

```bash
npm install
npm run typecheck
npm test
npm run package
code --install-extension sealevel-insight-0.6.0.vsix
```

Open a Rust workspace and run **Sealevel Insight: Analyze Workspace**. The Explorer, CodeLens, hovers, Problems diagnostics, and offline report use the same cached analysis model.

CLI use after `npm run build`, or after installing the npm package:

```bash
sealevel-insight analyze . --format json --output report.json
sealevel-insight analyze programs/vault --format html --output report.html --enable-idl
sealevel-insight analyze . --cargo-metadata cargo-metadata.json --output report.json
sealevel-insight scope . --scope-file scopefile.txt --format markdown --output scope.md
sealevel-insight baseline save . --output baseline.json
sealevel-insight diff baseline.json report.json --output changes.json
sealevel-insight cache clear .
```

Exit code `0` means success, `1` means analysis/configuration failure, and `2` means a configured quality policy failed.

## Program intelligence

- Proper TOML parsing for virtual/nested Cargo workspaces, inherited package/dependency fields, targets, features, target conditions, renamed/path/optional/dev/build dependencies, and diagnostic recovery.
- Module-aware Rust symbols for modules, functions, methods, types, imports, aliases, globs, and re-exports.
- Conservative call resolution across files. Ambiguous, external, unresolved, and dynamic calls stay explicit; trait dispatch is not invented.
- Per-instruction transitive surfaces: functions, accounts, CPIs, signed/dynamic CPIs, PDAs, external programs, state, sysvars, runtime operations, events, errors, unsafe code, mutations, lifecycle sites, complexity, and incompleteness reasons.
- Framework-neutral account and state models with evidence, location, confidence, validation, access, lifecycle, serialization, PDA, and instruction relationships.
- Exact AST-backed CPI/PDA sites, structural PDA seeds, signed CPI links, known external-program classification, and deduplicated reachable relationships.
- LOC/nSLOC/comments/doc comments/TODO/FIXME/HACK, Rust AST counts, per-function complexity, review hotspots, semantic coverage, scope hashes, exact duplicates, IDL reconciliation, baselines, and diffs.

Review Complexity estimates human audit effort. It is not a vulnerability detector or severity score.

## Audit products

Every analysis produces a deterministic audit manifest plus one instruction dossier for each extracted entrypoint. A dossier joins the instruction's handler and transitive call surface to its accounts and validations, state types, lifecycle/mutation sites, CPI operations and targets, PDA seeds/signing, sysvars, runtime operations, events, errors, review score, and explicit reachability gaps. Account/state-flow records make each instruction-to-account relationship and its observed read/write/init/realloc/close/lamport behavior directly queryable.

The same records are available in JSON, Markdown, the standalone offline HTML audit cockpit, the VS Code report, and the Explorer. Baseline diffs compare dossier shape, account/state flows, and CPI operation classification. The manifest contains no timestamp and makes unresolved calls, dynamic CPIs, incomplete instruction surfaces, and IDL differences explicit; it is an audit-scoping index, not a security verdict.

## Commands

- Analyze Workspace / Current Package / Current File
- Open Report / Architecture / Call Graph
- Export Analysis as JSON / Markdown / HTML
- Export Scope Report
- Save Baseline / Compare with Baseline
- Clear Analysis Cache

Exports are portable. HTML is standalone, uses no CDN or remote requests, applies a strict CSP, provides searchable tables, keyboard-focusable controls, and an interactive architecture graph with zoom, fit, program and node-type filters. Large graphs are capped and retain table alternatives.

## Framework support

| Framework/style | Level | Evidence-backed enrichment |
|---|---|---|
| Anchor | Enriched | `#[program]`, modern account wrappers and constraints, lifecycle, state/codecs, events/errors, CPIs/PDAs, identities and IDLs |
| Native Rust / modular Solana crates | Enriched | entrypoints, discriminator dispatch, account acquisition/validation/access, serialization, sysvars, CPIs and PDAs |
| Pinocchio | Enriched | current `AccountView`/`Address` patterns, entrypoints, account order/access/resize, validations, CPIs and signer PDAs |
| Steel | Partial | macros, instructions/accounts/state, entrypoint dispatch, validations, events/errors and generic Solana semantics |
| Quasar 0.1-style | Partial | verified `#[program]` handlers, `Accounts`/account views, constraints, state, calls, IDL/config evidence and generic Solana semantics |
| Custom Rust | Generic fallback | syntax, symbols, calls, metrics and generic Solana semantics without forcing a framework |
| Codama / Shank | Partial metadata | configuration/IDL evidence, `ShankInstruction`, `ShankAccount`, and `ShankType` enrichment |

## Language support

Rust is the implemented language frontend. Solang/Solidity-on-Solana and hand-written sBPF assembly remain **Not implemented** in v0.6: shipping regex-only frontends would give false confidence, so those files are not claimed as analyzed programs.

## Cargo and program identity

The Cargo graph models workspaces, packages, targets, dependencies, features, classifications, and internal edges. Classification combines target type, crate type, dependencies, entrypoint/framework syntax, configs, identities, and source semantics; importing a Solana crate alone is insufficient.

Program IDs may come from `declare_id!`, source constants, Anchor.toml, Quasar.toml, and IDL metadata. Conflicting evidence is preserved and reported, never silently selected.

## Accounts, state, CPI, PDA, and runtime

Accounts retain wrapper/state types, order/index, signer/writable/executable/raw/unchecked/optional properties, constraints, owner/address expectations, data/lamport access, lifecycle, serialization, confidence, and evidence. Native/Pinocchio privilege flags require actual checks, not mere type presence; arbitrary Rust `mut` does not imply Solana writability.

State models distinguish static from dynamic layouts and recognize Borsh, Pack, bytemuck/Pod, zero-copy, and manual layouts where supported. CPIs are separate source sites with API, instruction/account expressions, target classification, signed status, and PDA signer links. PDA derivations preserve structural seeds, bump/program expressions, and site identity. Clock, Rent, EpochSchedule, Instructions, SlotHashes, StakeHistory, and LastRestartSlot uses are modeled alongside explicit invoke/log/hash/signature/runtime operations.

## IDL reconciliation and Semantic Coverage

Configured/common IDL locations are discovered without crawling all of `target`. Modern/legacy Anchor-compatible, Solana IDL, Quasar, and identifiable Codama/Shank forms normalize into a shared representation. Reconciliation compares program identity, instruction names/discriminators/arguments, account order and privileges, PDA metadata, state, events, and errors. `MATCHED`, `SOURCE_ONLY`, `IDL_ONLY`, `MISMATCH`, and `UNKNOWN` are analysis statuses—not vulnerabilities.

Semantic Coverage reports `resolved / total` for parsing, Cargo/program classification, handlers/contexts, account relationships, internal and external calls, reachability, CPI targets, PDA seeds, program IDs, and IDL records. Ambiguous, dynamic, and unknown calls are separate counts so framework/runtime calls do not dilute internal-call resolution. Unresolved reasons remain visible.

## Review Complexity

The transparent weights live in `src/analysis/reviewComplexity.ts`. Contributions include reachable complexity/functions, accounts and privileges, raw/unchecked accounts, CPIs/signed/dynamic CPIs, PDAs, remaining accounts, unsafe code, manual serialization, reallocations, and unresolved/ambiguous calls. Labels are Low, Moderate, Elevated, or Heavy Review Surface only.

## Scope, duplicates, and configuration

`.sealevel-insight.json` supports `include`, `exclude`, `includeTests`, `includeGenerated`, `includeDuplicates`, and `scopeFile`. `scopefile.txt` uses include paths/globs, `+include`, and `!exclude`/`-exclude` lines. Normalized SHA-256 detects exact duplicate contents and prevents double-counting by default.

VS Code settings:

| Setting | Purpose |
|---|---|
| `includePatterns` / `excludePatterns` | source discovery scope |
| `includeTests` | include test/bench Rust sources |
| `maxFileSize` | skip oversized files with a diagnostic |
| `enableIdlAnalysis` / `idlPatterns` | offline IDL discovery |
| `showCodeLens` | confirmed-handler lenses |
| `autoAnalyze` | debounced save/filesystem analysis |
| `analysisConcurrency` | bounded concurrency (`0` = automatic) |
| `cargoMetadataPath` | import saved `cargo metadata --format-version 1` JSON without running Cargo |

CLI quality policies include maximum function complexity, maximum instruction review complexity, no parse errors, no IDL mismatches, and minimum semantic coverage. They are non-security CI gates.

## Cache and performance

VS Code caches in extension storage; CLI uses ignored `.sealevel-insight-cache/`. Keys include tool/schema/parser/adapter versions, configuration, source contents, Cargo inputs, and IDL/config fingerprints. Correctness-invalidating changes miss the cache. `npm run benchmark` generates deterministic 100/500/1000-file projects and prints cold/warm timing and throughput; it is informative, not a flaky CI threshold.

## Architecture and privacy

```text
Source / metadata / Cargo / IDL
  → Rust parser and symbol index
  → generic Rust + Solana semantics
  → additive framework/metadata enrichers
  → unified program model
  → calls and instruction reachability
  → metrics, scope, coverage and review profile
  → CLI, VS Code, JSON, Markdown and offline HTML
```

Core analysis modules do not import `vscode`. Normal execution performs no network access. The opt-in developer command `npm run test:real-world` is the only workflow that clones external repositories. It checks the 20-case QuickNode matrix against versioned expectations in `test/real-world/expectations`, then validates pinned Solana Foundation, Steel, and Shank/Codama targets in an ignored cache.

## Validation, limitations, and roadmap

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run package`, `npm run verify:vsix`, `npm run test:integration`, `npm run test:real-world`, `npm run benchmark`, `npm audit`, and `git diff --check` before release assessment.

Static analysis cannot resolve arbitrary macros, conditional compilation, trait/dynamic dispatch, runtime-selected program IDs, or all custom serialization. Cross-package calls are conservative and require indexed source plus dependency/path evidence. Graph rendering is deliberately bounded. Framework and metadata adapters model evidenced common forms rather than executing procedural macros. Solang and assembly frontends are future work. Sealevel Insight produces analysis diagnostics and review signals, not vulnerability findings.

Marketplace publishing still requires the repository owner to confirm the real VS Code publisher account and provide screenshots. No publisher is invented, and this repository does not auto-publish.

## Contributing and license

Prefer AST evidence, preserve confidence/evidence/location, reduce real-world failures to deterministic fixtures, and keep the shared core offline and framework-neutral. See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed; see [LICENSE](LICENSE). Bundled notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
