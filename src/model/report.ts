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
  parseError?: string;
}

export interface FunctionMetric {
  name: string;
  location: SourceLocation;
  lines: number;
  complexity: number;
  parameters: number;
  isPublic: boolean;
  isUnsafe: boolean;
  program?: string;
}

export interface InstructionInfo {
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

export type PackageKind = 'solana-program' | 'library' | 'test' | 'unknown';

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
  rustFiles: FileMetric[];
  functions: FunctionMetric[];
  instructions: InstructionInfo[];
  accounts: AccountInfo[];
  frameworkEvidence: FrameworkEvidence[];
  securitySurface: SecuritySurface;
  relationships?: InstructionAccountRelationship[];
  architecture?: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] };
}

export interface WorkspaceReport {
  generatedAt: string;
  programs: ProgramUnit[];
  files: FileMetric[];
  diagnostics: string[];
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
