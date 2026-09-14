# Changelog

## 0.8.1

- Added the separately generated npm CLI distribution with dual-use disclosure, clean-install validation, and Cargo metadata workflow documentation.
- Synchronized the tool and report schema version with the `0.8.1` release package.

## 0.8.0

- Added an evidence-bounded Solang frontend for `.sol` sources: contract/program identity, public/external instructions and constructors, account annotations, PDA seeds/bumps, local calls, Solana external calls, SPL Token CPIs, events, metrics, and reachability evidence.
- Added a deterministic hand-written sBPF assembly frontend for `.s`, `.S`, `.asm`, and `.sbpf`: entrypoints, function labels, direct and register-indirect calls, branch complexity, Solana syscalls, dynamic/signed CPIs, PDA derivation, and memory-access evidence.
- Added conservative language detection that records metrics but refuses to classify ordinary EVM Solidity or generic assembly as a Solana program without multiple source-level signals.
- Integrated non-Rust sources with workspace discovery, CLI/extension analysis, caches, reports, diffs, audit manifests, architecture, review hotspots, VSIX packaging, and source-language summaries while retaining backward-compatible `rustFiles` fields.
- Bundled the Tree-sitter Solidity 1.2.13 WebAssembly grammar for fully local/offline parsing and added its complete MIT notice.
- Aligned Solang SPL Token classification with the current official API: read helpers no longer appear as CPIs, unsupported operations remain unresolved, and annotated constructor parameters feed deterministic PDA seed/bump evidence.
- Aligned assembly parsing with the current Anza sBPF opcode table, including PQR instructions, `lddw`, `jset`, and 32-bit jumps; generic eBPF is no longer classified as a Solana program without Solana-specific evidence.
- Added a deterministic non-Rust ground-truth corpus, current upstream Solang validation, reproducible dual-grammar builds with pinned integrity checks, strict stored-report schema invalidation, and a minimal npm package allowlist.
- Added a dedicated, dual-use-declared npm CLI package with a clean-install/offline fixture validation path; the VS Code extension remains a separate VSIX artifact.
- Removed an obsolete, non-extension `allowScripts` manifest block that named development-only signing and keychain packages not shipped or used by Sealevel Insight.
- Completed the bundled third-party notices for the TOML parser, Web Tree-sitter runtime, and Tree-sitter Rust grammar.
- Clarified the confirmed Marketplace publisher identity and manual release policy in the packaged README.

## 0.7.2

- Declared explicit Restricted Mode support and local-filesystem-only virtual workspace behavior in the extension manifest.
- Replaced the report webview's predictable nonce with a cryptographically random nonce.
- Removed `unsafe-inline` from standalone report exports by deriving deterministic SHA-256 CSP hashes from the final inline style and script content.
- Strengthened packaged-VSIX verification so release artifacts must retain explicit activation and workspace capability metadata.

## 0.7.1

- Added explicit activation events for every contributed command and Explorer view to harden Marketplace compatibility.
- Corrected the Marketplace publisher and public support metadata.
- Strengthened VSIX verification against missing activation metadata and development-only artifacts.

## 0.7.0

- Added Token & Asset Flow v2: evidence-backed per-instruction token/asset flows with operation, token program, source/destination/mint/authority/delegate/new-authority roles, amount/decimals expressions, authority type, PDA signing correlation, direct/transitive path classification, completeness status, and explicit unresolved reasons.
- Role resolution uses positively identified signatures only - Anchor `CpiContext` account-struct fields, known SPL/Token-2022 instruction constructors, or documented builder argument orders; unrecognized calls keep every role unresolved instead of guessing positions.
- Flows integrate into instruction dossiers, the audit manifest scope (totals, instructions-with-flows, SPL/Token-2022 program counts, category breakdown), workspace summary counts, capabilities, baseline diffs, Markdown reports, the standalone offline HTML cockpit, and the VS Code Explorer/report panel.
- Added semantic invariants for asset flows: CPI/instruction/account/PDA reference integrity, duplicate detection, resolved-role account binding, complete/unresolved consistency, and manifest count agreement.
- Fixed Token-2022 CPI target classification when the API or program expression spells the kind with hyphens (`token-2022`) in addition to underscores.
- Signed Anchor wrapper CPIs (`CpiContext::new_with_signer`) now record PDA signing evidence consistently with native `invoke_signed` sites.
- Versioned the report schema/tool at 0.7.0; cache entries from older schemas are ignored rather than partially restored, and baseline diffs require matching schema versions with an explicit re-baseline error.
- VSIX packaging and verification now derive the artifact name and expected version from package metadata instead of hardcoded version strings.

Post-release main-line work now attributed to this version:

- Added Reachability v2: tri-state Cargo feature/`cfg` filtering, evidence-backed typed inherent/trait method resolution, recursive internal-dependency surfaces, and per-call unresolved explanations/candidates.
- Added cross-package functions, CPIs, signed/dynamic CPIs, PDAs, state/runtime operations, external programs, and completeness evidence to instruction dossiers, reports, diffs, Explorer views, review scoring, schema validation, and invariants.
- Added deterministic shortest reachability witnesses for functions and semantic sites, cross-package call-chain graph edges, and explicit partial/complete compilation profiles for target, test, debug-assertion, and compiler-emitted cfg evidence.
- Added Dispatch & Indirect Calls v2: associated functions, `Self`/UFCS paths, generic-bound and trait-object contracts, simple alias/deref evidence, closure/function-item bindings, runtime function-pointer uncertainty, macro-origin records, and deterministic recursion components.
- Added State & Account Dataflow v2 with field-level reads/writes, data and lamport access, lifecycle operations, alias/call evidence paths, and instruction-account bindings.
- Added Quasar framework/ABI v2 coverage for return data, account relations, idempotent initialization, remaining-account contracts, method-style CPI builders, multi-signer invocation, and generated PDA seed helpers; remaining-account review scoring now applies its documented weight.
- Added Steel semantics v2 for chained account validations, sysvars and PDA seeds, program-account helper CPIs and lifecycle, lamport transfer/close helpers, typed account evidence, and concrete `error!` enum variants.
- Added strict report-schema validation, 120 deterministic tests, packaged CLI/Extension Host integration, a 20-case/449-assertion QuickNode ground-truth matrix, pinned independent Foundation/Steel/Shank validation, benchmarks, VSIX cleanliness checks, and an original 256×256 icon.

## 0.6.0

- Added complete TOML-backed Cargo workspace/package/target/dependency/feature modeling with recoverable diagnostics.
- Added module-aware Rust symbols, conservative call resolution, cycle-safe instruction reachability, and explicit ambiguous/unresolved/dynamic coverage loss.
- Added unified account, state, serialization, CPI, PDA, external-program, sysvar, runtime-operation, event, error, capability, and review-complexity models.
- Deepened Anchor, native Rust, Pinocchio, Steel, and Quasar enrichment; added Codama/Shank metadata enrichment and source/IDL reconciliation.
- Added full CLI commands/options/policy exit codes, deterministic local caches, baselines/diffs, scope configuration, duplicate hashing, and standalone offline HTML graph modes.
- Expanded VS Code commands, Explorer hierarchy, semantic CodeLens/hovers, diagnostics, cancellation, debounced auto-analysis, bounded concurrency, and persisted cache/report behavior.
- Added strict report-schema validation, 65 deterministic tests, packaged CLI/Extension Host integration, a 20-case/449-assertion QuickNode ground-truth matrix, pinned independent Foundation/Steel/Shank validation, benchmarks, VSIX cleanliness checks, and an original 256×256 icon.
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
