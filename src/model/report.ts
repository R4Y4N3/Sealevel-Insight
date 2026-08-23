import { SourceLocation } from './sourceLocation';

export interface FrameworkEvidence {
  framework: string;
  confidence: number;
  evidence: string[];
  location?: SourceLocation;
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
  evidence: string[];
  functionName?: string;
  contextType?: string;
}

export interface AccountInfo {
  name?: string;
  type: string;
  location: SourceLocation;
  evidence: string[];
  confidence: number;
}

export interface PdaSite {
  location: SourceLocation;
  functionName?: string;
  evidence: string[];
  confidence: number;
}

export interface CpiSite {
  location: SourceLocation;
  functionName?: string;
  target?: string;
  pdaSigned: boolean;
  evidence: string[];
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
  manualSerialization: number;
  cpiSites: CpiSite[];
  pdaSites: PdaSite[];
}

export interface ProgramUnit {
  name: string;
  manifestUri?: string;
  rootUri?: string;
  rustFiles: FileMetric[];
  functions: FunctionMetric[];
  instructions: InstructionInfo[];
  accounts: AccountInfo[];
  frameworkEvidence: FrameworkEvidence[];
  securitySurface: SecuritySurface;
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
