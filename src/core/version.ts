/** Single source of truth for the tool/schema version. Keep in lockstep with package.json. */
export const TOOL_VERSION = '0.7.0';
export const SCHEMA_VERSION = '0.7.0';

/** True when a report was produced by a structurally compatible older schema. */
export function isCompatibleSchemaVersion(value: unknown): boolean {
  return value === SCHEMA_VERSION || value === '0.6.0';
}
