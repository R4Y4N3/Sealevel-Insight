import { SourceLocation } from './sourceLocation';

export interface FrameworkEvidence {
  framework: string;
  confidence: number;
  evidence: Evidence[];
  location?: SourceLocation;
}

export interface Evidence {
  description: string;
  location?: SourceLocation;
}

export interface AccountConstraint {
  kind: string;
  expression?: string;
  location: SourceLocation;
}

export interface FileMetric {
  uri: string;
  lines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  functions: number;
  structs: number;
  enums: number;
  traits: number;
  implBlocks: number;
  unsafeBlocks: number;
  macroInvocations: number;
  docCommentLines?: number;
  todoCount?: number;
  fixmeCount?: number;
  hackCount?: number;
  attributes?: number;
  useStatements?: number;
  functionCalls?: number;
  methodCalls?: number;
  matches?: number;
  loops?: number;
  sha256?: string;
  parseError?: string;
}

export interface FunctionMetric {
  name: string;
  location: SourceLocation;
  lines: number;
  complexity: number;
  parameters: number;
  isPublic: boolean;
  visibility?: string;
  isUnsafe: boolean;
  program?: string;
  qualifiedName?: string;
  directCalls?: string[];
  reachableFunctions?: string[];
  cpiCount?: number;
  pdaCount?: number;
  codeLines?: number;
  isAsync?: boolean;
  returnType?: string;
  resolvedCalls?: number;
  unresolvedCalls?: number;
  accountCount?: number;
  unsafeBlocks?: number;
  sysvars?: string[];
  stateAccess?: string[];
  serialization?: string[];
}

export type CallResolutionStatus = 'resolved' | 'ambiguous' | 'unresolved' | 'external' | 'dynamic';

export interface RustSymbol {
  id: string;
  qualifiedName: string;
  shortName: string;
  kind: 'function' | 'method' | 'struct' | 'enum' | 'trait' | 'constant' | 'static' | 'type-alias' | 'module';
  package: string;
  module: string;
  visibility: string;
  location: SourceLocation;
  evidence: Evidence[];
}

export interface InstructionInfo {
  id?: string;
  name: string;
  location: SourceLocation;
  confidence: number;
  evidence: Evidence[];
  functionName?: string;
  contextType?: string;
  handler?: string;
  discriminator?: string;
  arguments?: Array<{ name: string; type?: string }>;
  reachableSurface?: InstructionReachableSurface;
}

export interface InstructionReachableSurface {
    directHandler?: string;
    functions: string[];
    unresolvedCalls?: string[];
    ambiguousCalls?: string[];
    complete?: boolean;
    incompleteReasons?: string[];
    directAccounts?: string[];
    accounts: string[];
    stateTypes?: string[];
    directCpis?: string[];
    cpis: string[];
    signedCpis?: string[];
    dynamicCpis?: string[];
    directPdas?: string[];
    pdas: string[];
    externalPrograms: string[];
    sysvars?: string[];
    syscalls?: string[];
    events?: string[];
    errors?: string[];
    unsafeFunctions?: string[];
    unsafeBlocks?: number;
    initializationSites?: string[];
    reallocSites?: string[];
    closeSites?: string[];
    serializationSites?: string[];
    deserializationSites?: string[];
    lamportMutationSites?: string[];
    dataMutationSites?: string[];
    reachableCyclomaticComplexity?: number;
    reviewComplexity?: ReviewComplexity;
}

export interface AccountInfo {
  id?: string;
  name?: string;
  type: string;
  signer?: boolean;
  writable?: boolean;
  unchecked?: boolean;
  wrapperType?: string;
  stateType?: string;
  ordinal?: number;
  index?: number;
  executable?: boolean;
  raw?: boolean;
  optional?: boolean;
  ownerExpectation?: string;
  addressExpectation?: string;
  ownerValidated?: boolean;
  addressValidated?: boolean;
  pdaId?: string;
  dataAccess?: Array<'read' | 'write'>;
  lamportAccess?: Array<'read' | 'write'>;
  lifecycle?: Array<'read' | 'write' | 'init' | 'create' | 'realloc' | 'close' | 'lamport-transfer' | 'unknown'>;
  serialization?: string[];
  contextType?: string;
  constraints?: AccountConstraint[];
  location: SourceLocation;
  evidence: Evidence[];
  confidence: number;
}

export interface PdaSite {
  id?: string;
  seeds?: string[];
  bump?: string;
  programIdExpression?: string;
  location: SourceLocation;
  enclosingFunction?: string;
  enclosingInstruction?: string;
  derivationApi?: string;
  relatedAccountId?: string;
  reachableInstructions?: string[];
  usedAsSigner?: boolean;
  relatedCpiIds?: string[];
  evidence: Evidence[];
  confidence: number;
}

export interface CpiSite {
  id?: string;
  location: SourceLocation;
  functionName?: string;
  enclosingInstruction?: string;
  target?: string;
  targetKind?: ExternalProgramKind;
  invocationApi?: string;
  instructionExpression?: string;
  accountArguments?: string[];
  programAccountExpression?: string;
  targetProgramId?: string;
  reachableInstructions?: string[];
  signerPdaIds?: string[];
  pdaSigned: boolean;
  evidence: Evidence[];
  confidence: number;
}

export interface SecuritySurface {
  signerSignals: number;
  writableSignals: number;
  ownerValidationSignals: number;
  addressValidationSignals: number;
  remainingAccounts: number;
  rawOrUncheckedAccounts: number;
  manualAccountIteration: number;
  unsafeBlocks: number;
  manualSignerChecks: number;
  manualOwnerChecks: number;
  manualWritableChecks: number;
  manualAddressChecks: number;
  manualSerialization: number;
  reallocOperations: number;
  unsafeFunctions: number;
  cpiSites: CpiSite[];
  pdaSites: PdaSite[];
}

export interface ExternalProgram {
  id: string;
  name: string;
  programId?: string;
  kind: string;
  locations: SourceLocation[];
  calledByInstructions: string[];
  cpiCount: number;
  signedCpiCount: number;
  confidence: number;
  evidence: Evidence[];
  cpiSiteIds?: string[];
}

export type ExternalProgramKind = 'system-program' | 'spl-token' | 'token-2022' | 'associated-token' | 'memo' | 'stake' | 'vote' | 'address-lookup-table' | 'compute-budget' | 'ed25519' | 'secp256k1' | 'secp256r1' | 'custom' | 'dynamic' | 'unknown';

export type PackageKind = 'solana-program' | 'program-library' | 'library' | 'client' | 'test' | 'build-tool' | 'generated' | 'unknown';

export interface CargoDependency {
  name: string;
  packageName?: string;
  version?: string;
  path?: string;
  optional: boolean;
  features: string[];
  defaultFeatures: boolean;
  workspaceInherited: boolean;
  targetCondition?: string;
  kind: 'normal' | 'dev' | 'build';
  internalPackageId?: string;
  evidence: Evidence[];
}

export interface CargoFeature { name: string; enables: string[]; evidence: Evidence[]; }
export interface CargoTarget { name: string; kind: 'lib' | 'bin' | 'example' | 'test' | 'bench' | 'build-script'; path: string; crateTypes: string[]; requiredFeatures: string[]; valid: boolean; evidence: Evidence[]; }

export interface CargoPackage {
  id: string;
  name: string;
  manifestUri: string;
  rootUri: string;
  kind: PackageKind;
  confidence: number;
  evidence: Evidence[];
  dependencies: CargoDependency[];
  targets: CargoTarget[];
  features: CargoFeature[];
  version?: string;
  edition?: string;
  buildScript?: string;
}

export interface CargoWorkspace {
  rootUri: string;
  manifestUri: string;
  members: string[];
  excluded: string[];
  defaultMembers: string[];
  resolver?: string;
}

export interface WorkspaceGraph {
  workspaces: CargoWorkspace[];
  packages: CargoPackage[];
  dependencyEdges: Array<{ source: string; target: string; kind: 'internal' | 'external' }>;
  diagnostics: AnalysisDiagnostic[];
}

export interface ProgramIdentity {
  programId?: string;
  sources: Evidence[];
  conflicts: Evidence[];
}

export interface Capability {
  id: string;
  label: string;
  evidence: Evidence[];
}

export interface ReviewHotspot {
  id: string;
  label: string;
  score: number;
  reasons: string[];
  location?: SourceLocation;
}

export interface ReviewComplexity { score: number; level: 'Low Review Surface' | 'Moderate Review Surface' | 'Elevated Review Surface' | 'Heavy Review Surface'; components: Array<{ label: string; value: number; weight: number; contribution: number }>; }

export interface StateAccountType { id: string; name: string; package: string; framework?: string; fields: Array<{ name: string; type: string; visibility?: string }>; visibility: string; serialization: string[]; zeroCopy: boolean; discriminator?: string; declaredSpace?: string; staticSize?: number; dynamicSize: boolean; pdaIds: string[]; initializationSites: string[]; reallocSites: string[]; closeSites: string[]; evidence: Evidence[]; location: SourceLocation; }
export interface SysvarUse { id: string; name: string; functionName?: string; instructionIds: string[]; accountId?: string; location: SourceLocation; evidence: Evidence[]; }
export interface RuntimeOperation { id: string; kind: string; api: string; functionName?: string; instructionIds: string[]; location: SourceLocation; evidence: Evidence[]; }
export interface EventInfo { id: string; name: string; framework?: string; location: SourceLocation; emissionSites: SourceLocation[]; evidence: Evidence[]; }
export interface ErrorInfo { id: string; name: string; code?: number; message?: string; framework?: string; location: SourceLocation; useSites: SourceLocation[]; evidence: Evidence[]; }

export interface AnalysisDiagnostic { id: string; severity: 'info' | 'warning' | 'error'; category: 'parse' | 'cargo' | 'config' | 'identity' | 'idl' | 'invariant' | 'analysis'; message: string; location?: SourceLocation; }

export interface SemanticCoverage {
  parsedFiles: { resolved: number; total: number; percent: number };
  instructionContexts: { resolved: number; total: number; percent: number };
  cpiTargets: { resolved: number; total: number; percent: number };
  pdaSeeds: { resolved: number; total: number; percent: number };
  cargoPackages?: CoverageRatio;
  programsClassified?: CoverageRatio;
  instructions?: CoverageRatio;
  handlers?: CoverageRatio;
  accountRelationships?: CoverageRatio;
  calls?: CoverageRatio;
  internalCalls?: CoverageRatio;
  externalCalls?: CoverageRatio;
  ambiguousCalls?: number;
  dynamicCalls?: number;
  unknownCalls?: number;
  reachableSurfaces?: CoverageRatio;
  programIds?: CoverageRatio;
  idlInstructions?: CoverageRatio;
  idlAccounts?: CoverageRatio;
  unresolvedReasons?: Record<string, number>;
}
export interface CoverageRatio { resolved: number; total: number; percent: number; }

export interface InstructionAccountRelationship {
  instructionId: string;
  accountId: string;
  relationship: 'reads' | 'writes' | 'signer' | 'unchecked' | 'unknown';
}

export interface ArchitectureNode {
  id: string;
  type: 'program' | 'instruction' | 'account' | 'pda' | 'external-program' | 'function';
  label: string;
  location?: SourceLocation;
}

export interface ArchitectureEdge {
  source: string;
  target: string;
  type: 'uses' | 'reads' | 'writes' | 'signs' | 'derives' | 'cpi' | 'calls';
}

export interface ProgramUnit {
  name: string;
  manifestUri?: string;
  rootUri?: string;
  packageKind?: PackageKind;
  packageEvidence?: Evidence[];
  packageId?: string;
  packageConfidence?: number;
  packageDependencies?: CargoDependency[];
  identity?: ProgramIdentity;
  rustFiles: FileMetric[];
  functions: FunctionMetric[];
  instructions: InstructionInfo[];
  accounts: AccountInfo[];
  frameworkEvidence: FrameworkEvidence[];
  securitySurface: SecuritySurface;
  relationships?: InstructionAccountRelationship[];
  architecture?: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] };
  capabilities?: Capability[];
  reviewHotspots?: ReviewHotspot[];
  callGraph?: CallGraph;
  externalPrograms?: ExternalProgram[];
  symbols?: RustSymbol[];
  stateTypes?: StateAccountType[];
  sysvars?: SysvarUse[];
  runtimeOperations?: RuntimeOperation[];
  events?: EventInfo[];
  errors?: ErrorInfo[];
  reviewComplexity?: ReviewComplexity;
}

export interface WorkspaceReport {
  schemaVersion: string;
  tool: { name: string; version: string };
  generatedAt: string;
  workspace?: { name?: string; roots?: string[] };
  programs: ProgramUnit[];
  files: FileMetric[];
  diagnostics: string[];
  analysisDiagnostics?: AnalysisDiagnostic[];
  coverage?: SemanticCoverage;
  reviewProfile?: ReviewHotspot[];
  workspaceGraph?: WorkspaceGraph;
  idl?: IdlReport;
  summary: {
    rustFiles: number;
    loc: number;
    codeLoc: number;
    blankLines: number;
    commentLines: number;
    functions: number;
    instructions: number;
    accounts: number;
    signerSignals: number;
    writableSignals: number;
    rawOrUncheckedAccounts: number;
    pdas: number;
    cpis: number;
    pdaSignedCpis: number;
    unsafeBlocks: number;
  };
}

export interface CallSite { id: string; caller: string; callee: string; resolved: boolean; sourceExpression?: string; candidateTargets?: string[]; target?: string; status?: CallResolutionStatus; confidence?: number; location: SourceLocation; evidence: Evidence[]; }
export interface CallGraph { symbols: string[]; calls: CallSite[]; edges: Array<{ source: string; target: string; confidence: number }>; }
export interface IdlInstruction { name: string; discriminator?: string; arguments?: Array<{ name: string; type?: string }>; accounts: Array<{ name: string; signer?: boolean; writable?: boolean; optional?: boolean; pda?: unknown }>; }
export interface IdlProgram { name?: string; address?: string; version?: string; spec?: string; instructions: IdlInstruction[]; types?: Array<{ name: string; type?: unknown }>; events?: Array<{ name: string }>; errors?: Array<{ name: string; code?: number; message?: string }>; sourceUri?: string; }
export interface IdlReconciliation { status: 'MATCHED' | 'SOURCE_ONLY' | 'IDL_ONLY' | 'MISMATCH' | 'UNKNOWN'; item: string; details?: string; }
export interface IdlReport { programs: IdlProgram[]; reconciliations: IdlReconciliation[]; diagnostics: string[]; }
