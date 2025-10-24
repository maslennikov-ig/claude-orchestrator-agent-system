# CLAUDE.md — Behavioral Operating System

**VERSION**: 3.0
**STATUS**: Canonical behavioral contract for all agents

## PART 1: PRIME DIRECTIVES

### PD-1: Return Control Pattern
- FORBIDDEN: Orchestrators invoking workers via Task tool
- REQUIRED: Orchestrators create plan files, return control, main session invokes workers

### PD-2: Quality Gates
- FORBIDDEN: Skip blocking quality gates without user confirmation
- REQUIRED: type-check, build, tests must PASS or user explicitly skips
- If gate fails: HALT, report to user, ask fix/skip

### PD-3: Changes Logging
- FORBIDDEN: Modify files without logging
- REQUIRED: ALL modifications logged to `.tmp/current/changes/{workflow}-changes.json`
- Format: `{timestamp, agent, changes: [{type, file, backup, description}]}`
- All changes must be reversible via `rollback-changes` Skill

### PD-4: Context7 Validation
- FORBIDDEN: Flag bugs/security without Context7 validation when available
- REQUIRED: Query Context7 for current best practices before flagging
- FALLBACK: If unavailable, reduce confidence, mark "REQUIRES_VERIFICATION"
- Workers MUST use `validate-context7-availability` Skill on invocation

### PD-5: Template Sync After Changes
- CRITICAL: After updating templates/, run `npm run sync:agents`
- TRIGGER: Any changes to templates/.claude/*, templates/docs/, templates/CLAUDE.md
- Auto-sync via git post-commit hook

### PD-6: Report Generation
- FORBIDDEN: Complete work without structured report
- REQUIRED: All workers generate report following REPORT-TEMPLATE-STANDARD.md
- Required sections: Header, Summary, Work Performed, Changes, Validation, Metrics, Errors, Next Steps, Artifacts
- Location: `.tmp/current/reports/{worker-name}-report.md`

### PD-7: Plan File Validation
- FORBIDDEN: Create invalid plan files
- REQUIRED: Validate via `validate-plan-file` Skill before use
- Required fields: `{phase, config, validation: {required, optional}, nextAgent}`

## PART 2: BEHAVIORAL CONTRACTS

### Orchestrator Promises
1. Create valid plan file (validated via `validate-plan-file`)
2. Specify clear `nextAgent` field
3. Define validation criteria in plan
4. NOT invoke workers directly (PD-1)
5. Validate worker outputs at quality gates
6. Provide rollback option on failure
7. Report progress via TodoWrite

### Worker Promises
1. Read plan file FIRST from `.tmp/current/plans/`
2. Execute work according to plan config
3. Log all changes for rollback (PD-3)
4. Generate structured report (PD-6)
5. Return control (no agent invocation)
6. Self-validate work before reporting success
7. Handle errors gracefully (rollback on failure)

### MCP Promises
- Worker: Check MCP availability before relying on it
- Worker: Use fallback if unavailable (general knowledge + reduced confidence)
- Worker: Document MCP usage in report
- Worker: Handle timeouts gracefully (retry once, 10s timeout, then fallback)

### User Promises
- Provide inputs when asked
- Make decisions when workflow blocked

## PART 3: FALLBACK STRATEGIES

### Context7 Unavailable
1. Log warning in report header
2. Lower confidence scores (High→Medium, Medium→Low)
3. Mark findings "REQUIRES_VERIFICATION"
4. Continue with general knowledge
5. Notify user of reduced accuracy

### Quality Gate Failure
1. HALT workflow
2. Report failure to user with details
3. If fix: Run `rollback-changes`, restore files, return control
4. If skip: Add warning to report, mark "UNVALIDATED", continue

### Max Iterations Reached
1. STOP iterative cycle (prevent infinite loop)
2. Generate comprehensive report (resolved, remaining, recommendations)
3. Ask user: continue/stop/manual

### Worker Failure
1. Check for missing report
2. Check changes log
3. If modifications: Initiate rollback via `rollback-changes`
4. Report to user with retry/abort options

### Plan File Invalid
1. Log validation errors
2. HALT workflow
3. Report internal error to user
4. Archive faulty plan to `.tmp/archive/failed-plans/{timestamp}/`
5. Exit workflow

## PART 4: EMERGENCY PROTOCOLS

### Infinite Loop Detected
- Detection: Same agent+config invoked 3+ times
- Use `check-infinite-loop` Skill before each invocation
- Action: HALT, report to user, archive diagnostic data, exit

### File Corruption
- Detection: Plan/report file unreadable (invalid JSON)
- Action: Try backup, if valid restore and continue, if not report emergency and abort

### Token Budget Exhausted
- At 180k: Simplify workflow (minimal reports, essential Context7 only)
- At 195k: HALT, generate emergency summary, exit

### Concurrent Workflow Conflict
- Detection: Lock file exists (`.tmp/current/locks/.active-fixer.lock`)
- Action: Report conflict, ask user wait/force/abort

## PART 5: SELF-DIAGNOSTICS PROTOCOL

Every agent MUST perform on invocation:

1. **Verify Identity**: Compare plan `nextAgent` to own name
2. **Verify Dependencies**: Check required files, tools, MCP servers
3. **Verify PD Compliance**: Check if about to violate any Prime Directive
4. **Log Invocation**: Record to `.tmp/current/logs/invocation-history.json`
5. **Proceed**: If all checks pass, execute work

If any check fails: HALT and report error.

## PART 6: OPERATIONAL PROCEDURES

### File Structure
**Temporary** (`.tmp/`):
- Plans: `.tmp/current/plans/.{workflow}-plan.json`
- Reports: `.tmp/current/reports/{report-name}.md`
- Changes: `.tmp/current/changes/{workflow}-changes.json`
- Backups: `.tmp/current/backups/`
- Logs: `.tmp/current/logs/invocation-history.json`
- Locks: `.tmp/current/locks/.{workflow}.lock`

**Permanent** (git committed):
- `docs/reports/bugs/{YYYY-MM}/{date}-bug-hunting-report.md`
- `docs/reports/security/{YYYY-MM}/{date}-security-audit.md`
- `docs/reports/cleanup/{YYYY-MM}/{date}-dead-code-report.md`
- `docs/reports/deps/{YYYY-MM}/{date}-dependency-audit.md`
- `docs/reports/summaries/{date}-health-summary.md`

### Agent Selection
- **Orchestrator**: Multi-phase workflows, quality gates, iterative cycles
- **Worker**: Single domain task, implement from plan, generate report
- **Skill**: Reusable utility, <100 lines, pure function

### Orchestrator Pattern
1. Pre-Flight: Setup directories
2. Create Plan: Write to `.tmp/current/plans/`
3. Validate Plan: Use `validate-plan-file`
4. Signal Readiness: Return control
5. Main Session Invokes Worker
6. Quality Gate: Validate output
7. Repeat or Finish

PROHIBITIONS: NO Task tool, NO implementation work, NO skip quality gates

### Worker Pattern
1. Self-Diagnostics
2. Read Plan from `.tmp/current/plans/`
3. Execute Work
4. Log Changes to `.tmp/current/changes/` (PD-3)
5. Validate Work
6. Generate Report (PD-6)
7. Return Control

PROHIBITIONS: NO invoke other agents, NO skip report, NO report success without validation

### Plan File Format
```json
{
  "phase": 1,
  "config": {},
  "validation": {
    "required": ["type-check", "build"],
    "optional": ["tests"]
  },
  "mcpGuidance": {
    "recommended": ["mcp__context7__*"],
    "library": "react",
    "reason": "Check current patterns"
  },
  "nextAgent": "worker-name"
}
```

### Report File Format
Required sections:
1. Header (type, timestamp, status: PASSED/PARTIAL/FAILED)
2. Executive Summary
3. Work Performed
4. Changes Made
5. Validation Results
6. Metrics
7. Errors Encountered
8. Next Steps
9. Artifacts

### Quality Gates
Blocking: Report exists, validation PASSED, no critical errors
If fails: STOP, report to user, ask fix/skip
Use `run-quality-gate` Skill

### TodoWrite Format
```json
{
  "content": "Phase 1: Discovery",
  "status": "in_progress",
  "activeForm": "Discovering codebase"
}
```
Status: pending | in_progress | completed | failed
EXACTLY ONE task in_progress at any time

### MCP Configuration
**Default** (`.mcp.json`): context7, server-sequential-thinking
**Full** (`.mcp.full.json`): + playwright, supabase, n8n, shadcn
Switch: `mv .mcp.json .mcp.minimal.json && mv .mcp.full.json .mcp.json`

## PART 7: REFERENCE

### Core Docs
- `docs/Agents Ecosystem/ARCHITECTURE.md`
- `docs/Agents Ecosystem/QUALITY-GATES-SPECIFICATION.md`
- `docs/Agents Ecosystem/REPORT-TEMPLATE-STANDARD.md`
- `docs/Agents Ecosystem/BEHAVIORAL-OS-GUIDE.md`

### Skills
- `validate-plan-file` - Validate plan schema (PD-7)
- `validate-report-file` - Validate report completeness (PD-6)
- `validate-context7-availability` - Check Context7 status (PD-4)
- `run-quality-gate` - Execute validation (PD-2)
- `rollback-changes` - Restore files (PD-3)
- `check-infinite-loop` - Detect loops (PART 4)
- `generate-report-header` - Create headers (PD-6)
- `format-commit-message` - Generate commits
- `parse-git-status` - Parse git output

---

All agents MUST comply with Prime Directives, Behavioral Contracts, and operational procedures.
