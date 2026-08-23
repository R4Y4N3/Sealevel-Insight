import { AccountInfo, CpiSite, FileMetric, FunctionMetric, InstructionInfo, PdaSite, ProgramUnit, SecuritySurface, WorkspaceReport } from '../model/report';
import { parseRust, ParsedRustFile } from '../parser/rustParser';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';
import { sourceComplexity } from './complexity';
import { detectFramework } from '../discovery/frameworkDetector';
import { enrichAnchor } from '../adapters/anchorAdapter';
import { enrichNative } from '../adapters/nativeAdapter';
import { enrichPinocchio } from '../adapters/pinocchioAdapter';
import { countLines } from '../utils/text';

export interface RustSourceInput { uri: string; source: string; packageName?: string; manifestUri?: string; }

export async function analyzeSources(inputs: RustSourceInput[], wasmPath: string): Promise<WorkspaceReport> {
  const parsed = await Promise.all(inputs.map(input => parseRust(input.uri, input.source, wasmPath)));
  const diagnostics = parsed.filter(file => file.error).map(file => `${file.uri}: ${file.error}`);
  const programs = new Map<string, ProgramUnit>();
  const files: FileMetric[] = [];
  parsed.forEach((file, index) => {
    const input = inputs[index];
    const metric = fileMetric(file);
    files.push(metric);
    const name = input.packageName ?? packageFromUri(input.uri);
    const program = programs.get(name) ?? emptyProgram(name, input.manifestUri);
    program.rustFiles.push(metric);
    if (file.tree) extract(file, program);
    programs.set(name, program);
  });
  const list = [...programs.values()];
  const allSurface = list.map(program => program.securitySurface);
  return {
    generatedAt: new Date(0).toISOString(),
    programs: list,
    files,
    diagnostics,
    summary: {
      rustFiles: files.length, loc: sum(files, 'lines'), codeLoc: sum(files, 'codeLines'), blankLines: sum(files, 'blankLines'), commentLines: sum(files, 'commentLines'),
      functions: list.reduce((n, p) => n + p.functions.length, 0), instructions: list.reduce((n, p) => n + p.instructions.length, 0), accounts: list.reduce((n, p) => n + p.accounts.length, 0),
      signerSignals: sumSurface(allSurface, 'signerSignals'), writableSignals: sumSurface(allSurface, 'writableSignals'), rawOrUncheckedAccounts: sumSurface(allSurface, 'rawOrUncheckedAccounts'),
      pdas: sumSurface(allSurface, 'pdaSites', true), cpis: sumSurface(allSurface, 'cpiSites', true), pdaSignedCpis: allSurface.reduce((n, s) => n + s.cpiSites.filter(cpi => cpi.pdaSigned).length, 0), unsafeBlocks: sumSurface(allSurface, 'unsafeBlocks')
    }
  };
}

function extract(file: ParsedRustFile, program: ProgramUnit): void {
  const root = file.tree!.rootNode;
  const source = file.source;
  const uri = file.uri;
  program.frameworkEvidence.push(...detectFramework(source, uri), ...enrichPinocchio(source), ...enrichNative(source));
  const anchor = enrichAnchor(root, uri);
  program.instructions.push(...anchor.instructions);
  program.accounts.push(...anchor.accounts);
  for (const fn of descendants(root, 'function_item')) {
    const name = nodeText(field(fn, 'name'));
    const metric: FunctionMetric = { name, location: loc(uri, fn), lines: fn.endPosition.row - fn.startPosition.row + 1, complexity: sourceComplexity(fn), parameters: descendants(fn, 'parameter').length, isPublic: nodeText(field(fn, 'visibility_modifier')).startsWith('pub'), isUnsafe: fn.text.includes('unsafe') };
    program.functions.push(metric);
    if (fn.text.includes('process_instruction') || fn.text.includes('entrypoint!')) program.instructions.push({ name, location: metric.location, confidence: 0.8, evidence: ['native/custom entrypoint pattern'], functionName: name });
    extractSites(fn, metric, program.securitySurface, source, uri);
  }
  for (const type of ['AccountInfo', 'AccountView', 'Signer', 'UncheckedAccount', 'Account<', 'InterfaceAccount', 'Program<', 'SystemAccount']) {
    for (const index of indexesOf(source, type)) program.accounts.push({ type, location: offsetLocation(uri, source, index, index + type.length), confidence: 0.7, evidence: ['account-related type usage'] });
  }
  program.securitySurface.unsafeBlocks += descendants(root, 'unsafe_block').length;
  program.securitySurface.manualSerialization += Number(/(try_from_slice|serialize|deserialize|borsh)/.test(source));
}

function extractSites(fn: RustNode, metric: FunctionMetric, surface: SecuritySurface, source: string, uri: string): void {
  const text = fn.text;
  const addPda = (evidence: string, confidence: number) => surface.pdaSites.push({ location: metric.location, functionName: metric.name, evidence: [evidence], confidence });
  const addCpi = (evidence: string, signed: boolean, target?: string) => surface.cpiSites.push({ location: metric.location, functionName: metric.name, evidence: [evidence], pdaSigned: signed, target, confidence: 0.85 });
  if (/find_program_address|create_program_address|seeds\s*=|signer_seeds/.test(text)) addPda('PDA construction or validation signal', 0.85);
  if (/invoke_signed|CpiContext::new_with_signer/.test(text)) addCpi('signed CPI pattern', true);
  else if (/\binvoke\b|CpiContext::new/.test(text)) addCpi('CPI invocation pattern', false);
  const occurrence = (pattern: RegExp) => (text.match(pattern) ?? []).length;
  surface.signerSignals += occurrence(/is_signer|Signer|signer\s*\)|signer\s*=|has_one/g);
  surface.writableSignals += occurrence(/is_writable|mut\s+|writable/g);
  surface.ownerValidationSignals += occurrence(/\.owner\(|owner\s*=|owner\s*==/g);
  surface.addressValidationSignals += occurrence(/address\s*=|key\(\)\s*==|Pubkey/g);
  surface.remainingAccounts += occurrence(/remaining_accounts/g);
  surface.rawOrUncheckedAccounts += occurrence(/UncheckedAccount|AccountInfo|AccountView/g);
  surface.manualAccountIteration += occurrence(/accounts\.iter|next_account_info|remaining_accounts\.iter/g);
  surface.manualSignerChecks += occurrence(/is_signer/g);
  surface.manualOwnerChecks += occurrence(/\.owner\(|owner\s*==/g);
  surface.manualWritableChecks += occurrence(/is_writable/g);
  void source; void uri;
}

function emptyProgram(name: string, manifestUri?: string): ProgramUnit {
  return { name, manifestUri, rustFiles: [], functions: [], instructions: [], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualSerialization: 0, cpiSites: [], pdaSites: [] } };
}

function fileMetric(file: ParsedRustFile): FileMetric {
  const counts = countLines(file.source);
  const root = file.tree?.rootNode;
  return { uri: file.uri, ...counts, functions: root ? descendants(root, 'function_item').length : 0, structs: root ? descendants(root, 'struct_item').length : 0, enums: root ? descendants(root, 'enum_item').length : 0, traits: root ? descendants(root, 'trait_item').length : 0, implBlocks: root ? descendants(root, 'impl_item').length : 0, unsafeBlocks: root ? descendants(root, 'unsafe_block').length : 0, macroInvocations: root ? descendants(root, 'macro_invocation').length : 0, parseError: file.error };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function offsetLocation(uri: string, source: string, start: number, end: number) { const before = source.slice(0, start).split(/\r?\n/); const endLines = source.slice(0, end).split(/\r?\n/); return { uri, startLine: before.length, startColumn: before.at(-1)!.length, endLine: endLines.length, endColumn: endLines.at(-1)!.length }; }
function indexesOf(source: string, value: string): number[] { const result: number[] = []; let index = source.indexOf(value); while (index >= 0) { result.push(index); index = source.indexOf(value, index + value.length); } return result; }
function packageFromUri(uri: string): string { return uri.split('/').slice(-2, -1)[0] || 'workspace'; }
function sum(files: FileMetric[], key: 'lines' | 'codeLines' | 'blankLines' | 'commentLines'): number { return files.reduce((total, file) => total + file[key], 0); }
function sumSurface(surfaces: SecuritySurface[], key: keyof SecuritySurface, array = false): number { return surfaces.reduce((total, surface) => total + (array ? (surface[key] as unknown[]).length : surface[key] as number), 0); }
