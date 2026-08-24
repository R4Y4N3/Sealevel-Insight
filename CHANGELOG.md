# Changelog

## 0.6.0

- Added Reachability v2: tri-state Cargo feature/`cfg` filtering, evidence-backed typed inherent/trait method resolution, recursive internal-dependency surfaces, and per-call unresolved explanations/candidates.
- Added cross-package functions, CPIs, signed/dynamic CPIs, PDAs, state/runtime operations, external programs, and completeness evidence to instruction dossiers, reports, diffs, Explorer views, review scoring, schema validation, and invariants.
- Added deterministic shortest reachability witnesses for functions and semantic sites, cross-package call-chain graph edges, and explicit partial/complete compilation profiles for target, test, debug-assertion, and compiler-emitted cfg evidence.
- Added Dispatch & Indirect Calls v2: associated functions, `Self`/UFCS paths, generic-bound and trait-object contracts, simple alias/deref evidence, closure/function-item bindings, runtime function-pointer uncertainty, macro-origin records, and deterministic recursion components.
- Added complete TOML-backed Cargo workspace/package/target/dependency/feature modeling with recoverable diagnostics.
- Added module-aware Rust symbols, conservative call resolution, cycle-safe instruction reachability, and explicit ambiguous/unresolved/dynamic coverage loss.
- Added unified account, state, serialization, CPI, PDA, external-program, sysvar, runtime-operation, event, error, capability, and review-complexity models.
- Deepened Anchor, native Rust, Pinocchio, Steel, and Quasar enrichment; added Codama/Shank metadata enrichment and source/IDL reconciliation.
- Added full CLI commands/options/policy exit codes, deterministic local caches, baselines/diffs, scope configuration, duplicate hashing, and standalone offline HTML graph modes.
- Expanded VS Code commands, Explorer hierarchy, semantic CodeLens/hovers, diagnostics, cancellation, debounced auto-analysis, bounded concurrency, and persisted cache/report behavior.
- Added strict report-schema validation, 96 deterministic tests, packaged CLI/Extension Host integration, a 20-case/449-assertion QuickNode ground-truth matrix, pinned independent Foundation/Steel/Shank validation, benchmarks, VSIX cleanliness checks, and an original 256×256 icon.
- Fixed packaged CommonJS parser initialization, root-level VS Code source discovery, workspace-relative test exclusion, scopefile merging, lexical marker counting, and percentage-policy/report rendering errors.

## 0.5.0

- Added TOML-backed Cargo workspace and dependency graph primitives.
- Added Steel and Quasar additive evidence adapters.
- Added conservative call graph and IDL normalization/reconciliation primitives.
- Added semantic regression coverage and package/release validation hooks.

## 0.4.0

- Added a shared offline CLI for analysis, scope, and report diff workflows.
- Added versioned report metadata, semantic coverage, scope hashing, and portable serialization.
- Added native Explorer, CodeLens, hover support, exact AST call-site reporting, and self-contained packaging verification.
- Added public-project documentation, CI, support policy, and third-party notices.

## 0.3.0

- Improved Tree-sitter runtime packaging and parser resource resolution.
- Added exact AST-based CPI and PDA call-site extraction.
- Added Anchor context-scoped account relationships and richer constraints.
- Corrected visibility, line metrics, review counters, stable IDs, and graph deduplication.
- Added configurable include/exclude patterns, portable JSON metadata, CI, and expanded tests.

## 0.2.0

- Added structured evidence.
- Added Cargo classification.
- Added Anchor constraints.
- Added architecture graph.
- Added source navigation.
- Added JSON export.

## 0.1.0

- Initial MVP with Tree-sitter Rust parsing, generic metrics, framework evidence, and Security Surface reporting.
