import {
  AuditManifest,
  Evidence,
  InstructionAccountDossier,
  InstructionCpiDossier,
  InstructionDossier,
  InstructionPdaDossier,
  ProgramUnit,
  StateFlow,
  StateFlowOperation,
  WorkspaceReport
} from '../model/report';

/** Rebuilds the deterministic, researcher-facing projections of the semantic model. */
export function refreshAuditProducts(report: WorkspaceReport): void {
  for (const program of report.programs) {
    program.instructionDossiers = buildInstructionDossiers(program);
    program.stateFlows = buildStateFlows(program);
  }
  report.auditManifest = buildAuditManifest(report);
}

function buildInstructionDossiers(program: ProgramUnit): InstructionDossier[] {
  return [...program.instructions].sort(byInstruction).map(instruction => {
    const instructionId = instruction.id ?? instruction.name;
    const surface = instruction.reachableSurface;
    const accountIds = surface?.accounts ?? [];
    const directAccounts = new Set(surface?.directAccounts ?? []);
    const directCpis = new Set(surface?.directCpis ?? []);
    const directPdas = new Set(surface?.directPdas ?? []);
    const accounts = program.accounts.filter(account => account.id && accountIds.includes(account.id)).map(account => {
      const relationship = (program.relationships ?? []).find(item => item.instructionId === instructionId && item.accountId === account.id)?.relationship ?? 'unknown';
      const stateTypeId = account.stateType ? program.stateTypes?.find(item => item.name === account.stateType)?.id : undefined;
      const dossier: InstructionAccountDossier = {
        accountId: account.id!, name: account.name ?? account.type, type: account.type, stateTypeId, stateType: account.stateType,
        relationship, direct: directAccounts.has(account.id!), signer: !!account.signer, writable: !!account.writable,
        executable: !!account.executable, unchecked: !!account.unchecked || !!account.raw, optional: !!account.optional,
        ownerValidation: { validated: !!account.ownerValidated, expected: account.ownerExpectation },
        addressValidation: { validated: !!account.addressValidated, expected: account.addressExpectation }, pdaId: account.pdaId,
        lifecycle: sorted(account.lifecycle ?? []), dataAccess: sorted(account.dataAccess ?? []), lamportAccess: sorted(account.lamportAccess ?? []),
        serialization: sorted(account.serialization ?? []), constraints: sorted((account.constraints ?? []).map(item => item.kind)),
        relations: [...(account.relations ?? [])].sort((a, b) => `${a.kind}:${a.target}`.localeCompare(`${b.kind}:${b.target}`)),
        location: account.location, evidence: dedupeEvidence(account.evidence)
      };
      return dossier;
    }).sort((a, b) => a.accountId.localeCompare(b.accountId));
    const cpis = program.securitySurface.cpiSites.filter(site => site.id && surface?.cpis.includes(site.id)).map(site => {
      const dossier: InstructionCpiDossier = {
        cpiId: site.id!, direct: directCpis.has(site.id!), target: site.target, targetKind: site.targetKind,
        operation: site.operation, operationCategory: site.operationCategory, functionName: site.functionName,
        invocationApi: site.invocationApi, programAccountExpression: site.programAccountExpression,
        accountArguments: sorted(site.accountArguments ?? []), pdaSigned: site.pdaSigned,
        signerPdaIds: sorted(site.signerPdaIds ?? []), location: site.location, evidence: dedupeEvidence(site.evidence)
      };
      return dossier;
    }).sort((a, b) => a.cpiId.localeCompare(b.cpiId));
    const pdas = program.securitySurface.pdaSites.filter(site => site.id && surface?.pdas.includes(site.id)).map(site => {
      const dossier: InstructionPdaDossier = {
        pdaId: site.id!, direct: directPdas.has(site.id!), seeds: [...(site.seeds ?? [])], bump: site.bump,
        programIdExpression: site.programIdExpression, usedAsSigner: !!site.usedAsSigner, relatedAccountId: site.relatedAccountId,
        relatedCpiIds: sorted(site.relatedCpiIds ?? []), location: site.location, evidence: dedupeEvidence(site.evidence)
      };
      return dossier;
    }).sort((a, b) => a.pdaId.localeCompare(b.pdaId));
    return {
      id: `dossier:${program.name}:${instructionId}`, program: program.name, instructionId, name: instruction.name,
      handler: instruction.handler ?? instruction.functionName, contextType: instruction.contextType, discriminator: instruction.discriminator,
      arguments: [...(instruction.arguments ?? [])], location: instruction.location,
      reachability: {
        complete: surface?.complete ?? false, incompleteReasons: sorted(surface?.incompleteReasons ?? []), functions: sorted(surface?.functions ?? []),
        unresolvedCalls: sorted(surface?.unresolvedCalls ?? []), ambiguousCalls: sorted(surface?.ambiguousCalls ?? [])
      },
      accounts, cpis, pdas,
      stateTypeIds: sorted(accounts.flatMap(item => item.stateTypeId ? [item.stateTypeId] : [])),
      externalProgramIds: sorted(surface?.externalPrograms ?? []), sysvarIds: sorted(surface?.sysvars ?? []),
      runtimeOperationIds: sorted(surface?.syscalls ?? []), eventIds: sorted(surface?.events ?? []), errorIds: sorted(surface?.errors ?? []),
      semanticSites: {
        initialization: sorted(surface?.initializationSites ?? []), realloc: sorted(surface?.reallocSites ?? []), close: sorted(surface?.closeSites ?? []),
        serialization: sorted(surface?.serializationSites ?? []), deserialization: sorted(surface?.deserializationSites ?? []),
        lamportMutation: sorted(surface?.lamportMutationSites ?? []), dataMutation: sorted(surface?.dataMutationSites ?? [])
      },
      reviewComplexity: surface?.reviewComplexity, evidence: dedupeEvidence(instruction.evidence)
    };
  });
}

function buildStateFlows(program: ProgramUnit): StateFlow[] {
  return (program.instructionDossiers ?? []).flatMap(dossier => dossier.accounts.map(account => {
    const operations = new Set<StateFlowOperation>(account.lifecycle ?? []);
    if (!operations.size) {
      if (account.relationship === 'writes') operations.add('write');
      else if (account.relationship === 'reads' || account.relationship === 'signer') operations.add('read');
      else operations.add('unknown');
    }
    return {
      id: `state-flow:${program.name}:${dossier.instructionId}:${account.accountId}`,
      instructionId: dossier.instructionId, accountId: account.accountId, stateTypeId: account.stateTypeId, stateType: account.stateType,
      direct: account.direct, relationship: account.relationship, operations: sorted([...operations]),
      dataAccess: sorted(account.dataAccess ?? []), lamportAccess: sorted(account.lamportAccess ?? []),
      serialization: sorted(account.serialization), location: account.location,
      evidence: dedupeEvidence([...account.evidence, { description: `Account is ${account.relationship} by instruction ${dossier.name}`, location: account.location }])
    } satisfies StateFlow;
  })).sort((a, b) => a.id.localeCompare(b.id));
}

function buildAuditManifest(report: WorkspaceReport): AuditManifest {
  const programs = [...report.programs].sort((a, b) => a.name.localeCompare(b.name));
  const reviewQueue = programs.flatMap(program => (program.instructionDossiers ?? []).map(dossier => ({
    dossierId: dossier.id, program: program.name, instruction: dossier.name, score: dossier.reviewComplexity?.score ?? 0,
    complete: dossier.reachability.complete,
    reasons: sorted([
      ...dossier.reachability.incompleteReasons,
      ...(dossier.reviewComplexity?.components.filter(item => item.contribution > 0).map(item => `${item.label}: ${item.value}`) ?? [])
    ]),
    location: dossier.location
  }))).sort((a, b) => b.score - a.score || a.dossierId.localeCompare(b.dossierId));
  const externalPrograms = programs.flatMap(program => (program.externalPrograms ?? []).map(item => ({
    id: `${program.name}:${item.id}`, program: program.name, name: item.name, kind: item.kind, programId: item.programId,
    cpiCount: item.cpiCount, signedCpiCount: item.signedCpiCount, calledByInstructions: sorted(item.calledByInstructions)
  }))).sort((a, b) => a.id.localeCompare(b.id));
  const allDossiers = programs.flatMap(program => program.instructionDossiers ?? []);
  const allFlows = programs.flatMap(program => program.stateFlows ?? []);
  return {
    formatVersion: 1, analysisMode: 'local-offline-deterministic',
    scope: {
      programs: programs.length, packages: report.workspaceGraph?.packages.length ?? new Set(programs.map(item => item.packageId).filter(Boolean)).size,
      sourceFiles: report.files.length, instructions: report.summary.instructions, dossiers: allDossiers.length, stateFlows: allFlows.length
    },
    programs: programs.map(program => ({
      program: program.name, packageId: program.packageId, packageKind: program.packageKind, programId: program.identity?.programId,
      frameworks: sorted(program.frameworkEvidence.map(item => item.framework)), sourceFiles: sorted(program.rustFiles.map(item => item.uri)),
      instructionDossierIds: sorted((program.instructionDossiers ?? []).map(item => item.id)), stateFlowIds: sorted((program.stateFlows ?? []).map(item => item.id)),
      externalProgramIds: sorted((program.externalPrograms ?? []).map(item => `${program.name}:${item.id}`)),
      dependencyCount: program.packageDependencies?.length ?? 0, reviewScore: program.reviewComplexity?.score ?? 0,
      coverageComplete: (program.instructionDossiers ?? []).every(item => item.reachability.complete)
    })),
    reviewQueue, externalPrograms,
    unresolved: {
      incompleteInstructionDossierIds: sorted(allDossiers.filter(item => !item.reachability.complete).map(item => item.id)),
      unknownOrDynamicCallIds: sorted(programs.flatMap(program => program.callGraph?.calls.filter(item => item.status === 'unresolved' || item.status === 'dynamic').map(item => item.id) ?? [])),
      ambiguousCallIds: sorted(programs.flatMap(program => program.callGraph?.calls.filter(item => item.status === 'ambiguous').map(item => item.id) ?? [])),
      dynamicCpiIds: sorted(programs.flatMap(program => program.securitySurface.cpiSites.filter(item => item.id && (item.targetKind === 'dynamic' || !item.target)).map(item => item.id!) )),
      idlMismatchItems: sorted(report.idl?.reconciliations.filter(item => item.status !== 'MATCHED').map(item => item.item) ?? [])
    },
    evidence: [
      { description: 'Audit manifest derived locally from parsed Rust, Cargo metadata, framework semantics, reachability, and optional local IDLs.' },
      { description: 'Records describe observable analysis evidence and review scope; they do not assert vulnerability findings.' }
    ]
  };
}

function dedupeEvidence(items: Evidence[]): Evidence[] {
  return [...new Map(items.map(item => [`${item.description}:${item.location?.uri ?? ''}:${item.location?.startLine ?? ''}:${item.location?.startColumn ?? ''}`, item])).values()]
    .sort((a, b) => `${a.location?.uri ?? ''}:${a.location?.startLine ?? 0}:${a.description}`.localeCompare(`${b.location?.uri ?? ''}:${b.location?.startLine ?? 0}:${b.description}`));
}
function sorted<T extends string>(items: T[]): T[] { return [...new Set(items)].sort(); }
function byInstruction(a: ProgramUnit['instructions'][number], b: ProgramUnit['instructions'][number]): number { return `${a.location.uri}:${a.location.startLine}:${a.name}`.localeCompare(`${b.location.uri}:${b.location.startLine}:${b.name}`); }
