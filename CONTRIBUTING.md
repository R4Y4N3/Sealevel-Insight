# Contributing

Keep the core framework-neutral and offline. Framework support belongs in additive adapters; generic extraction must remain useful when no adapter recognizes a project.

Every semantic conclusion should retain a source location, confidence, and evidence where possible. Prefer Tree-sitter AST traversal over regular expressions. Add focused synthetic fixtures and exact assertions for semantic changes.

Run `npm install`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run package` before submitting a change. Do not add network calls, telemetry, RPC access, or AI dependencies to the analysis engine.
