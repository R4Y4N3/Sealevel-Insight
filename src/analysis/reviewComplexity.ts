import { Evidence, InstructionInfo, ProgramUnit, ReviewComplexity, ReviewHotspot } from '../model/report';

// Review Complexity estimates audit effort, not vulnerability severity.
export const REVIEW_WEIGHTS = {
  reachableComplexity: 1, reachableFunctions: 2, accounts: 2, writableAccounts: 3, signerAccounts: 2,
  rawUncheckedAccounts: 5, cpis: 4, signedCpis: 4, dynamicCpis: 6, pdas: 2, remainingAccounts: 8,
  unsafe: 8, manualSerialization: 3, realloc: 4, unresolvedCalls: 5, ambiguousCalls: 7
} as const;

export function applyReviewComplexity(program: ProgramUnit): ReviewHotspot[] {
  const hotspots: ReviewHotspot[] = [];
  for (const instruction of program.instructions) {
    const review = instructionComplexity(program, instruction);
    if (instruction.reachableSurface) instruction.reachableSurface.reviewComplexity = review;
    hotspots.push({ id: `hotspot:instruction:${instruction.id ?? instruction.name}`, label: instruction.name, score: review.score, reasons: review.components.filter(item => item.contribution > 0).map(item => `+${item.contribution} ${item.label}`), location: instruction.location });
  }
  for (const fn of program.functions) {
    const calls = program.callGraph?.calls.filter(call => call.caller === fn.qualifiedName) ?? [];
    const unknownCalls = calls.filter(call => call.status === 'unresolved' || call.status === 'dynamic');
    const ambiguousCalls = calls.filter(call => call.status === 'ambiguous');
    const reasons: string[] = [];
    if (fn.complexity >= 10) reasons.push(`+${fn.complexity} cyclomatic complexity`);
    if (fn.isUnsafe) reasons.push(`+${REVIEW_WEIGHTS.unsafe} unsafe function`);
    if (unknownCalls.length) reasons.push(`+${unknownCalls.length * REVIEW_WEIGHTS.unresolvedCalls} unknown/dynamic call surface`);
    if (ambiguousCalls.length) reasons.push(`+${ambiguousCalls.length * REVIEW_WEIGHTS.ambiguousCalls} ambiguous call surface`);
    const cpis = program.securitySurface.cpiSites.filter(site => site.functionName === fn.name).length;
    if (cpis) reasons.push(`+${cpis * REVIEW_WEIGHTS.cpis} ${cpis} CPI site${cpis === 1 ? '' : 's'}`);
    if (reasons.length) hotspots.push({ id: `hotspot:function:${fn.qualifiedName ?? fn.name}:${fn.location.uri}:${fn.location.startLine}`, label: fn.name, score: fn.complexity + (fn.isUnsafe ? REVIEW_WEIGHTS.unsafe : 0) + cpis * REVIEW_WEIGHTS.cpis + unknownCalls.length * REVIEW_WEIGHTS.unresolvedCalls + ambiguousCalls.length * REVIEW_WEIGHTS.ambiguousCalls, reasons, location: fn.location });
  }
  program.reviewComplexity = aggregateComplexity(program.instructions.map(instruction => instruction.reachableSurface?.reviewComplexity).filter((item): item is ReviewComplexity => !!item));
  return hotspots.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function instructionComplexity(program: ProgramUnit, instruction: InstructionInfo): ReviewComplexity {
  const surface = instruction.reachableSurface;
  const cross = surface?.crossPackageSurfaces ?? [];
  const accountIds = new Set(surface?.accounts ?? []);
  const accounts = program.accounts.filter(account => account.id && accountIds.has(account.id));
  const values: Array<[keyof typeof REVIEW_WEIGHTS, string, number]> = [
    ['reachableComplexity', 'reachable cyclomatic complexity', surface?.reachableCyclomaticComplexity ?? 0],
    ['reachableFunctions', 'reachable functions', surface?.functions.length ?? 0],
    ['accounts', 'accounts', accounts.length], ['writableAccounts', 'writable accounts', accounts.filter(account => account.writable).length],
    ['signerAccounts', 'signer accounts', accounts.filter(account => account.signer).length], ['rawUncheckedAccounts', 'raw/unchecked accounts', accounts.filter(account => account.raw || account.unchecked).length],
    ['cpis', 'CPIs', (surface?.cpis.length ?? 0) + cross.reduce((sum, item) => sum + item.cpiIds.length, 0)], ['signedCpis', 'signed CPIs', (surface?.signedCpis?.length ?? 0) + cross.reduce((sum, item) => sum + item.signedCpiIds.length, 0)], ['dynamicCpis', 'dynamic CPIs', (surface?.dynamicCpis?.length ?? 0) + cross.reduce((sum, item) => sum + item.dynamicCpiIds.length, 0)],
    ['pdas', 'PDAs', (surface?.pdas.length ?? 0) + cross.reduce((sum, item) => sum + item.pdaIds.length, 0)], ['remainingAccounts', 'remaining_accounts use', instruction.remainingAccounts ? 1 : 0],
    ['unsafe', 'unsafe surface', (surface?.unsafeFunctions?.length ?? 0) + (surface?.unsafeBlocks ?? 0)], ['manualSerialization', 'manual serialization', surface?.serializationSites?.length ?? 0],
    ['realloc', 'reallocation', surface?.reallocSites?.length ?? 0], ['unresolvedCalls', 'unresolved calls', surface?.unresolvedCalls?.length ?? 0], ['ambiguousCalls', 'ambiguous calls', surface?.ambiguousCalls?.length ?? 0]
  ];
  const components = values.map(([key, label, value]) => ({ label, value, weight: REVIEW_WEIGHTS[key], contribution: value * REVIEW_WEIGHTS[key] })).filter(item => item.value > 0);
  const score = components.reduce((sum, item) => sum + item.contribution, 0);
  return { score, level: level(score), components };
}

function aggregateComplexity(items: ReviewComplexity[]): ReviewComplexity { const score = items.reduce((sum, item) => sum + item.score, 0); return { score, level: level(score), components: [{ label: 'instruction review complexity total', value: score, weight: 1, contribution: score }] }; }
function level(score: number): ReviewComplexity['level'] { return score < 20 ? 'Low Review Surface' : score < 50 ? 'Moderate Review Surface' : score < 90 ? 'Elevated Review Surface' : 'Heavy Review Surface'; }

export function capability(id: string, label: string, evidence: Evidence[]): { id: string; label: string; evidence: Evidence[] } { return { id, label, evidence }; }
