# Sealevel Insight v0.8

Local program intelligence, architecture, metrics, and audit-scoping for Solana source code. Sealevel Insight is a VS Code extension and CLI designed to make an unfamiliar program repository answerable: what is in scope, what is externally reachable, which accounts and state are involved, where CPIs and PDAs occur, which token and asset movements happen and under whose authority, and which conclusions remain unresolved.

Normal analysis is deterministic and offline. It does not upload source, use telemetry, call RPC, invoke an AI API, or require the Solana/Anchor toolchains.

## Quick start

```bash
npm install
npm run typecheck
npm test
npm run package
code --install-extension sealevel-insight-0.8.0.vsix
```

Open a Solana workspace and run **Sealevel Insight: Analyze Workspace**. Rust, Solang Solidity, and hand-written sBPF assembly feed the same deterministic report, architecture, reachability, and audit-scoping model.

CLI use from a checkout after `npm run build`, or through the `sealevel-insight` binary when installed from a package tarball/registry:

```bash
sealevel-insight analyze . --format json --output report.json
sealevel-insight analyze programs/vault --format html --output report.html --enable-idl
sealevel-insight analyze . --cargo-metadata cargo-metadata.json --output report.json
sealevel-insight analyze . --target sbf-solana-solana --cfg 'target_os="solana"' --cfg-complete --output report.json
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
- Reachability v2 evaluates Cargo feature/`cfg(test)` predicates when saved Cargo metadata provides the active feature set, excludes proven-inactive semantic items, and preserves target/platform predicates as explicit unknown evidence.
- Typed method calls resolve to a unique inherent or trait implementation only when the receiver type and indexed implementation make the target unambiguous. Trait declarations and untyped/dynamic receivers are never treated as concrete callees.
- Dispatch & Indirect Calls v2 resolves `Self::item`, receiver-less associated functions, UFCS (`<Type as Trait>::item`), simple type aliases, references and supported `Box`/`Rc`/`Arc`/`Pin` deref chains. Every transform is retained as evidence.
- Generic bounds, `impl Trait`, trait objects, runtime-selected `fn` pointers, and locally defined macro invocations remain explicit dynamic evidence. Local function-item and closure bindings resolve through their bodies when one source initializer fixes their identity.
- Call graphs include deterministic self-recursion and mutual-recursion components with the exact participating functions and call IDs.
- Resolved internal Cargo dependency calls recursively contribute dependency functions, CPIs, PDA signer use, state/runtime operations, external programs, complexity, and unresolved-call evidence to each instruction dossier.
- Deterministic shortest-path witnesses show the exact function and call-ID chain from an instruction to each reachable function, CPI, PDA, state type, runtime operation, external program, and unresolved terminal call. Cross-package witness edges are included in architecture/call graphs.
- Per-instruction transitive surfaces: functions, accounts, CPIs, signed/dynamic CPIs, PDAs, external programs, state, sysvars, runtime operations, events, errors, unsafe code, mutations, lifecycle sites, complexity, and incompleteness reasons.
- Framework-neutral account and state models with evidence, location, confidence, validation, access, lifecycle, serialization, PDA, and instruction relationships.
- Exact AST-backed CPI/PDA sites, structural PDA seeds, signed CPI links, known external-program classification, and deduplicated reachable relationships.
- Framework ABI contracts include source instruction arguments and return data, with IDL return-type reconciliation where the source adapter establishes the contract.
- LOC/nSLOC/comments/doc comments/TODO/FIXME/HACK, Rust AST counts, per-function complexity, review hotspots, semantic coverage, scope hashes, exact duplicates, IDL reconciliation, baselines, and diffs.

Review Complexity estimates human audit effort. It is not a vulnerability detector or severity score.

## Audit products

Every analysis produces a deterministic audit manifest plus one instruction dossier for each extracted entrypoint. A dossier joins the instruction's handler and transitive call surface to its accounts and validations, state types, lifecycle/mutation sites, CPI operations and targets, PDA seeds/signing, token/asset flows, sysvars, runtime operations, events, errors, review score, and explicit reachability gaps. Account/state-flow records make each instruction-to-account relationship and its observed read/write/init/realloc/close/lamport behavior directly queryable.

### Token & Asset Flow v2

Where source evidence supports it, each instruction dossier reports the token movements it performs: the operation (`transfer`, `transfer_checked`, `mint_to`, `burn`, `close_account`, `set_authority`, `approve`, `revoke`, `freeze_account`, `thaw_account`, `initialize_*`, associated-token creation/recovery), whether SPL Token or Token-2022 is targeted, the bound source/destination/mint/authority/delegate/new-authority accounts, the raw amount/decimals expressions, the authority kind (signer account, proven PDA, ordinary account), invoke_signed/PDA-signer correlation, direct-vs-reached-through-helpers classification with call paths, per-flow evidence, completeness, and explicit unresolved reasons.

Roles are bound only from positively identified signatures: Anchor `CpiContext` account-struct fields, known SPL/Token-2022 instruction constructors, documented builder argument orders, or the documented Solang `SplToken` ABI. A recognized operation whose roles cannot be established is reported unresolved — never guessed.

Eligibility is not restricted to SPL Token/Token-2022 targets: Associated Token Program operations (`create`, `create_idempotent`, `recover_nested`) produce flows too, and cross-package CPIs proven reachable through the existing cross-package/reachability machinery also produce flows, attributed to the exposed instruction with a real function/call path. Only the specific native `initialize_*` constructors this module role-models (`initialize_account`, `initialize_account2`, `initialize_account3`, `initialize_mint`, `initialize_mint2`) produce flows; other `initialize_*` instructions (multisig, Token-2022 extensions, ...) remain visible as CPI sites without a fabricated flow.

Known limitations. Resolution may remain incomplete for runtime-selected program IDs, dynamic dispatch through trait objects or generic bounds, opaque procedural macros, unknown custom CPI wrappers, raw pointer aliasing, missing dependency sources, arbitrary Token-2022 extension behavior, and values constructed dynamically at runtime. Cross-package flows never bind account roles against the calling program's instruction accounts, since the CPI's local identifiers belong to a different, unrelated account namespace in the dependency crate; only the operation, location, evidence, and call path are asserted. Semantic resolution is evidence-bounded, never claimed complete.

The same records are available in JSON, Markdown, the standalone offline HTML audit cockpit, the VS Code report, and the Explorer. Baseline diffs compare dossier shape, account/state flows, token/asset flows (operation, token program, roles, authority kind, signing), and CPI operation classification. The manifest contains no timestamp and makes unresolved calls, dynamic CPIs, incomplete instruction surfaces, and IDL differences explicit; it is an audit-scoping index, not a security verdict.

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
| Anchor | Enriched | `#[program]`, modern account wrappers and constraints, lifecycle, state/codecs, events/errors, CPIs/PDAs, identities, default/custom discriminators and IDLs |
| Native Rust / modular Solana crates | Enriched | entrypoints, discriminator dispatch, account acquisition/validation/access, serialization, sysvars, CPIs and PDAs |
| Pinocchio | Enriched | current 0.11-style `AccountView`/`Address` patterns, entrypoints, safe/unchecked/pointer data access, lamports/owner/resize/close, validations, CPIs and signer PDAs |
| Steel | Enriched | macros, instruction/account discriminators and layouts, entrypoint dispatch, chained signer/writable/executable/type/owner/address/sysvar/PDA validations, typed state access, program-account helper CPIs/lifecycle, lamport transfer/close helpers, events and error variants |
| Quasar 0.1-style | Enriched | explicit instruction discriminators/arguments/return data, `Ctx`/`CtxWithRemaining`, typed `Remaining<T, N>` bounds and IDL trailing-account contracts, borrowed account views, account relations and lifecycle, typed PDA seed helpers, method-style regular/single/multi-signer CPIs, state, IDL/config evidence and generic Solana semantics |
| Custom Rust | Generic fallback | syntax, symbols, calls, metrics and generic Solana semantics without forcing a framework |
| Solang | Enriched source frontend | contracts/program IDs, constructors and public/external instructions, account annotations, local/external calls, SPL Token CPIs, PDA seeds/bumps, events, metrics and reachability |
| Hand-written sBPF assembly | Evidence-bounded source frontend | entrypoints/functions, direct and register-indirect calls, branches/complexity, Solana syscalls, signed/dynamic CPIs, PDA derivation, and memory-access indicators |
| Codama / Shank | Enriched metadata | Codama root/additional programs, config-referenced IDLs, node types/privileges/PDAs/discriminators, Shank discriminants/account aliases, and `ShankAccount` field IDL overrides |

## Language support

Rust uses Tree-sitter Rust plus framework adapters. Solang uses the bundled Tree-sitter Solidity grammar for structural parsing and a Solang-specific annotation/API layer. Hand-written sBPF assembly uses a strict line-oriented ISA parser. Ordinary EVM Solidity and generic assembly are not classified as Solana programs unless the source contains sufficient positive Solang or sBPF/Solana evidence; their file metrics remain visible with an explicit diagnostic.

## Cargo and program identity

The Cargo graph models workspaces, packages, targets, dependencies, features, classifications, and internal edges. Classification combines target type, crate type, dependencies, entrypoint/framework syntax, configs, identities, and source semantics; importing a Solana crate alone is insufficient.

Program IDs may come from `declare_id!`, source constants, Anchor.toml, Quasar.toml, and IDL metadata. Conflicting evidence is preserved and reported, never silently selected.

## Accounts, state, CPI, PDA, and runtime

Accounts retain wrapper/state types, order/index, signer/writable/executable/raw/unchecked/optional properties, constraints, owner/address expectations, data/lamport access, lifecycle, serialization, confidence, and evidence. Native/Pinocchio privilege flags require actual checks, not mere type presence; arbitrary Rust `mut` does not imply Solana writability. State & Account Dataflow v2 records distinct field reads/writes, mutable and immutable data/lamport borrows, serialization/deserialization, resize, close, and owner-change sites. It follows local aliases and concrete arguments across statically resolved helper calls, preserving source locations, alias paths, call paths, account bindings, and unresolved bindings in instruction dossiers and state-flow exports.

State models distinguish static from dynamic layouts and recognize Borsh, Pack, bytemuck/Pod, zero-copy, and manual layouts where supported. CPIs are separate source sites with API, instruction/account expressions, target classification, signed status, and PDA signer links. PDA derivations preserve structural seeds, bump/program expressions, and site identity. Clock, Rent, EpochSchedule, Instructions, SlotHashes, StakeHistory, and LastRestartSlot uses are modeled alongside explicit invoke/log/hash/signature/runtime operations.

## IDL reconciliation and Semantic Coverage

Configured/common IDL locations are discovered without crawling all of `target`; repository-contained `codama.json` `idl` and `additionalIdls` references are followed without executing configuration code. Modern/legacy Anchor-compatible, Solana IDL, Quasar, and Codama/Shank forms normalize into a shared representation. Reconciliation compares program identity, instruction names/default-or-custom discriminators/arguments/return data, account order and privileges, PDA metadata, state field order/types/discriminators, event discriminators, and error codes/messages. Literal discriminators are resolved locally; arbitrary Rust constant expressions remain `UNKNOWN` rather than being evaluated or guessed. `MATCHED`, `SOURCE_ONLY`, `IDL_ONLY`, `MISMATCH`, and `UNKNOWN` are analysis statuses—not vulnerabilities.

Semantic Coverage reports `resolved / total` for parsing, Cargo/program classification, handlers/contexts, account relationships, internal and external calls, reachability, CPI targets, PDA seeds, program IDs, and IDL records. Ambiguous, dynamic, and unknown calls are separate counts so framework/runtime calls do not dilute internal-call resolution. Unresolved reasons remain visible.

## Review Complexity

The transparent weights live in `src/analysis/reviewComplexity.ts`. Contributions include reachable complexity/functions, accounts and privileges, raw/unchecked accounts, CPIs/signed/dynamic CPIs, PDAs, remaining accounts, unsafe code, manual serialization, reallocations, and unresolved/ambiguous calls. Labels are Low, Moderate, Elevated, or Heavy Review Surface only.

## Scope, duplicates, and configuration

`.sealevel-insight.json` supports `include`, `exclude`, `includeTests`, `includeGenerated`, `includeDuplicates`, and `scopeFile`. `scopefile.txt` uses include paths/globs, `+include`, and `!exclude`/`-exclude` lines. Normalized SHA-256 detects exact duplicate contents and prevents double-counting by default.

VS Code settings:

| Setting | Purpose |
|---|---|
| `includePatterns` / `excludePatterns` | source discovery scope |
| `includeTests` | include test/bench source directories |
| `maxFileSize` | skip oversized files with a diagnostic |
| `enableIdlAnalysis` / `idlPatterns` | offline IDL discovery |
| `showCodeLens` | confirmed-handler lenses |
| `autoAnalyze` | debounced save/filesystem analysis |
| `analysisConcurrency` | bounded concurrency (`0` = automatic) |
| `cargoMetadataPath` | import saved `cargo metadata --format-version 1` JSON without running Cargo |
| `compilationTarget` | record the intended target triple/label without inferring compiler cfg values |
| `cfgOptions` / `cfgKnowledge` | provide partial or complete compiler cfg evidence |
| `compilationMode` / `debugAssertions` | evaluate `cfg(test)` and `cfg(debug_assertions)` explicitly |

CLI quality policies include maximum function complexity, maximum instruction review complexity, no parse errors, no IDL mismatches, and minimum semantic coverage. They are non-security CI gates.

## Cache and performance

VS Code caches in extension storage; CLI uses ignored `.sealevel-insight-cache/`. Keys include tool/schema/parser/adapter versions, configuration, source contents, Cargo inputs, and IDL/config fingerprints. Correctness-invalidating changes miss the cache. `npm run benchmark` generates deterministic 100/500/1000-file projects and prints cold/warm timing and throughput; it is informative, not a flaky CI threshold.

## Architecture and privacy

```text
Source / metadata / Cargo / IDL
  → Rust / Solang / sBPF assembly frontends
  → language-specific symbols, calls, entrypoints and Solana semantics
  → additive framework/metadata enrichers
  → unified program model
  → calls and instruction reachability
  → metrics, scope, coverage and review profile
  → CLI, VS Code, JSON, Markdown and offline HTML
```

Core analysis modules do not import `vscode`. Normal execution performs no network access. The opt-in developer command `npm run test:real-world` is the only workflow that clones external repositories. It checks the 20-case QuickNode matrix against versioned expectations in `test/real-world/expectations`, then validates pinned Solana Foundation, Steel, and Shank/Codama targets in an ignored cache.

The VSIX verifier pins SHA-256 checksums for both bundled parser grammars. `npm run grammar:wasm` rebuilds Rust from the locked dependency and fetches the integrity-pinned Tree-sitter Solidity 1.2.13 source package before rebuilding it; both outputs must reproduce their checked-in checksums. The source references and full MIT terms are recorded in `THIRD_PARTY_NOTICES.md`.

## Validation, limitations, and roadmap

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run package`, `npm run verify:vsix`, `npm run test:integration`, `npm run test:real-world`, `npm run benchmark`, `npm audit`, and `git diff --check` before release assessment.

Static analysis cannot resolve arbitrary macro expansion or Rust constant evaluation, target/platform `cfg` predicates without a compilation profile, concrete bodies behind trait-object/generic dispatch, nontrivial compiler type inference/autoderef, runtime-selected function pointers or program IDs, or all custom serialization. State dataflow follows source-visible aliases and concrete statically resolved calls; dynamic dispatch, opaque macro-generated mutations, raw-pointer aliasing, and mutation hidden in unavailable dependencies remain explicit incomplete/unresolved evidence rather than guessed effects. Feature predicates are authoritative only when the imported Cargo metadata contains the resolved feature set; otherwise they remain unknown. Cross-package Rust calls are conservative and require indexed source plus Cargo dependency/path evidence. Solang procedural/compiler-generated behavior and assembly register values, account-buffer layouts, numeric call immediates, and indirect `callx` targets remain explicit unresolved evidence. Graph rendering is deliberately bounded. Framework and metadata adapters model evidenced common forms rather than executing procedural macros or JavaScript configuration. Sealevel Insight produces analysis diagnostics and review signals, not vulnerability findings.

Marketplace releases use the `R4Y4N3` publisher identity and remain manually reviewed and published; the repository contains no automatic publishing workflow or publishing credentials.

## Contributing and license

Prefer AST evidence, preserve confidence/evidence/location, reduce real-world failures to deterministic fixtures, and keep the shared core offline and framework-neutral. See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed; see [LICENSE](LICENSE). Bundled notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
