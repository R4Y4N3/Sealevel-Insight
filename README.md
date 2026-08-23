# Sealevel Insight

Sealevel Insight is a local, framework-agnostic VS Code extension for architecture, metrics, and security-surface analysis of Solana Rust programs.

## v0.1

The MVP discovers Rust sources, parses them with Tree-sitter Rust, groups analysis per package, and reports Rust metrics, function source-level complexity, Solana instruction/account signals, PDA and CPI sites, and review-surface signals. Anchor, Pinocchio, and native Solana patterns have optional enrichers. Unknown frameworks still receive generic Rust and Solana analysis.

Security Surface and Review Signals are evidence for human review, not vulnerability findings or exploitability conclusions.

Complexity is deliberately approximate: `1 + decision points`, counting `if`, loop expressions, match arms, and boolean `&&`/`||` expressions found in a function's syntax tree.

## Run locally

Run `npm install`, then `npm run typecheck`, `npm test`, and `npm run build`. Press `F5` in VS Code to launch the Extension Development Host, open a Rust workspace, and run **Sealevel Insight: Analyze Workspace** from the Command Palette.

Build a local VSIX with `npm run package`.

## Limitations

This release has no vulnerability scanner, AI, RPC or deployed-binary analysis, IDL reverse engineering, interprocedural data flow, call graph, graph visualization, or compiler/plugin integration. Dynamic targets and framework semantics are reported only when supported by direct syntax evidence.
