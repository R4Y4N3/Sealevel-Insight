# Sealevel Insight

Framework-agnostic architecture, metrics, and security-surface analysis for Solana programs.

## What it does

Sealevel Insight runs locally in VS Code. It parses Rust with Tree-sitter and reports Rust LOC and source-level complexity, detected instructions, account usage and constraints, PDA derivations, CPI sites, framework evidence, architecture relationships, and Review Surface signals. Report rows with source locations can open the corresponding Rust source. The complete report can be exported as portable JSON.

Review Surface signals are evidence for human review, not vulnerability findings.

## Supported styles

The core model does not depend on Anchor, Pinocchio, or any single Solana SDK. Optional enrichers currently recognize common patterns from:

- Anchor
- native Solana programs, including modular SDK imports
- Pinocchio

Unknown/custom frameworks still receive generic Rust and Solana analysis.

## How it works

```text
Rust source
    ↓
Tree-sitter AST
    ↓
Generic Solana semantic model
    ↓
Optional framework enrichers
    ↓
Metrics / architecture / review surface
    ↓
VS Code report
```

## Screenshots

Screenshots will be added after manual Extension Development Host testing. No screenshots are included yet.

## Commands

- **Sealevel Insight: Analyze Workspace** discovers Cargo packages and analyzes Rust sources.
- **Sealevel Insight: Export Analysis as JSON** writes the latest report to a selected file.

## Metrics

LOC counts physical source lines. nSLOC counts lines containing code outside comments and whitespace. Blank and comment lines are tracked separately. Complexity is source-level `1 + decision points`, including `if`, loops, match arms, and boolean decision operators; it is an approximation, not compiler control-flow complexity. Account, CPI, and PDA counts are based on AST and explicit syntax evidence.

Review Surface includes raw or unchecked account use, signer/writable/owner/address checks, remaining accounts, unsafe code, serialization, reallocations, CPIs, and PDA derivations. Review Surface signals are not vulnerability findings and do not include severity or exploitability conclusions.

## Installation

### Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Press `F5` in VS Code to launch the Extension Development Host, open a Rust workspace, and run the analyze command.

### VSIX

```bash
npm run package
code --install-extension sealevel-insight-0.3.0.vsix
```

## Architecture

Discovery and VS Code UI are separate from the analysis engine. Cargo metadata is used for package identity and classification. Tree-sitter produces the reusable Rust AST; generic extraction produces the unified model; optional adapters add framework evidence and constraints. Reports are deterministic in structure, contain stable semantic IDs, and retain locations for navigation.

## Current limitations

The project does not yet perform vulnerability detection, severity assessment, exploitability analysis, RPC or on-chain inspection, binary analysis, IDL reverse engineering, compiler/plugin integration, or full interprocedural data flow and call-graph analysis. Cargo workspace member expansion and some framework-generated semantics remain conservative. Dynamic CPI targets are not guessed.

## Roadmap

Likely future work includes richer framework adapters, more precise CPI/account graph visualization, a CLI and CI report mode, deployed program and IDL analysis, and optional security detectors in a later release.

## Contributing

Keep analysis framework-neutral, prefer AST evidence over substring heuristics, add focused synthetic fixtures for semantic changes, and run the full validation commands before opening a change.

## License

MIT. See [LICENSE](LICENSE).
