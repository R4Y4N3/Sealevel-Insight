import {
  AccountInfo,
  CpiOperationCategory,
  CpiSite,
  Evidence,
  ProgramUnit,
  ReachabilityWitness,
  TokenAssetAuthorityType,
  TokenAssetFlow,
  TokenAssetFlowBinding,
  TokenProgramKind
} from '../model/report';
import { SourceLocation } from '../model/sourceLocation';
import { splitRustExpressions } from '../utils/text';

/**
 * Token & Asset Flow v2.
 *
 * Builds evidence-backed token/asset flows from the existing CPI sites, account
 * relations, PDA model, call graph, reachability witnesses, and cross-package
 * surfaces. Roles bind only when the exact CPI API signature is positively
 * identified through one of:
 *   1. an Anchor CpiContext account-struct literal (named fields),
 *   2. a known SPL/Token-2022/Associated-Token instruction-constructor call (documented order),
 *   3. a known builder/method-style argument list (documented order).
 * Otherwise every role stays unresolved with an explicit reason. Argument
 * positions are never guessed from unnamed calls.
 *
 * Eligibility covers spl-token, token-2022, and Associated Token Program
 * operations (create, create-idempotent, recover-nested) alike; it is not
 * restricted to spl-token/token-2022 targets. Modeled `initialize_*` native
 * constructors (account/account2/account3, mint/mint2) also produce flows;
 * other `initialize_*` instructions (multisig, extensions, ...) are recognized
 * elsewhere as CPI sites but are not asset-flow role-modeled.
 *
 * Cross-package CPIs proven reachable through the existing cross-package
 * surfaces also produce flows. Their account roles are never bound against the
 * calling program's instruction accounts (a different, unrelated account
 * namespace), so they are evidence-backed but explicitly unresolved unless a
 * future cross-package symbolic account tracer is added.
 */

const TOKEN_CATEGORIES: CpiOperationCategory[] = [
  'token-transfer', 'token-mint', 'token-burn', 'authority-change', 'freeze', 'thaw',
  'token-account-create', 'token-account-recovery', 'account-close'
];

/** Native initialize_* constructors with a documented, modeled role layout (see NATIVE_CONSTRUCTORS).
 *  Other initialize_* instructions (multisig, extensions, ...) remain CPI-visible but are not asset flows. */
const MODELED_INITIALIZE_OPERATIONS = new Set(['initialize_account', 'initialize_account2', 'initialize_account3', 'initialize_mint', 'initialize_mint2']);

/** Anchor CpiContext account structs: documented field -> flow role.
 *  Verified against anchor_spl::token / token_2022 / token_interface / associated_token source. */
const ANCHOR_STRUCT_FIELDS: Record<string, Record<string, string>> = {
  Transfer: { from: 'source', to: 'destination', authority: 'authority' },
  TransferChecked: { from: 'source', mint: 'mint', to: 'destination', authority: 'authority' },
  MintTo: { mint: 'mint', to: 'destination', authority: 'authority' },
  MintToChecked: { mint: 'mint', to: 'destination', authority: 'authority' },
  Burn: { mint: 'mint', from: 'source', authority: 'authority' },
  BurnChecked: { mint: 'mint', from: 'source', authority: 'authority' },
  CloseAccount: { account: 'source', destination: 'destination', authority: 'authority' },
  // SetAuthority has no `new_authority` account field: the new authority and authority_type
  // are instruction arguments, not accounts. See WRAPPER_ROLE_INDEX for newAuthority extraction.
  SetAuthority: { current_authority: 'authority', account_or_mint: 'source' },
  // Approve/ApproveChecked name the delegating token account `to`, not `from`.
  Approve: { to: 'source', delegate: 'delegate', authority: 'authority' },
  ApproveChecked: { to: 'source', mint: 'mint', delegate: 'delegate', authority: 'authority' },
  Revoke: { source: 'source', authority: 'authority' },
  FreezeAccount: { account: 'source', mint: 'mint', authority: 'authority' },
  ThawAccount: { account: 'source', mint: 'mint', authority: 'authority' },
  InitializeAccount: { account: 'source', mint: 'mint', authority: 'authority' },
  InitializeAccount3: { account: 'source', mint: 'mint', authority: 'authority' },
  // InitializeMint/InitializeMint2 only expose `mint` (+ `rent` for InitializeMint, never a role).
  // The mint authority is an instruction argument, not an account; see WRAPPER_ROLE_INDEX.
  InitializeMint: { mint: 'mint' },
  InitializeMint2: { mint: 'mint' },
  // anchor_spl::associated_token::{Create, CreateIdempotent (a type alias of Create)}.
  Create: { associated_token: 'destination', authority: 'authority', mint: 'mint' },
  CreateIdempotent: { associated_token: 'destination', authority: 'authority', mint: 'mint' }
};

/** Known SPL/Token-2022 instruction constructors: documented positional roles (index 0 is program id).
 *  Verified against spl-token instruction function signatures; '' marks a non-account positional
 *  argument (e.g. an enum) that must be skipped without being mistaken for the next role. */
const NATIVE_CONSTRUCTORS: Record<string, string[]> = {
  transfer: ['program', 'source', 'destination', 'authority'],
  transfer_checked: ['program', 'source', 'mint', 'destination', 'authority'],
  mint_to: ['program', 'mint', 'destination', 'authority'],
  mint_to_checked: ['program', 'mint', 'destination', 'authority'],
  burn: ['program', 'source', 'mint', 'authority'],
  burn_checked: ['program', 'source', 'mint', 'authority'],
  approve: ['program', 'source', 'delegate', 'authority'],
  approve_checked: ['program', 'source', 'mint', 'delegate', 'authority'],
  revoke: ['program', 'source', 'authority'],
  close_account: ['program', 'source', 'destination', 'authority'],
  freeze_account: ['program', 'source', 'mint', 'authority'],
  thaw_account: ['program', 'source', 'mint', 'authority'],
  // (token_program, owned_pubkey, new_authority: Option<Pubkey>, authority_type: enum, owner_pubkey, signers[])
  set_authority: ['program', 'source', 'newAuthority', '', 'authority'],
  initialize_account: ['program', 'source', 'mint', 'authority'],
  initialize_account2: ['program', 'source', 'mint', 'authority'],
  initialize_account3: ['program', 'source', 'mint', 'authority'],
  // (token_program, mint_pubkey, mint_authority_pubkey, freeze_authority: Option<Pubkey>, decimals)
  initialize_mint: ['program', 'mint', 'authority'],
  initialize_mint2: ['program', 'mint', 'authority']
};

/** Amount/decimal argument offsets relative to the end of the argument list, per strategy.
 *  Real constructors end with `..., signer_pubkeys, amount, decimals`: decimals is last,
 *  amount is second-to-last. InitializeMint/2 end with `..., decimals` (no amount). */
const NATIVE_AMOUNT_OFFSET: Record<string, { amount?: number; decimals?: number }> = {
  transfer: { amount: -1 }, transfer_checked: { amount: -2, decimals: -1 },
  mint_to: { amount: -1 }, mint_to_checked: { amount: -2, decimals: -1 },
  burn: { amount: -1 }, burn_checked: { amount: -2, decimals: -1 },
  approve: { amount: -1 }, approve_checked: { amount: -2, decimals: -1 },
  initialize_mint: { decimals: -1 }, initialize_mint2: { decimals: -1 }
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
  thaw_account: ['source', 'mint', 'authority'],
  // Anchor account-init constraint synthetic sites (`#[account(init, associated_token::...)]`)
  // record accountArguments as [account, payer]; the account itself is unambiguously the ATA.
  create: ['destination'],
  create_idempotent: ['destination']
};

const BUILDER_AMOUNT_INDEX: Record<string, number> = {
  transfer: 3, mint_to: 3, burn: 2, approve: 3
};

/** Solang's built-in SplToken interface has no explicit program-id argument. */
const SOLANG_SIGNATURES: Record<string, string[]> = {
  transfer: ['source', 'destination', 'authority'],
  mint_to: ['mint', 'destination', 'authority'],
  burn: ['source', 'mint', 'authority'],
  approve: ['source', 'delegate', 'authority'],
  revoke: ['source', 'authority'],
  // Official Solang's remove_mint_authority(mintAccount, mintAuthority) emits SetAuthority
  // with a null new authority. The operation is canonicalized to set_authority by the frontend.
  set_authority: ['source', 'authority']
};
const SOLANG_AMOUNT_INDEX: Record<string, { amount?: number; decimals?: number }> = {
  transfer: { amount: 3 }, mint_to: { amount: 3 }, burn: { amount: 3 }, approve: { amount: 3 }
};

/** anchor_spl wrapper calls pass (ctx, amount[, decimals]); the analyzer records them without ctx. */
const WRAPPER_VALUE_INDEX: Record<string, { amount?: number; decimals?: number }> = {
  transfer: { amount: 0 }, transfer_checked: { amount: 0, decimals: 1 },
  mint_to: { amount: 0 }, mint_to_checked: { amount: 0, decimals: 1 },
  burn: { amount: 0 }, burn_checked: { amount: 0, decimals: 1 },
  approve: { amount: 0 }, approve_checked: { amount: 0, decimals: 1 },
  // token::initialize_mint(ctx, decimals, authority, freeze_authority) -> decimals is the first non-ctx arg.
  initialize_mint: { decimals: 0 }, initialize_mint2: { decimals: 0 }
};

/**
 * Anchor wrapper calls that pass an additional role-typed value (not an amount/decimals) after ctx:
 *   token::set_authority(ctx, authority_type, new_authority)
 *   token::initialize_mint(ctx, decimals, authority, freeze_authority)
 * Positions are relative to the struct match's argument base, same convention as WRAPPER_VALUE_INDEX.
 */
const WRAPPER_ROLE_INDEX: Record<string, Array<{ role: keyof RoleResolution['bindings']; index: number }>> = {
  set_authority: [{ role: 'newAuthority', index: 1 }],
  initialize_mint: [{ role: 'authority', index: 1 }],
  initialize_mint2: [{ role: 'authority', index: 1 }]
};

export function buildAssetFlows(programs: ProgramUnit[]): void {
  const byName = new Map(programs.map(program => [program.name, program]));
  for (const program of programs) {
    const flows: TokenAssetFlow[] = [];
    for (const instruction of program.instructions) {
      const surface = instruction.reachableSurface;
      if (!surface) continue;
      const instructionId = instruction.id ?? instruction.name;
      const contextAccounts = contextAccountsFor(program, instruction.contextType);
      const seenCpis = new Set<string>();
      const collect = (owner: ProgramUnit, cpiIds: string[]): void => {
        for (const cpiId of cpiIds) {
          const key = `${owner.name}:${cpiId}`;
          if (seenCpis.has(key)) continue;
          seenCpis.add(key);
          const cpi = owner.securitySurface.cpiSites.find(site => site.id === cpiId);
          if (!cpi || !isTokenCpi(cpi)) continue;
          const witness = (surface.witnesses ?? []).find(item => item.targetKind === 'cpi' && item.targetProgram === owner.name && item.targetId === cpiId);
          const sameProgram = owner === program;
          flows.push(buildFlow(program, owner, instructionId, cpi, sameProgram ? contextAccounts : [], witness, sameProgram));
        }
      };
      collect(program, surface.cpis);
      for (const cross of surface.crossPackageSurfaces ?? []) {
        const owner = byName.get(cross.program);
        if (owner) collect(owner, cross.cpiIds);
      }
    }
    program.assetFlows = flows.sort((a, b) => a.id.localeCompare(b.id));
    program.instructionDossiers ??= [];
  }
}

/**
 * Eligible when a CPI is positively classified as SPL Token, Token-2022, or the Associated
 * Token Program AND its documented operation category is asset-flow-relevant. Initialization
 * is admitted only for the specific native constructors this module role-models; other
 * `initialize_*` instructions remain visible as CPI sites without a fabricated flow.
 */
function isTokenCpi(cpi: CpiSite): boolean {
  if (!cpi.operationCategory || !cpi.targetKind) return false;
  if (cpi.targetKind !== 'spl-token' && cpi.targetKind !== 'token-2022' && cpi.targetKind !== 'associated-token') return false;
  if (cpi.operationCategory === 'initialization') return MODELED_INITIALIZE_OPERATIONS.has(operationOf(cpi));
  return TOKEN_CATEGORIES.includes(cpi.operationCategory);
}

function contextAccountsFor(program: ProgramUnit, contextType: string | undefined): AccountInfo[] {
  return contextType ? program.accounts.filter(account => account.contextType === contextType) : [];
}

function buildFlow(
  program: ProgramUnit, owner: ProgramUnit, instructionId: string, cpi: CpiSite,
  contextAccounts: AccountInfo[], witness: ReachabilityWitness | undefined, sameProgram: boolean
): TokenAssetFlow {
  const evidence: Evidence[] = [...cpi.evidence];
  const unresolvedReasons: string[] = [];
  const apiShort = cpi.invocationApi?.split(/::|\./).at(-1)?.replace(/::<.*$/, '') ?? '';
  const operationKey = operationOf(cpi);
  const roles = resolveRoles(cpi, apiShort, operationKey, contextAccounts, unresolvedReasons, evidence);
  const authorityType = resolveAuthorityType(owner, cpi, roles, unresolvedReasons, evidence);
  const functionPath = witness?.functionPath ?? [];
  const callPath = witness?.callPath ?? [];
  if (!witness) unresolvedReasons.push('deterministic call-path evidence for this CPI is unavailable');
  if (!sameProgram) evidence.push({ description: `Cross-package CPI reached through ${owner.name}; account roles are scoped to ${owner.name} and are not bound to ${program.name} instruction accounts`, location: cpi.location });
  const complete = !unresolvedReasons.length;
  const id = `asset-flow:${program.name}:${instructionId}:${sameProgram ? '' : `${owner.name}:`}${cpi.id ?? `${cpi.location.uri}:${cpi.location.startLine}:${cpi.location.startColumn}`}`;
  return {
    id,
    instructionId,
    program: program.name,
    cpiId: sameProgram ? cpi.id : undefined,
    // functionPath.length === 1 means the CPI sits directly in the handler with no intervening
    // calls; an EMPTY path means witness evidence is unavailable and must never default to "direct".
    direct: sameProgram && functionPath.length === 1,
    operation: cpi.operation,
    operationCategory: cpi.operationCategory,
    tokenProgram: tokenProgramOf(cpi.targetKind),
    ...roles.bindings,
    amount: roles.amount,
    decimals: roles.decimals,
    authorityType,
    pdaSigned: cpi.pdaSigned,
    signerPdaIds: sameProgram ? [...(cpi.signerPdaIds ?? [])] : [],
    functionPath,
    callPath,
    location: cpi.location,
    confidence: cpi.confidence,
    evidence,
    complete,
    unresolvedReasons
  };
}

function tokenProgramOf(targetKind: CpiSite['targetKind']): TokenProgramKind | undefined {
  if (targetKind === 'token-2022') return 'token-2022';
  if (targetKind === 'associated-token') return 'associated-token';
  if (targetKind === 'spl-token') return 'spl-token';
  return undefined;
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
  if (cpi.invocationApi?.startsWith('Solang SplToken.')) {
    const signature = SOLANG_SIGNATURES[operationKey]; const args = cpi.accountArguments ?? [];
    if (!signature) { unresolvedReasons.push(`Solang SplToken.${operationKey || 'unknown'} has no modeled role layout`); return empty; }
    const bindings: RoleResolution['bindings'] = {};
    signature.forEach((role, index) => { const value = args[index]; if (value !== undefined) bindings[role as keyof RoleResolution['bindings']] = bind(value, contextAccounts, role, unresolvedReasons, evidence, cpi.location); });
    const values = SOLANG_AMOUNT_INDEX[operationKey] ?? {};
    evidence.push({ description: `roles resolved from the documented Solang SplToken.${operationKey} argument order`, location: cpi.location });
    return { bindings, amount: values.amount === undefined ? undefined : args[values.amount], decimals: values.decimals === undefined ? undefined : args[values.decimals] };
  }
  // Strategy 1: Anchor CpiContext account-struct literal (named fields — strongest evidence).
  const structMatch = findAnchorStruct(cpi);
  if (structMatch) {
    const fieldMap = ANCHOR_STRUCT_FIELDS[structMatch.struct];
    if (!fieldMap) {
      unresolvedReasons.push(`account struct ${structMatch.struct} is not a recognized SPL token account struct`);
      return empty;
    }
    const bindings = bindNamedFields(structMatch.fields, fieldMap, contextAccounts, unresolvedReasons, evidence, cpi.location);
    for (const roleIndex of WRAPPER_ROLE_INDEX[operationKey] ?? []) {
      const value = nthArgument(cpi, structMatch.argumentBase + roleIndex.index);
      if (value !== undefined && value.trim()) bindings[roleIndex.role] = bind(value, contextAccounts, roleIndex.role, unresolvedReasons, evidence, cpi.location);
    }
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
      if (!role || role === 'program') return;
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
  // Option<&Pubkey> arguments (e.g. set_authority's new_authority, initialize_mint's
  // freeze_authority) are commonly passed wrapped as `Some(...)`; unwrap one layer for
  // matching only. The original expression is always preserved as evidence.
  const unwrapped = unwrapSome(trimmed);
  const base = /^&?(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.exec(unwrapped)?.[1];
  // Raw Pubkey arguments to native/anchor-wrapper calls are commonly passed as
  // `&ctx.accounts.x.key()`; a leading reference must not block the ctx.accounts prefix match.
  const contextName = /^&?ctx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)/.exec(unwrapped)?.[1];
  const solangName = /^&?tx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)(?:\.key)?/.exec(unwrapped)?.[1];
  const name = contextName ?? solangName ?? base;
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
 * inferred to be a PDA without derivation/signing evidence. The authority
 * account is looked up strictly through the already-resolved binding's
 * accountId (never a program-wide name search), because the same account
 * name can legitimately appear in multiple, unrelated instruction contexts.
 */
function resolveAuthorityType(
  owner: ProgramUnit, cpi: CpiSite,
  roles: RoleResolution, unresolvedReasons: string[], evidence: Evidence[]
): TokenAssetAuthorityType {
  const authority = roles.bindings.authority;
  if (!authority?.expression) return 'unresolved';
  if (!authority.resolved || !authority.accountId) {
    unresolvedReasons.push(`authority kind for \`${authority.expression}\` could not be established: the authority account binding is unresolved`);
    return 'unresolved';
  }
  const account = owner.accounts.find(item => item.id === authority.accountId);
  if (!account) {
    unresolvedReasons.push(`authority kind for \`${authority.expression}\` could not be established: bound account ${authority.accountId} was not found`);
    return 'unresolved';
  }
  if (account.signer) {
    evidence.push({ description: `authority account ${account.name} carries a signer flag`, location: cpi.location });
    return 'signer-account';
  }
  if ((cpi.signerPdaIds ?? []).length) {
    const pdas = (cpi.signerPdaIds ?? []).map(id => owner.securitySurface.pdaSites.find(pda => pda.id === id)).filter((pda): pda is NonNullable<typeof pda> => !!pda);
    if (pdas.length) {
      evidence.push({ description: `invoke_signed evidence with proven signer PDA(s) ${pdas.map(pda => pda.id).join(', ')}`, location: cpi.location });
      return 'pda';
    }
  }
  // A signed CPI whose authority account itself carries PDA derivation evidence:
  // the authority is that derived PDA. Requires BOTH invoke_signed-style signing
  // evidence on the site and derivation evidence on the account — never either alone.
  if ((cpi.signerPdaIds ?? []).length === 0 && cpi.pdaSigned && account.pdaId && owner.securitySurface.pdaSites.some(pda => pda.id === account.pdaId)) {
    evidence.push({ description: `signed CPI authority ${account.name} carries PDA derivation evidence (${account.pdaId})`, location: cpi.location });
    return 'pda';
  }
  evidence.push({ description: `authority account ${account.name} has no signer flag and no PDA signing evidence`, location: cpi.location });
  return 'ordinary-account';
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Unwraps a single balanced `Some(...)` wrapper around an Option<&Pubkey>-style argument. */
function unwrapSome(value: string): string {
  const match = /^Some\s*\(([\s\S]*)\)$/.exec(value);
  if (!match) return value;
  const inner = match[1];
  let depth = 0;
  for (let index = 0; index < inner.length; index++) {
    if (inner[index] === '(') depth++;
    else if (inner[index] === ')') { if (depth === 0) return value; depth--; }
  }
  return depth === 0 ? inner.trim() : value;
}
