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

export interface AccountRelation {
  kind: 'has-one' | 'payer' | 'close-destination' | 'realloc-payer' | 'seed-program' | 'token-mint' | 'token-authority' | 'token-program' | 'mint-authority' | 'mint-freeze-authority' | 'associated-token-mint' | 'associated-token-authority' | 'associated-token-program' | 'extension-authority' | 'extension-program' | 'extension-address';
  target: string;
  constraint: string;
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
  cfgStatus?: 'active' | 'unknown';
  cfgPredicates?: string[];
}

export type CallResolutionStatus = 'resolved' | 'ambiguous' | 'unresolved' | 'external' | 'dynamic';

export interface RustSymbol {
  id: string;
  qualifiedName: string;
  shortName: string;
  kind: 'function' | 'method' | 'associated-function' | 'trait-method' | 'closure' | 'struct' | 'enum' | 'trait' | 'constant' | 'static' | 'type-alias' | 'module';
  package: string;
  module: string;
  visibility: string;
  location: SourceLocation;
  evidence: Evidence[];
  implType?: string;
  traitName?: string;
  hasSelfReceiver?: boolean;
  aliasTarget?: string;
  genericBounds?: Array<{ typeParameter: string; trait: string }>;
  macroOrigins?: string[];
  cfgStatus?: 'active' | 'unknown';
  cfgPredicates?: string[];
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
  cfgStatus?: 'active' | 'unknown';
  cfgPredicates?: string[];
}

export interface UnresolvedCallDetail { callId: string; expression: string; status: 'ambiguous' | 'unresolved' | 'dynamic'; reason: string; candidates: string[]; location: SourceLocation; }
export interface CrossPackageReachableSurface { program: string; functions: string[]; cpiIds: string[]; signedCpiIds: string[]; dynamicCpiIds: string[]; pdaIds: string[]; stateTypeIds: string[]; runtimeOperationIds: string[]; externalProgramIds: string[]; unresolvedCallIds: string[]; ambiguousCallIds: string[]; complete: boolean; evidence: Evidence[]; }
export interface CompilationProfile { target?: string; mode: 'normal' | 'test'; debugAssertions?: boolean; cfgOptions: string[]; cfgKnowledge: 'partial' | 'complete'; evidence: Evidence[]; }
export type ReachabilityTargetKind = 'function' | 'call' | 'cpi' | 'pda' | 'state-type' | 'runtime-operation' | 'external-program';
export interface ReachabilityWitness { id: string; targetKind: ReachabilityTargetKind; targetId: string; targetProgram: string; functionPath: string[]; callPath: string[]; location?: SourceLocation; evidence: Evidence[]; }

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
    unresolvedCallDetails?: UnresolvedCallDetail[];
    crossPackageSurfaces?: CrossPackageReachableSurface[];
    witnesses?: ReachabilityWitness[];
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
  relations?: AccountRelation[];
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
  operation?: string;
  operationCategory?: CpiOperationCategory;
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

export type CpiOperationCategory = 'account-creation' | 'allocation' | 'ownership-change' | 'lamport-transfer' | 'token-transfer' | 'token-mint' | 'token-burn' | 'account-close' | 'authority-change' | 'freeze' | 'thaw' | 'token-account-create' | 'token-account-recovery' | 'initialization' | 'nonce' | 'other';

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
  resolvedPackageIds?: string[];
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
  metadataId?: string;
  enabledFeatures?: string[];
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
  resolution?: CargoResolution;
  diagnostics: AnalysisDiagnostic[];
}

export interface CargoResolutionDependency { name: string; packageId: string; kinds: Array<{ kind: 'normal' | 'dev' | 'build'; target?: string }>; }
export interface CargoResolutionNode { packageId: string; name: string; version: string; source?: string; features: string[]; dependencies: CargoResolutionDependency[]; }
export interface CargoResolution { sourceUri: string; formatVersion: 1; workspaceRoot?: string; targetDirectory?: string; rootPackageId?: string; workspaceMembers: string[]; workspaceDefaultMembers: string[]; nodes: CargoResolutionNode[]; dependencyEdges: Array<{ source: string; target: string; name: string; kinds: Array<{ kind: 'normal' | 'dev' | 'build'; target?: string }> }>; }

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

export interface InstructionAccountDossier {
  accountId: string;
  name: string;
  type: string;
  stateTypeId?: string;
  stateType?: string;
  relationship: InstructionAccountRelationship['relationship'];
  direct: boolean;
  signer: boolean;
  writable: boolean;
  executable: boolean;
  unchecked: boolean;
  optional: boolean;
  ownerValidation: { validated: boolean; expected?: string };
  addressValidation: { validated: boolean; expected?: string };
  pdaId?: string;
  lifecycle: AccountInfo['lifecycle'];
  dataAccess: AccountInfo['dataAccess'];
  lamportAccess: AccountInfo['lamportAccess'];
  serialization: string[];
  constraints: string[];
  relations: AccountRelation[];
  location: SourceLocation;
  evidence: Evidence[];
}

export interface InstructionCpiDossier {
  cpiId: string;
  direct: boolean;
  target?: string;
  targetKind?: ExternalProgramKind;
  operation?: string;
  operationCategory?: CpiOperationCategory;
  functionName?: string;
  invocationApi?: string;
  programAccountExpression?: string;
  accountArguments: string[];
  pdaSigned: boolean;
  signerPdaIds: string[];
  location: SourceLocation;
  evidence: Evidence[];
}

export interface InstructionPdaDossier {
  pdaId: string;
  direct: boolean;
  seeds: string[];
  bump?: string;
  programIdExpression?: string;
  usedAsSigner: boolean;
  relatedAccountId?: string;
  relatedCpiIds: string[];
  location: SourceLocation;
  evidence: Evidence[];
}

export interface InstructionDossier {
  id: string;
  program: string;
  instructionId: string;
  name: string;
  handler?: string;
  contextType?: string;
  discriminator?: string;
  arguments: Array<{ name: string; type?: string }>;
  location: SourceLocation;
  reachability: { complete: boolean; incompleteReasons: string[]; functions: string[]; unresolvedCalls: string[]; ambiguousCalls: string[]; unresolvedCallDetails: UnresolvedCallDetail[] };
  accounts: InstructionAccountDossier[];
  cpis: InstructionCpiDossier[];
  pdas: InstructionPdaDossier[];
  stateTypeIds: string[];
  externalProgramIds: string[];
  sysvarIds: string[];
  runtimeOperationIds: string[];
  eventIds: string[];
  errorIds: string[];
  crossPackageSurfaces: CrossPackageReachableSurface[];
  reachabilityWitnesses: ReachabilityWitness[];
  semanticSites: {
    initialization: string[];
    realloc: string[];
    close: string[];
    serialization: string[];
    deserialization: string[];
    lamportMutation: string[];
    dataMutation: string[];
  };
  reviewComplexity?: ReviewComplexity;
  evidence: Evidence[];
}

export type StateFlowOperation = 'read' | 'write' | 'init' | 'create' | 'realloc' | 'close' | 'lamport-transfer' | 'unknown';
export interface StateFlow {
  id: string;
  instructionId: string;
  accountId: string;
  stateTypeId?: string;
  stateType?: string;
  direct: boolean;
  relationship: InstructionAccountRelationship['relationship'];
  operations: StateFlowOperation[];
  dataAccess: Array<'read' | 'write'>;
  lamportAccess: Array<'read' | 'write'>;
  serialization: string[];
  location: SourceLocation;
  evidence: Evidence[];
}

export interface AuditManifest {
  formatVersion: 1;
  analysisMode: 'local-offline-deterministic';
  scope: { programs: number; packages: number; sourceFiles: number; instructions: number; dossiers: number; stateFlows: number };
  programs: Array<{
    program: string;
    packageId?: string;
    packageKind?: PackageKind;
    programId?: string;
    frameworks: string[];
    sourceFiles: string[];
    instructionDossierIds: string[];
    stateFlowIds: string[];
    externalProgramIds: string[];
    dependencyCount: number;
    reviewScore: number;
    coverageComplete: boolean;
  }>;
  reviewQueue: Array<{ dossierId: string; program: string; instruction: string; score: number; complete: boolean; reasons: string[]; location: SourceLocation }>;
  externalPrograms: Array<{ id: string; program: string; name: string; kind: string; programId?: string; cpiCount: number; signedCpiCount: number; calledByInstructions: string[] }>;
  unresolved: { incompleteInstructionDossierIds: string[]; unknownOrDynamicCallIds: string[]; ambiguousCallIds: string[]; dynamicCpiIds: string[]; idlMismatchItems: string[] };
  evidence: Evidence[];
}

export interface StateAccountType { id: string; name: string; package: string; framework?: string; fields: Array<{ name: string; type: string; visibility?: string; idlName?: string; idlType?: string; idlSkip?: boolean; padding?: boolean }>; visibility: string; serialization: string[]; zeroCopy: boolean; discriminator?: string; declaredSpace?: string; staticSize?: number; dynamicSize: boolean; pdaIds: string[]; initializationSites: string[]; reallocSites: string[]; closeSites: string[]; evidence: Evidence[]; location: SourceLocation; }
export interface SysvarUse { id: string; name: string; functionName?: string; instructionIds: string[]; accountId?: string; location: SourceLocation; evidence: Evidence[]; }
export interface RuntimeOperation { id: string; kind: string; api: string; functionName?: string; instructionIds: string[]; location: SourceLocation; evidence: Evidence[]; }
export interface EventInfo { id: string; name: string; framework?: string; discriminator?: string; location: SourceLocation; emissionSites: SourceLocation[]; evidence: Evidence[]; }
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
  type: 'uses' | 'reads' | 'writes' | 'signs' | 'derives' | 'cpi' | 'calls' | 'relates';
  label?: string;
}

export interface ProgramUnit {
  name: string;
  cargoMetadataId?: string;
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
  instructionDossiers?: InstructionDossier[];
  stateFlows?: StateFlow[];
  conditionalCompilation?: { featureKnowledge: 'cargo-metadata' | 'unknown'; enabledFeatures: string[]; inactiveItems: number; unknownItems: number; unknownPredicates: string[]; evidence: Evidence[] };
}

export interface WorkspaceReport {
  schemaVersion: string;
  tool: { name: string; version: string };
  generatedAt: string;
  compilationProfile?: CompilationProfile;
  workspace?: { name?: string; roots?: string[] };
  programs: ProgramUnit[];
  files: FileMetric[];
  diagnostics: string[];
  analysisDiagnostics?: AnalysisDiagnostic[];
  coverage?: SemanticCoverage;
  reviewProfile?: ReviewHotspot[];
  workspaceGraph?: WorkspaceGraph;
  idl?: IdlReport;
  auditManifest?: AuditManifest;
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

export type CallDispatchKind = 'direct' | 'inherent-method' | 'trait-method' | 'associated-function' | 'ufcs' | 'generic-bound' | 'trait-object' | 'closure' | 'function-item' | 'function-pointer' | 'macro-origin' | 'unknown';
export interface CallSite { id: string; caller: string; callee: string; resolved: boolean; sourceExpression?: string; candidateTargets?: string[]; target?: string; status?: CallResolutionStatus; confidence?: number; resolutionReason?: string; receiverType?: string; dispatchKind?: CallDispatchKind; indirect?: boolean; resolutionTransforms?: string[]; macroOrigins?: string[]; location: SourceLocation; evidence: Evidence[]; }
export interface CallCycle { id: string; kind: 'self-recursion' | 'mutual-recursion'; functions: string[]; callIds: string[]; evidence: Evidence[]; }
export interface CallGraph { symbols: string[]; calls: CallSite[]; edges: Array<{ source: string; target: string; confidence: number }>; cycles: CallCycle[]; }
export interface IdlInstructionAccount {
  name: string;
  signer?: boolean;
  writable?: boolean;
  optional?: boolean;
  address?: string;
  pda?: unknown;
  relations?: string[];
  docs?: string[];
  compositePath?: string[];
}
export interface IdlInstruction {
  name: string;
  discriminator?: string;
  arguments?: Array<{ name: string; type?: string; docs?: string[] }>;
  accounts: IdlInstructionAccount[];
  returns?: string;
  docs?: string[];
}
export interface IdlProgram {
  name?: string;
  address?: string;
  version?: string;
  spec?: string;
  description?: string;
  repository?: string;
  contact?: string;
  deployments?: Record<string, string | null>;
  dependencies?: Array<{ name: string; version: string }>;
  docs?: string[];
  instructions: IdlInstruction[];
  accounts?: Array<{ name: string; discriminator?: string }>;
  types?: Array<{ name: string; type?: unknown; serialization?: unknown; repr?: unknown; generics?: unknown[]; docs?: string[] }>;
  events?: Array<{ name: string; discriminator?: string }>;
  errors?: Array<{ name: string; code?: number; message?: string }>;
  constants?: Array<{ name: string; type?: string; value?: string; docs?: string[] }>;
  validationErrors?: string[];
  sourceUri?: string;
}
export interface IdlReconciliation { status: 'MATCHED' | 'SOURCE_ONLY' | 'IDL_ONLY' | 'MISMATCH' | 'UNKNOWN'; item: string; details?: string; }
export interface IdlReport { programs: IdlProgram[]; reconciliations: IdlReconciliation[]; diagnostics: string[]; }
