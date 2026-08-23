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
}

export interface InstructionInfo {
  id?: string;
  name: string;
  location: SourceLocation;
  confidence: number;
  evidence: Evidence[];
  functionName?: string;
  contextType?: string;
}

export interface AccountInfo {
  id?: string;
  name?: string;
  type: string;
  signer?: boolean;
  writable?: boolean;
  unchecked?: boolean;
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
  evidence: Evidence[];
  confidence: number;
}

export interface CpiSite {
  id?: string;
  location: SourceLocation;
  functionName?: string;
  enclosingInstruction?: string;
  target?: string;
  targetKind?: 'system-program' | 'spl-token' | 'token-2022' | 'associated-token' | 'custom' | 'dynamic' | 'unknown';
  invocationApi?: string;
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

export type PackageKind = 'solana-program' | 'program-library' | 'library' | 'client' | 'test' | 'build-tool' | 'generated' | 'unknown';

export interface CargoDependency {
  name: string;
  packageName?: string;
  version?: string;
  path?: string;
  optional: boolean;
  kind: 'normal' | 'dev' | 'build';
  internalPackageId?: string;
  evidence: Evidence[];
}

export interface CargoPackage {
  id: string;
  name: string;
  manifestUri: string;
  rootUri: string;
  kind: PackageKind;
  confidence: number;
  evidence: Evidence[];
  dependencies: CargoDependency[];
}

export interface CargoWorkspace {
  rootUri: string;
  manifestUri: string;
  members: string[];
  excluded: string[];
}

export interface WorkspaceGraph {
  workspaces: CargoWorkspace[];
  packages: CargoPackage[];
  dependencyEdges: Array<{ source: string; target: string; kind: 'internal' | 'external' }>;
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

export interface SemanticCoverage {
  parsedFiles: { resolved: number; total: number; percent: number };
  instructionContexts: { resolved: number; total: number; percent: number };
  cpiTargets: { resolved: number; total: number; percent: number };
  pdaSeeds: { resolved: number; total: number; percent: number };
}

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
}

export interface WorkspaceReport {
  schemaVersion: string;
  tool: { name: string; version: string };
  generatedAt: string;
  workspace?: { name?: string; roots?: string[] };
  programs: ProgramUnit[];
  files: FileMetric[];
  diagnostics: string[];
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

export interface CallSite { id: string; caller: string; callee: string; resolved: boolean; location: SourceLocation; evidence: Evidence[]; }
export interface CallGraph { symbols: string[]; calls: CallSite[]; edges: Array<{ source: string; target: string; confidence: number }>; }
export interface IdlInstruction { name: string; accounts: Array<{ name: string; signer?: boolean; writable?: boolean }>; }
export interface IdlProgram { address?: string; instructions: IdlInstruction[]; sourceUri?: string; }
export interface IdlReconciliation { status: 'MATCHED' | 'SOURCE_ONLY' | 'IDL_ONLY' | 'MISMATCH' | 'UNKNOWN'; item: string; details?: string; }
export interface IdlReport { programs: IdlProgram[]; reconciliations: IdlReconciliation[]; diagnostics: string[]; }
