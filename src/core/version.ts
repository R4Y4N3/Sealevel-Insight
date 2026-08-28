/** Single source of truth for the tool/schema version. Keep in lockstep with package.json. */
export const TOOL_VERSION = '0.8.0';
export const SCHEMA_VERSION = '0.8.0';

/** Stored reports and baselines are usable only when their exact schema is current. */
export function isCurrentSchemaVersion(value: unknown): boolean { return value === SCHEMA_VERSION; }
