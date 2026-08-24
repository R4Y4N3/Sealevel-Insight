import { SourceLocation } from '../model/sourceLocation';

export type WebviewMessage = { type: 'openSource'; location: SourceLocation };

export function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  const location = message.location as Record<string, unknown> | undefined;
  return message.type === 'openSource' && !!location && typeof location.uri === 'string'
    && Number.isInteger(location.startLine) && Number.isInteger(location.startColumn)
    && Number.isInteger(location.endLine) && Number.isInteger(location.endColumn)
    && (location.startLine as number) >= 1 && (location.endLine as number) >= (location.startLine as number)
    && (location.startColumn as number) >= 0 && (location.endColumn as number) >= 0
    && ((location.endLine as number) > (location.startLine as number) || (location.endColumn as number) >= (location.startColumn as number));
}
