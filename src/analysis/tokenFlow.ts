import {
  AccountInfo,
  CpiOperationCategory,
  CpiSite,
  Evidence,
  ProgramUnit,
  TokenAssetAuthorityType,
  TokenAssetFlow,
  TokenAssetFlowBinding
} from '../model/report';
import { SourceLocation } from '../model/sourceLocation';
import { splitRustExpressions } from '../utils/text';

/**
 * Token & Asset Flow v2.
 *
 * Builds evidence-backed token/asset flows from the existing CPI sites, account
 * relations, PDA model, call graph, and reachability witnesses. Roles bind only
 * when the exact CPI API signature is positively identified through one of:
 *   1. an Anchor CpiContext account-struct literal (named fields),
 *   2. a known SPL/Token-2022 instruction-constructor call (documented order),
 *   3. a known builder/method-style argument list (documented order).
 * Otherwise every role stays unresolved with an explicit reason. Argument
 * positions are never guessed from unnamed calls.
 */

const TOKEN_CATEGORIES: CpiOperationCategory[] = [
  'token-transfer', 'token-mint', 'token-burn', 'authority-change', 'freeze', 'thaw',
  'token-account-create', 'token-account-recovery', 'account-close'
];

/** Anchor CpiContext account structs: documented field -> flow role. */
const ANCHOR_STRUCT_FIELDS: Record<string, Record<string, string>> = {
  Transfer: { from: 'source', to: 'destination', authority: 'authority' },
  TransferChecked: { from: 'source', mint: 'mint', to: 'destination', authority: 'authority' },
  MintTo: { mint: 'mint', to: 'destination', authority: 'authority' },
  MintToChecked: { mint: 'mint', to: 'destination', authority: 'authority' },
  Burn: { from: 'source', authority: 'authority' },
  BurnChecked: { from: 'source', mint: 'mint', authority: 'authority' },
  CloseAccount: { account: 'source', destination: 'destination', authority: 'authority' },
  SetAuthority: { account: 'source', authority: 'authority', new_authority: 'newAuthority' },
  Approve: { from: 'source', delegate: 'delegate', authority: 'authority' },
  ApproveChecked: { from: 'source', mint: 'mint', delegate: 'delegate', authority: 'authority' },
  Revoke: { from: 'source', authority: 'authority' },
  FreezeAccount: { account: 'source', mint: 'mint', freeze_authority: 'authority' },
  ThawAccount: { account: 'source', mint: 'mint', freeze_authority: 'authority' },
  InitializeAccount: { account: 'source', mint: 'mint', owner: 'authority' },
  InitializeAccount2: { account: 'source', mint: 'mint', owner: 'authority' },
  InitializeAccount3: { account: 'source', mint: 'mint', owner: 'authority' },
  InitializeMint: { mint: 'mint', rent: 'authority' },
  InitializeMint2: { mint: 'mint', rent: 'authority' }
};

/** Known SPL/Token-2022 instruction constructors: documented positional roles (index 0 is program id). */
const NATIVE_CONSTRUCTORS: Record<string, string[]> = {
  transfer: ['program', 'source', 'destination', 'authority'],
  transfer_checked: ['program', 'source', 'mint', 'destination', 'authority'],
  mint_to: ['program', 'mint', 'destination', 'authority'],
  mint_to_checked: ['program', 'mint', 'destination', 'authority'],
  burn: ['program', 'source', 'authority'],
  burn_checked: ['program', 'source', 'mint', 'authority'],
  approve: ['program', 'source', 'delegate', 'authority'],
  approve_checked: ['program', 'source', 'mint', 'delegate', 'authority'],
  revoke: ['program', 'source', 'authority'],
  close_account: ['program', 'source', 'destination', 'authority'],
  freeze_account: ['program', 'source', 'mint', 'authority'],
  thaw_account: ['program', 'source', 'mint', 'authority'],
  set_authority: ['program', 'source', 'newAuthority', 'authority'],
  initialize_account: ['program', 'source', 'mint', 'authority'],
  initialize_account2: ['program', 'source', 'mint', 'authority'],
  initialize_account3: ['program', 'source', 'mint', 'authority'],
  initialize_mint: ['program', 'mint'],
  initialize_mint2: ['program', 'mint']
};

/** Amount/decimal argument offsets relative to the end of the role list, per strategy. */
const NATIVE_AMOUNT_OFFSET: Record<string, { amount?: number; decimals?: number }> = {
  transfer: { amount: -1 }, transfer_checked: { amount: -1, decimals: -2 },
  mint_to: { amount: -1 }, mint_to_checked: { amount: -1, decimals: -2 },
  burn: { amount: -1 }, burn_checked: { amount: -1, decimals: -2 },
  approve: { amount: -1 }, approve_checked: { amount: -1, decimals: -2 }
};

/** Method/builder-style wrappers already recognized by the project (args after the context/builder receiver). */
const BUILDER_SIGNATURES: Record<string, string[]> = {
  transfer: ['source', 'destination', 'authority'],
  mint_to: ['mint', 'destination', 'authority'],
  burn: ['source', 'authority'],
  close_account: ['source', 'destination', 'authority'],
  approve: ['source', 'delegate', 'authority'],
  revoke: ['source', 'authority'],
  freeze_account: ['source', 'mint', 'authority'],
  thaw_account: ['source', 'mint', 'authority']
};

const BUILDER_AMOUNT_INDEX: Record<string, number> = {
  transfer: 3, mint_to: 3, burn: 2, approve: 3
};

/** anchor_spl wrapper calls pass (ctx, amount[, decimals]); the analyzer records them without ctx. */
const WRAPPER_VALUE_INDEX: Record<string, { amount?: number; decimals?: number }> = {
  transfer: { amount: 0 }, transfer_checked: { amount: 0, decimals: 1 },
  mint_to: { amount: 0 }, mint_to_checked: { amount: 0, decimals: 1 },
  burn: { amount: 0 }, burn_checked: { amount: 0, decimals: 1 },
  approve: { amount: 0 }, approve_checked: { amount: 0, decimals: 1 }
};

export function buildAssetFlows(programs: ProgramUnit[]): void {
  for (const program of programs) {
    const flows: TokenAssetFlow[] = [];
    for (const instruction of program.instructions) {
      const surface = instruction.reachableSurface;
      if (!surface) continue;
      const instructionId = instruction.id ?? instruction.name;
      const contextAccounts = contextAccountsFor(program, instruction.contextType);
      const seenCpis = new Set<string>();
      for (const cpiId of surface.cpis) {
        if (seenCpis.has(cpiId)) continue;
        seenCpis.add(cpiId);
        const cpi = program.securitySurface.cpiSites.find(site => site.id === cpiId);
        if (!cpi || !isTokenCpi(cpi)) continue;
        flows.push(buildFlow(program, instructionId, cpi, surface.directHandler ?? '', contextAccounts));
      }
    }
    program.assetFlows = flows.sort((a, b) => a.id.localeCompare(b.id));
    program.instructionDossiers ??= [];
  }
}

function isTokenCpi(cpi: CpiSite): boolean {
  return !!cpi.operationCategory && TOKEN_CATEGORIES.includes(cpi.operationCategory)
    && !!cpi.targetKind && (cpi.targetKind === 'spl-token' || cpi.targetKind === 'token-2022');
}

function contextAccountsFor(program: ProgramUnit, contextType: string | undefined): AccountInfo[] {
  return contextType ? program.accounts.filter(account => account.contextType === contextType) : [];
}

function buildFlow(program: ProgramUnit, instructionId: string, cpi: CpiSite, handler: string, contextAccounts: AccountInfo[]): TokenAssetFlow {
  const evidence: Evidence[] = [...cpi.evidence];
  const unresolvedReasons: string[] = [];
  const apiShort = cpi.invocationApi?.split(/::|\./).at(-1)?.replace(/::<.*$/, '') ?? '';
  const operationKey = operationOf(cpi);
  const roles = resolveRoles(cpi, apiShort, operationKey, contextAccounts, unresolvedReasons, evidence);
  const authorityType = resolveAuthorityType(program, cpi, roles, unresolvedReasons, evidence);
  const complete = !unresolvedReasons.length;
  const id = `asset-flow:${program.name}:${instructionId}:${cpi.id ?? `${cpi.location.uri}:${cpi.location.startLine}:${cpi.location.startColumn}`}`;
  return {
    id,
    instructionId,
    program: program.name,
    cpiId: cpi.id,
    direct: !!cpi.functionName && cpi.functionName === handler.split('::').at(-1),
    operation: cpi.operation,
    operationCategory: cpi.operationCategory,
    tokenProgram: cpi.targetKind === 'token-2022' ? 'token-2022' : 'spl-token',
    ...roles.bindings,
    authorityType,
    pdaSigned: cpi.pdaSigned,
    signerPdaIds: [...(cpi.signerPdaIds ?? [])],
    functionPath: [],
    callPath: [],
    location: cpi.location,
    confidence: cpi.confidence,
    evidence,
    complete,
    unresolvedReasons
  };
}

interface RoleResolution {
  bindings: Pick<TokenAssetFlow, 'source' | 'destination' | 'mint' | 'authority' | 'delegate' | 'newAuthority'>;
  amount?: string;
  decimals?: string;
}

function resolveRoles(
  cpi: CpiSite, apiShort: string, operationKey: string,
  contextAccounts: AccountInfo[], unresolvedReasons: string[], evidence: Evidence[]
): RoleResolution {
  const empty: RoleResolution = { bindings: {} };
  // Strategy 1: Anchor CpiContext account-struct literal (named fields — strongest evidence).
  const structMatch = findAnchorStruct(cpi);
  if (structMatch) {
    const fieldMap = ANCHOR_STRUCT_FIELDS[structMatch.struct];
    if (!fieldMap) {
      unresolvedReasons.push(`account struct ${structMatch.struct} is not a recognized SPL token account struct`);
      return empty;
    }
    const bindings = bindNamedFields(structMatch.fields, fieldMap, contextAccounts, unresolvedReasons, evidence, cpi.location);
    const valueIndexes = WRAPPER_VALUE_INDEX[operationKey] ?? {};
    evidence.push({ description: `roles resolved from ${apiShort || 'CPI'} account struct ${structMatch.struct}`, location: cpi.location });
    return {
      bindings,
      amount: valueIndexes.amount !== undefined ? nthArgument(cpi, structMatch.argumentBase + valueIndexes.amount) : undefined,
      decimals: valueIndexes.decimals !== undefined ? nthArgument(cpi, structMatch.argumentBase + valueIndexes.decimals) : undefined
    };
  }
  // Strategy 2: known native SPL/Token-2022 instruction constructor.
  const native = findNativeConstructor(cpi, operationKey);
  if (native) {
    const roleNames = NATIVE_CONSTRUCTORS[operationKey];
    if (!roleNames) {
      unresolvedReasons.push(`native constructor ${native.api} has no modeled role layout`);
      return empty;
    }
    const bindings: RoleResolution['bindings'] = {};
    roleNames.forEach((role, index) => {
      if (role === 'program') return;
      const value = native.arguments[index];
      if (value === undefined) return;
      bindings[role as keyof RoleResolution['bindings']] = bind(value, contextAccounts, role, unresolvedReasons, evidence, cpi.location);
    });
    const offsets = NATIVE_AMOUNT_OFFSET[operationKey] ?? {};
    evidence.push({ description: `roles resolved from the documented ${native.api} constructor argument order`, location: cpi.location });
    return {
      bindings,
      amount: offsets.amount !== undefined ? native.arguments[native.arguments.length + offsets.amount] : undefined,
      decimals: offsets.decimals !== undefined ? native.arguments[native.arguments.length + offsets.decimals] : undefined
    };
  }
  // Strategy 3: builder/method-style argument lists with a documented order.
  const builderRoles = BUILDER_SIGNATURES[operationKey];
  const args = cpi.accountArguments ?? [];
  if (builderRoles && apiShort && args.length >= builderRoles.length && !/^ctx$|^ctx\.|^context$/i.test(args[0] ?? '')) {
    const bindings: RoleResolution['bindings'] = {};
    builderRoles.forEach((role, index) => {
      const value = args[index];
      if (value !== undefined) bindings[role as keyof RoleResolution['bindings']] = bind(value, contextAccounts, role, unresolvedReasons, evidence, cpi.location);
    });
    evidence.push({ description: `roles resolved from the documented ${apiShort} builder argument order`, location: cpi.location });
    const amountIndex = BUILDER_AMOUNT_INDEX[operationKey];
    return { bindings, amount: amountIndex !== undefined ? args[amountIndex] : undefined };
  }
  // No positively identified signature: keep every role explicitly unresolved.
  if (operationKey) unresolvedReasons.push(`${operationKey.replace(/_/g, '-')} was recognized, but its argument roles could not be established from source evidence`);
  else unresolvedReasons.push('token CPI recognized without an identified operation; roles remain unresolved');
  return empty;
}

function bind(expression: string, contextAccounts: AccountInfo[], role: string, unresolvedReasons: string[], evidence: Evidence[], location: SourceLocation): TokenAssetFlowBinding {
  // Accessor suffixes (.to_account_info(), .key(), &) do not change which
  // instruction account an expression refers to; the base identifier does.
  const trimmed = expression.trim();
  const base = /^&?(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.exec(trimmed)?.[1];
  const contextName = /^ctx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)/.exec(trimmed)?.[1];
  const name = contextName ?? base;
  const account = name ? contextAccounts.find(item => item.name === name) : undefined;
  if (!account?.id) {
    unresolvedReasons.push(`${role} expression \`${expression}\` could not be bound to a known instruction account`);
    evidence.push({ description: `role ${role} kept unresolved for expression ${expression}`, location });
    return { expression, resolved: false };
  }
  return { accountId: account.id, accountName: account.name, expression, resolved: true };
}

function bindNamedFields(fields: Array<[string, string]>, fieldMap: Record<string, string>, contextAccounts: AccountInfo[], unresolvedReasons: string[], evidence: Evidence[], location: SourceLocation): RoleResolution['bindings'] {
  const bindings: RoleResolution['bindings'] = {};
  for (const [fieldName, expression] of fields) {
    const role = fieldMap[fieldName];
    if (!role) continue;
    bindings[role as keyof RoleResolution['bindings']] = bind(expression, contextAccounts, role, unresolvedReasons, evidence, location);
  }
  return bindings;
}

function findAnchorStruct(cpi: CpiSite): { struct: string; fields: Array<[string, string]>; argumentBase: number } | undefined {
  const candidates = [cpi.instructionExpression ?? '', ...(cpi.accountArguments ?? [])];
  for (const candidate of candidates) {
    const match = /\b([A-Z][A-Za-z0-9_]*)\s*\{\s*([^{}]*?)\s*\}/.exec(candidate);
    if (!match) continue;
    const struct = match[1];
    if (!ANCHOR_STRUCT_FIELDS[struct]) continue;
    const assignments = splitRustExpressions(match[2]).map(item => item.trim()).filter(Boolean);
    const fields: Array<[string, string]> = [];
    for (const assignment of assignments) {
      const pair = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]+)$/.exec(assignment);
      if (pair) fields.push([pair[1], pair[2].trim()]);
    }
    if (!fields.length) continue;
    const base = candidates.indexOf(candidate) > 0 ? (cpi.accountArguments ?? []).indexOf(candidate) : 0;
    return { struct, fields, argumentBase: Math.max(0, base) };
  }
  return undefined;
}

function findNativeConstructor(cpi: CpiSite, operationKey: string): { api: string; arguments: string[] } | undefined {
  const text = cpi.instructionExpression ?? '';
  const escaped = escapeRegex(operationKey);
  const match = new RegExp(`\\b(?:spl_token(?:_2022(?:_fix)?)?|token)::instruction::${escaped}\\s*\\(([\\s\\S]*)\\)`).exec(text);
  if (!match) return undefined;
  return { api: operationKey, arguments: splitRustExpressions(match[1]).map(item => item.trim()) };
}

function nthArgument(cpi: CpiSite, index: number): string | undefined {
  return index >= 0 ? cpi.accountArguments?.[index] : cpi.accountArguments === undefined ? undefined : cpi.accountArguments[cpi.accountArguments.length + index];
}

function operationOf(cpi: CpiSite): string {
  const operation = cpi.operation ?? '';
  const tail = operation.split('.').at(-1) ?? '';
  return tail.replace(/-/g, '_');
}

/**
 * Authority kind requires positive evidence: a signer-flagged bound account,
 * or a proven signer PDA linked to this CPI. A non-signer authority is never
 * inferred to be a PDA without derivation/signing evidence.
 */
function resolveAuthorityType(
  program: ProgramUnit, cpi: CpiSite,
  roles: RoleResolution, unresolvedReasons: string[], evidence: Evidence[]
): TokenAssetAuthorityType {
  const expression = roles.bindings.authority?.expression;
  if (!expression) return 'unresolved';
  const trimmed = expression.trim();
  const base = /^&?(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.exec(trimmed)?.[1];
  const name = /^ctx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)/.exec(trimmed)?.[1] ?? base;
  const account = name ? uniqueAccountByName(program, name) : undefined;
  if (account?.signer) {
    evidence.push({ description: `authority account ${account.name} carries a signer flag`, location: cpi.location });
    return 'signer-account';
  }
  if ((cpi.signerPdaIds ?? []).length) {
    const pdas = (cpi.signerPdaIds ?? []).map(id => program.securitySurface.pdaSites.find(pda => pda.id === id)).filter((pda): pda is NonNullable<typeof pda> => !!pda);
    if (pdas.length) {
      evidence.push({ description: `invoke_signed evidence with proven signer PDA(s) ${pdas.map(pda => pda.id).join(', ')}`, location: cpi.location });
      return 'pda';
    }
  }
  // A signed CPI whose authority account itself carries PDA derivation evidence:
  // the authority is that derived PDA. Requires BOTH invoke_signed-style signing
  // evidence on the site and derivation evidence on the account — never either alone.
  if ((cpi.signerPdaIds ?? []).length === 0 && cpi.pdaSigned && account?.pdaId && program.securitySurface.pdaSites.some(pda => pda.id === account.pdaId)) {
    evidence.push({ description: `signed CPI authority ${account.name} carries PDA derivation evidence (${account.pdaId})`, location: cpi.location });
    return 'pda';
  }
  if (account) {
    evidence.push({ description: `authority account ${account.name} has no signer flag and no PDA signing evidence`, location: cpi.location });
    return 'ordinary-account';
  }
  unresolvedReasons.push(`authority kind for \`${expression}\` could not be established from available evidence`);
  return 'unresolved';
}

function uniqueAccountByName(program: ProgramUnit, name: string): AccountInfo | undefined {
  const matches = program.accounts.filter(account => account.name === name);
  if (matches.length === 1) return matches[0];
  return matches.length ? matches.find(account => !!account.contextType) : undefined;
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
