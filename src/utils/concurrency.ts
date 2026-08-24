export async function mapConcurrent<T, R>(items: readonly T[], requestedLimit: number, operation: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (!items.length) return [];
  const limit = Math.max(1, Math.min(items.length, Math.floor(requestedLimit) || 1));
  const results = new Array<R>(items.length); let cursor = 0;
  const worker = async () => { while (cursor < items.length) { const index = cursor++; results[index] = await operation(items[index], index); } };
  await Promise.all(Array.from({ length: limit }, worker)); return results;
}
