# Behavioral Operating System Guide

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2025-10-21
**Applies To**: All agents (orchestrators, workers, skills)

---

## Table of Contents

1. [Overview](#overview)
2. [Prime Directives](#prime-directives)
3. [Behavioral Contracts](#behavioral-contracts)
4. [Fallback Strategies](#fallback-strategies)
5. [Emergency Protocols](#emergency-protocols)
6. [Self-Diagnostics](#self-diagnostics)
7. [Implementation Guide](#implementation-guide)
8. [Troubleshooting](#troubleshooting)
9. [Benefits](#benefits)
10. [Examples](#examples)

---

## Overview

### What is Behavioral OS?

The Behavioral Operating System transforms CLAUDE.md from a simple rules document into a **comprehensive behavioral contract** that governs how all agents operate, interact, and recover from failures.

**Key Concept**: Instead of telling agents "don't do X", Behavioral OS defines:
- **Prime Directives**: Non-negotiable rules that cannot be violated
- **Behavioral Contracts**: Explicit promises between agents
- **Fallback Strategies**: What to do when things fail
- **Emergency Protocols**: Recovery from critical failures
- **Self-Diagnostics**: Agents verify their own state

**Inspiration**: Based on [claude-code-sub-agent-collective](https://github.com/anthropics/claude-code-sub-agent-collective) patterns for reliable multi-agent orchestration.

---

### Why is Behavioral OS Needed?

**Problem**: Rule-based systems can be ignored or fail unpredictably:

```
Traditional Rules (Fragile):
"Orchestrators should not invoke workers directly"
❌ Agent can ignore this
❌ No enforcement mechanism
❌ No fallback if violated
❌ No recovery path
```

**Solution**: Behavioral OS (Robust):

```
Prime Directive PD-1:
❌ FORBIDDEN: Orchestrators MUST NOT invoke workers via Task tool
✅ REQUIRED: Create plan files → return control
⚡ ENFORCEMENT: If attempted, HALT and report error
🔄 RECOVERY: User intervention required
```

**Key Differences**:
- **Enforcement**: Rules are checked and violations halt execution
- **Contracts**: Explicit promises with defined consequences
- **Fallbacks**: Pre-defined recovery paths for failures
- **Transparency**: Users always know what's happening

---

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    BEHAVIORAL OS LAYERS                      │
├─────────────────────────────────────────────────────────────┤
│ PART 1: Prime Directives (Non-negotiable)                   │
│  PD-1: Return Control Pattern                               │
│  PD-2: Quality Gates                                        │
│  PD-3: Changes Logging                                      │
│  PD-4: Context7 Validation                                  │
│  PD-5: Template Sync                                        │
│  PD-6: Report Generation                                    │
│  PD-7: Plan File Validation                                 │
├─────────────────────────────────────────────────────────────┤
│ PART 2: Behavioral Contracts (Explicit promises)            │
│  Orchestrator ↔ Worker                                      │
│  Worker ↔ MCP Servers                                       │
│  Orchestrator ↔ User                                        │
├─────────────────────────────────────────────────────────────┤
│ PART 3: Fallback Strategies (Graceful degradation)          │
│  Context7 Unavailable → Reduced confidence                  │
│  Quality Gate Failure → User decision                       │
│  Max Iterations → Summary and stop                          │
│  Worker Failure → Rollback                                  │
│  Plan Invalid → Halt and report                             │
├─────────────────────────────────────────────────────────────┤
│ PART 4: Emergency Protocols (Critical recovery)             │
│  Infinite Loop → Halt and diagnose                          │
│  File Corruption → Restore from backup                      │
│  Token Exhaustion → Emergency summary                       │
│  Concurrent Conflict → Lock management                      │
├─────────────────────────────────────────────────────────────┤
│ PART 5: Self-Diagnostics (Agent self-verification)          │
│  Step 1: Verify Identity                                    │
│  Step 2: Verify Dependencies                                │
│  Step 3: Verify PD Compliance                               │
│  Step 4: Log Invocation                                     │
│  Step 5: Proceed with Work                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Prime Directives

Prime Directives are **non-negotiable rules** that agents MUST follow. Violations result in immediate halt and error reporting.

### PD-1: Return Control Pattern

**What it is**:
Orchestrators create plan files and return control to the main session, which then invokes workers. Orchestrators MUST NOT use the Task tool to invoke workers directly.

**Why it matters**:
Direct invocation breaks state management and error handling. The main session must manage agent lifecycles for proper context tracking and rollback capability.

**How it's enforced**:

```markdown
## Orchestrator: Before Creating Worker Plan

1. Check: Am I about to use Task tool to invoke worker?
2. If YES:
   ⛔ HALT immediately
   Report: "PD-1 VIOLATION: Cannot invoke workers via Task tool"
   Reason: "Return Control pattern required - create plan file instead"
3. If NO:
   ✅ Continue to create plan file
```

**Example Violation**:

```markdown
# ❌ WRONG (Violates PD-1)

## Phase 2: Invoke Bug Hunter

Use Task tool to invoke bug-hunter agent:
```
Task: bug-hunter
Config: { priority: "critical" }
```
```

**Example Correct**:

```markdown
# ✅ CORRECT (Follows PD-1)

## Phase 2: Prepare for Bug Hunter

1. Create plan file at `.tmp/current/plans/.bug-detection-plan.json`:
```json
{
  "phase": 1,
  "config": { "priority": "critical" },
  "validation": { "required": ["type-check"] },
  "nextAgent": "bug-hunter"
}
```

2. Validate plan using `validate-plan-file` Skill

3. Report to user:
   "Plan created for bug-hunter. Returning control - main session will invoke worker."

4. Return control (agent exits)

Main session automatically invokes bug-hunter based on plan file.
```

**Recovery**: If violated, orchestrator halts. User must fix orchestrator logic and restart workflow.

---

### PD-2: Quality Gates

**What it is**:
All blocking quality gates (type-check, build, tests) MUST pass before proceeding, OR user must explicitly choose to skip validation.

**Why it matters**:
Prevents broken code from being committed. Ensures all changes are validated before deployment.

**How it's enforced**:

```markdown
## Worker: After Making Changes

1. Run quality gates defined in plan file:
   - type-check: npm run type-check
   - build: npm run build
   - tests: npm test (if marked as required)

2. If ANY blocking gate fails:
   ⛔ HALT workflow immediately
   Report failure to user with details
   Ask: "Fix issues or skip validation? (fix/skip)"

3. If user chooses "fix":
   - Rollback changes via `rollback-changes` Skill
   - Return control for manual fix

4. If user chooses "skip":
   - Mark workflow as "UNVALIDATED"
   - Add critical warning to report
   - Continue (user assumes risk)

5. If all gates PASS:
   ✅ Continue to report generation
```

**Example Failure**:

```
⛔ Type-check failed after bug fixes

Errors (3):
- src/utils/helper.ts:42 - Type 'string' is not assignable to type 'number'
- src/components/Form.tsx:18 - Property 'onChange' missing in type
- src/services/api.ts:105 - Cannot find name 'ResponseType'

Options:
1. Fix issues (rollback changes, manual fix, retry)
2. Skip validation (mark workflow as UNVALIDATED - not recommended)

What would you like to do? (fix/skip)
```

**Example Skip Warning**:

```markdown
⚠️ **CRITICAL WARNING**: Type-check quality gate was SKIPPED

This workflow completed without type validation.
Manual verification is REQUIRED before deployment.

Unvalidated changes:
- src/utils/helper.ts
- src/components/Form.tsx
- src/services/api.ts
```

**Recovery**: User decides fix/skip. If fix, changes are rolled back. If skip, workflow continues with warnings.

---

### PD-3: Changes Logging

**What it is**:
ALL file modifications must be logged to `.tmp/current/changes/{workflow}-changes.json` with backups created before modification.

**Why it matters**:
Enables rollback on failure. Provides audit trail of all changes. Critical for emergency recovery.

**How it's enforced**:

```markdown
## Worker: Before Modifying ANY File

1. Check: Have I created changes log for this workflow?
2. If NO:
   - Create `.tmp/current/changes/{workflow}-changes.json`
   - Initialize with empty changes array

3. For EACH file modification:

   a. Create backup:
      - Copy original to `.tmp/current/backups/{file-path}.rollback`

   b. Log change:
      ```json
      {
        "type": "modified",
        "file": "src/utils/helper.ts",
        "backup": ".tmp/current/backups/src/utils/helper.ts.rollback",
        "description": "Fixed type error in parseData function",
        "timestamp": "2025-10-21T14:30:00Z"
      }
      ```

   c. Make modification

   d. If modification fails:
      - Restore from backup immediately
      - Remove log entry
      - Report error

4. For file creation:
   ```json
   {
     "type": "created",
     "file": "src/utils/validator.ts",
     "backup": null,
     "description": "Added input validation utility"
   }
   ```

5. For file deletion:
   ```json
   {
     "type": "deleted",
     "file": "src/legacy/old-helper.ts",
     "backup": ".tmp/current/backups/src/legacy/old-helper.ts.rollback",
     "description": "Removed deprecated helper"
   }
   ```
```

**Example Changes Log**:

```json
{
  "timestamp": "2025-10-21T14:30:00Z",
  "agent": "bug-fixer",
  "workflow": "health-bugs",
  "changes": [
    {
      "type": "modified",
      "file": "src/utils/helper.ts",
      "backup": ".tmp/current/backups/src/utils/helper.ts.rollback",
      "description": "Fixed type error in parseData function",
      "timestamp": "2025-10-21T14:30:15Z"
    },
    {
      "type": "created",
      "file": "src/utils/validator.ts",
      "backup": null,
      "description": "Added input validation utility",
      "timestamp": "2025-10-21T14:30:45Z"
    },
    {
      "type": "deleted",
      "file": "src/legacy/old-helper.ts",
      "backup": ".tmp/current/backups/src/legacy/old-helper.ts.rollback",
      "description": "Removed deprecated helper",
      "timestamp": "2025-10-21T14:31:20Z"
    }
  ]
}
```

**Recovery**: Use `rollback-changes` Skill to restore all files from backups and delete created files.

---

### PD-4: Context7 Validation

**What it is**:
Workers MUST query Context7 for current best practices before flagging any bug or security issue (when Context7 is available). If unavailable, use fallback with reduced confidence.

**Why it matters**:
AI models are trained on data up to a cutoff date. Context7 provides real-time access to current library documentation, preventing false positives from outdated knowledge.

**How it's enforced**:

```markdown
## Worker: At Startup (Pre-flight)

1. Use `validate-context7-availability` Skill:
   ```json
   {
     "worker_name": "bug-hunter",
     "required": true
   }
   ```

2. Set internal flag:
   - If available: `context7_available = true`
   - If unavailable: `context7_available = false`

3. Add status to report header:
   ```markdown
   **Context7 Status**: ✅ Available | ⚠️ Unavailable
   **Confidence Mode**: High (Context7) | Reduced (No Context7)
   ```

## Worker: For EACH Potential Finding

1. Check `context7_available` flag

2. If TRUE:
   a. Query Context7:
      ```
      Use mcp__context7__resolve-library-id:
      - name: "react"
      - version: "18.2.0" (from package.json)

      Then mcp__context7__get-library-docs:
      - library_id: (from previous result)
      - query: "useEffect dependency array exhaustive-deps rule"
      ```

   b. Validate finding against Context7 response:
      - If confirmed → flag with HIGH confidence
      - If valid pattern → skip (avoid false positive)
      - If unclear → flag with MEDIUM confidence

   c. Include Context7 validation in finding:
      ```markdown
      **Confidence**: high ✅ (validated via Context7)
      **Source**: React 18.2.0 official docs via Context7
      ```

3. If FALSE:
   a. Flag with reduced confidence:
      ```markdown
      **Confidence**: medium ⚠️ (reduced from high - Context7 unavailable)
      **Verification Status**: REQUIRES_VERIFICATION
      ```

   b. Add note:
      ```markdown
      **Note**: This finding is based on general knowledge and may be
      outdated for your specific version. Verify manually.
      ```

4. NEVER skip Context7 validation if available
```

**Example with Context7**:

```markdown
### Bug: Missing useEffect dependency

**File**: `src/hooks/useData.ts:15`
**Severity**: medium
**Confidence**: high ✅ (validated via Context7)
**Source**: React 18.2.0 official docs via Context7

**Issue**: Variable `userId` is used in effect but not in dependency array
**Recommendation**: Add `userId` to dependency array per React 18.2 exhaustive-deps rule

**Context7 Validation**:
- Query: "React useEffect exhaustive-deps rule"
- Library: react@18.2.0
- Result: Confirmed this is an error per React 18.2 rules
```

**Example without Context7**:

```markdown
### Bug: Missing useEffect dependency

**File**: `src/hooks/useData.ts:15`
**Severity**: medium
**Confidence**: medium ⚠️ (reduced from high - Context7 unavailable)
**Verification Status**: REQUIRES_VERIFICATION

**Issue**: Variable `userId` appears to be used in effect but not in dependency array
**Recommendation**: Verify with React documentation (version in package.json)
**Note**: This finding is based on general React knowledge and may be outdated for your specific version.

⚠️ **Context7 Unavailable**: Install Context7 for validated findings.
```

**Recovery**: If Context7 unavailable, work continues with reduced confidence. See [Fallback 1: Context7 Unavailable](#fallback-1-context7-unavailable).

---

### PD-5: Template Sync After Changes

**What it is**:
After updating files in `templates/` directory, changes MUST be synced to local `.claude/` directory via `npm run sync:agents`.

**Why it matters**:
We develop agents in `templates/` (source of truth for generator), but USE agents from `.claude/` (local working copy). Without sync: improvements don't help development ("Сапожник без сапог").

**How it's enforced**:

```markdown
## After Modifying templates/ Files

1. Commit changes:
   ```bash
   git add templates/
   git commit -m "T003: Update bug-hunter with Context7 validation"
   ```

2. Git post-commit hook automatically runs:
   ```bash
   npm run sync:agents
   ```

3. Verify sync completed:
   ```bash
   ls .claude/agents/health/workers/bug-hunter.md  # Should exist
   ls .claude/skills/validate-context7-availability/  # Should exist
   ```

4. If sync failed:
   - Manual sync: `npm run sync:agents`
   - Check for errors in sync script
   - Verify file permissions
```

**Automatic Sync Flow**:

```
1. Developer updates templates/.claude/agents/health/workers/bug-hunter.md
2. git commit -m "T003: Add Context7 validation"
3. 🎉 Git post-commit hook runs automatically
4. Hook executes: npm run sync:agents
5. Sync copies: templates/.claude/* → .claude/*
6. ✅ Improved agent immediately available for use
```

**Manual Sync** (if automatic fails):

```bash
npm run sync:agents
```

**Recovery**: If sync missed, run manual sync. Verify by checking if new files/changes appear in `.claude/`.

---

### PD-6: Report Generation

**What it is**:
ALL workers MUST generate a structured report following REPORT-TEMPLATE-STANDARD.md before completing work.

**Why it matters**:
Orchestrators rely on reports to validate work and decide next steps. Missing reports break workflows and prevent quality gates from running.

**How it's enforced**:

```markdown
## Worker: Before Completing Work

1. Generate report at `.tmp/current/reports/{worker-name}-report.md`

2. Report MUST include all required sections:
   - Header (type, timestamp, status)
   - Executive Summary
   - Work Performed
   - Changes Made
   - Validation Results
   - Metrics
   - Errors Encountered
   - Next Steps
   - Artifacts

3. Use `validate-report-file` Skill to verify completeness:
   ```json
   {
     "report_path": ".tmp/current/reports/bug-detection-report.md",
     "required_sections": [
       "Header",
       "Executive Summary",
       "Work Performed",
       "Validation Results",
       "Next Steps"
     ]
   }
   ```

4. If validation fails:
   ⛔ HALT and fix report
   Do NOT exit without valid report

5. If validation passes:
   ✅ Report completion to user
   Return control

## Orchestrator: After Worker Returns

1. Check for report file:
   ```bash
   ls .tmp/current/reports/bug-detection-report.md
   ```

2. If NOT FOUND:
   ⛔ Worker violated PD-6
   Initiate Fallback 4: Worker Failure
   Check for changes to rollback

3. If FOUND:
   ✅ Continue to quality gate validation
```

**Example Report Header**:

```markdown
# Bug Detection Report

**Generated**: 2025-10-21 14:30:00 UTC
**Worker**: bug-hunter
**Status**: ✅ PASSED
**Context7 Status**: ✅ Available
**Confidence Mode**: High (Context7)

---

## Executive Summary

Detected 12 bugs across 8 files.
- Critical: 2
- High: 4
- Medium: 5
- Low: 1

All findings validated via Context7 for React 18.2.0, TypeScript 5.0.0.

---
```

**Recovery**: If report missing, see [Fallback 4: Worker Failure](#fallback-4-worker-failure).

---

### PD-7: Plan File Validation

**What it is**:
All plan files MUST be validated via `validate-plan-file` Skill after creation (orchestrator) and before reading (worker).

**Why it matters**:
Invalid plan files cause worker failures and break workflows. Validation catches errors early before workers are invoked.

**How it's enforced**:

```markdown
## Orchestrator: After Creating Plan File

1. Create plan at `.tmp/current/plans/.{workflow}-plan.json`

2. Validate using `validate-plan-file` Skill:
   ```json
   {
     "plan_path": ".tmp/current/plans/.bug-detection-plan.json"
   }
   ```

3. Check validation result:
   ```json
   {
     "valid": true,
     "errors": []
   }
   ```

4. If valid = false:
   ⛔ HALT immediately
   Report errors to user:
   ```
   ⛔ Internal Error: Invalid Plan File Created

   Validation errors:
   - Missing required field: nextAgent
   - Invalid phase number: expected 1-5, got 6

   This is a bug in orchestrator logic.
   Please report this issue.
   ```

   Archive faulty plan to `.tmp/archive/failed-plans/{timestamp}/`
   Exit workflow

5. If valid = true:
   ✅ Continue to signal readiness

## Worker: Before Reading Plan File

1. Read plan file

2. Validate using `validate-plan-file` Skill

3. If invalid:
   ⛔ Report error:
   ```
   ⛔ Plan file invalid - cannot proceed

   Worker: bug-hunter
   Plan file: .tmp/current/plans/.bug-detection-plan.json

   This is an orchestrator bug.
   Workflow aborted.
   ```

   Exit immediately

4. If valid:
   ✅ Continue to self-diagnostics
```

**Required Plan Schema**:

```json
{
  "phase": 1,
  "config": {
    "priority": "critical",
    "scope": ["src/"]
  },
  "validation": {
    "required": ["type-check", "build"],
    "optional": ["tests"]
  },
  "nextAgent": "bug-hunter"
}
```

**Recovery**: If plan invalid, orchestrator must be fixed. See [Fallback 5: Plan File Invalid](#fallback-5-plan-file-invalid).

---

## Behavioral Contracts

Behavioral Contracts are **explicit promises** between agents and systems. Contracts define what each party promises to do and what happens if violated.

### Contract: Orchestrator ↔ Worker

**Purpose**: Define responsibilities between orchestrators (coordinators) and workers (executors).

#### Orchestrator Promises

1. **Create valid plan file**
   - Validated via `validate-plan-file` Skill (PD-7)
   - Contains all required fields
   - Defines clear validation criteria

2. **Specify clear nextAgent field**
   - Points to correct worker name
   - Worker exists and is available

3. **Define validation criteria**
   - Required gates (blocking): type-check, build
   - Optional gates (non-blocking): tests, lint

4. **NOT invoke workers directly**
   - Follow Return Control pattern (PD-1)
   - Create plan → return control → main session invokes

5. **Validate worker outputs**
   - Check for report file existence
   - Verify report completeness
   - Run quality gates on changes

6. **Provide rollback option**
   - On worker failure, offer rollback
   - Use `rollback-changes` Skill
   - Clean up temporary artifacts

7. **Report progress**
   - Use TodoWrite to track phases
   - Mark in_progress → completed
   - User always knows status

**Example Orchestrator Promise Fulfillment**:

```markdown
## Phase 2: Create Bug Detection Plan

1. Create plan file:
   ```json
   {
     "phase": 1,
     "config": { "priority": "critical", "maxBugs": 10 },
     "validation": { "required": ["type-check"] },
     "nextAgent": "bug-hunter"
   }
   ```

2. Validate plan:
   Use `validate-plan-file` → ✅ valid

3. Update progress:
   TodoWrite: Phase 1 → completed

4. Return control:
   Report: "Plan created for bug-hunter. Returning control."
   Main session will invoke worker automatically.
```

#### Worker Promises

1. **Read plan file FIRST**
   - Before any work
   - From `.tmp/current/plans/.{workflow}-plan.json`
   - Validate plan schema

2. **Execute work according to plan config**
   - Respect priority, scope, limits
   - Follow validation criteria
   - Adhere to configuration parameters

3. **Log all changes**
   - For rollback capability (PD-3)
   - Create backups before modification
   - Track created/modified/deleted files

4. **Generate structured report**
   - Follow REPORT-TEMPLATE-STANDARD.md (PD-6)
   - Include all required sections
   - Validate report before completing

5. **Return control**
   - No agent invocation
   - No Task tool usage
   - Exit to main session

6. **Self-validate work**
   - Run quality gates internally
   - Verify changes pass type-check, build
   - Report validation status

7. **Handle errors gracefully**
   - Rollback on failure
   - Report issues clearly
   - Provide recovery options

**Example Worker Promise Fulfillment**:

```markdown
## Worker: bug-hunter Execution

1. Read plan:
   - Path: `.tmp/current/plans/.bug-detection-plan.json`
   - Config: { priority: "critical", maxBugs: 10 }

2. Execute detection:
   - Scan files in scope: ["src/"]
   - Detect bugs (max 10)
   - Validate via Context7

3. Log changes:
   - No files modified (detection only)
   - Changes log: empty

4. Self-validate:
   - No quality gates required (no modifications)

5. Generate report:
   - Path: `.tmp/current/reports/bug-detection-report.md`
   - Sections: All required
   - Status: ✅ PASSED

6. Return control:
   Exit to main session
```

#### If Contract Violated

**Worker Violation Example**:

```markdown
⛔ Worker Contract Violation

Worker: bug-fixer
Violation: Did not generate report (PD-6)

Expected report: `.tmp/current/reports/bug-fixing-report.md`
Status: NOT FOUND

Worker exited without generating report.

Orchestrator action:
1. Check changes log for modifications
2. If modifications exist → initiate rollback
3. Report to user with recovery options

User options:
1. Retry with same config
2. Retry with reduced scope
3. Abort workflow
```

**Orchestrator Violation Example**:

```markdown
⛔ Orchestrator Contract Violation

Orchestrator: bug-orchestrator
Violation: Created invalid plan file (PD-7)

Plan file: `.tmp/current/plans/.bug-detection-plan.json`
Validation errors:
- Missing required field: nextAgent
- Invalid phase number: expected 1-5, got 6

This is a bug in orchestrator logic.

Recovery:
1. Archive faulty plan for debugging
2. Halt workflow
3. User or developer must fix orchestrator
4. Restart workflow when fixed
```

---

### Contract: Worker ↔ MCP Servers

**Purpose**: Define how workers interact with external MCP servers (Context7, Supabase, etc.) and handle failures.

#### Worker Promises

1. **Check MCP availability**
   - Use `validate-context7-availability` Skill for Context7
   - Check server status before critical operations
   - Don't assume MCP is available

2. **Use fallback strategy**
   - Context7 unavailable → general knowledge + reduced confidence
   - Supabase unavailable → skip RLS checks, warn user
   - Document fallback in report

3. **Document MCP usage**
   - Which servers used
   - What queries performed
   - Impact on findings

4. **Handle MCP timeouts**
   - Retry once (10 second timeout)
   - If still fails → fallback to general knowledge
   - Log timeout in report

**Example Worker-MCP Interaction**:

```markdown
## Worker: security-scanner

1. Pre-flight check:
   Use `validate-context7-availability`:
   Result: ✅ Available

2. For SQL injection finding:
   a. Query Context7:
      Library: prisma@5.1.0
      Query: "SQL injection prevention parameterized queries"
      Timeout: 10 seconds

   b. If response received:
      ✅ Validate finding against Context7 docs
      Mark confidence: HIGH

   c. If timeout:
      ⚠️ Retry once
      If still timeout → fallback to general knowledge
      Mark confidence: MEDIUM
      Note: "Context7 query timed out - using general knowledge"

3. Report MCP usage:
   ```markdown
   **MCP Servers Used**:
   - Context7: 12 queries (11 successful, 1 timeout)
   - Libraries validated: prisma@5.1.0, react@18.2.0
   ```
```

#### MCP Promises (Expected)

1. **Provide accurate documentation**
   - Context7 returns latest library docs
   - Supabase returns current schema
   - Information is up-to-date

2. **Respond within timeframe**
   - Target: <10 seconds per query
   - If longer, worker should timeout and fallback

**Note**: MCPs are external systems - these are expectations, not guarantees.

#### If Contract Violated

**MCP Timeout**:

```markdown
⚠️ Context7 Query Timeout

Query: "React useEffect exhaustive-deps rule"
Library: react@18.2.0
Timeout: 10 seconds

Action:
1. Retry once ✅
2. Still timeout → fallback to general knowledge
3. Mark finding: confidence = MEDIUM
4. Note: "Context7 timed out - using general knowledge"
```

**MCP Unavailable**:

```markdown
⚠️ Context7 Unavailable

Context7 MCP server not available during analysis.

Action:
1. Log warning in report header
2. Continue with general knowledge
3. Reduce all confidence scores by 1 level
4. Mark all findings: REQUIRES_VERIFICATION
5. Notify user to install Context7

Impact:
- Confidence: High → Medium
- False positive risk: Increased
- Manual verification needed
```

**Worker Didn't Check MCP**:

```markdown
⚠️ Worker Contract Violation

Worker: bug-hunter
Violation: Flagged finding without Context7 validation

Finding: Missing useEffect dependency
Confidence claimed: HIGH
Context7 query: NONE

Action:
1. Reduce confidence: HIGH → LOW
2. Add note: "Not validated via Context7 - general knowledge only"
3. Mark: REQUIRES_VERIFICATION
```

---

### Contract: Orchestrator ↔ User

**Purpose**: Define expectations between orchestrators and users for workflow management and decision-making.

#### Orchestrator Promises

1. **Report progress**
   - Via TodoWrite tool
   - Mark phases: pending → in_progress → completed
   - User always knows current status

2. **Ask for user decision when blocked**
   - Quality gate fails: "Fix or skip?"
   - Worker fails: "Retry, rollback, or abort?"
   - Max iterations: "Continue or stop?"

3. **Provide rollback option**
   - On failure, offer rollback
   - Use `rollback-changes` Skill
   - Restore files to pre-workflow state

4. **Limit iterations**
   - Max 3 cycles per workflow
   - Prevent infinite loops
   - HALT if loop detected

5. **Generate comprehensive final report**
   - Summary of all phases
   - Metrics (success rate, changes)
   - Next steps and recommendations

**Example Progress Reporting**:

```markdown
## Orchestrator: TodoWrite Updates

Phase 1: Detection
Status: in_progress
"Detecting bugs via bug-hunter worker"
→ completed

Phase 2: Implementation
Status: in_progress
"Fixing detected bugs (iteration 1/3)"
→ completed

Phase 3: Verification
Status: in_progress
"Verifying all fixes passed quality gates"
→ completed
```

**Example User Decision**:

```markdown
⛔ Quality Gate Failed

Type-check failed with 3 errors after bug fixes.

Errors:
- src/utils/helper.ts:42 - Type error
- src/components/Form.tsx:18 - Missing property
- src/services/api.ts:105 - Unknown type

What would you like to do?
1. Fix issues (rollback changes, manual fix, retry)
2. Skip validation (mark UNVALIDATED - not recommended)

User decision needed: (fix/skip)
```

#### User Promises (Expected)

1. **Provide necessary inputs**
   - Configuration preferences
   - Fix/skip decisions
   - Continue/abort choices

2. **Make decisions when blocked**
   - Respond to quality gate failures
   - Choose retry/rollback options
   - Decide on iteration limits

**Note**: Users are external - these are expectations, not guarantees.

#### If Contract Violated

**User Unresponsive**:

```markdown
⏸️ Workflow Paused (User Unresponsive)

Waiting for user decision on quality gate failure.
No response for 2 minutes.

Action:
1. Re-prompt user
2. If still no response (5 minutes total):
   - Archive partial results
   - Generate emergency summary
   - Exit gracefully

Partial results saved:
- Detection report: `.tmp/current/reports/bug-detection-report.md`
- Changes log: `.tmp/current/changes/bug-changes.json`
- Resume plan: `.tmp/current/plans/.bug-fixing-plan.json`

To resume: /health-bugs --resume-from=.tmp/current/plans/.bug-fixing-plan.json
```

**Orchestrator Failed to Report**:

```markdown
⛔ Orchestrator Stopped Reporting

Last update: Phase 2 (5 minutes ago)
Current status: Unknown

User recovery options:

1. Check last worker report:
   cat .tmp/current/reports/bug-fixing-report.md

2. Check git status for uncommitted changes:
   git status

3. Rollback if needed:
   Use `rollback-changes` Skill manually

4. Restart workflow:
   /health-bugs
```

---

## Fallback Strategies

Fallback Strategies define **what to do when things fail**. Instead of crashing, agents degrade gracefully and continue with reduced capability.

### Fallback 1: Context7 Unavailable

**Trigger**: Context7 MCP tools not found or timing out

**Scenario**: Worker tries to validate findings via Context7, but Context7 MCP server is not running or not configured.

**Action**:

```markdown
1. Log warning in report header:
   ```markdown
   ⚠️ **Context7 Unavailable**
   Context7 MCP server not available - findings based on general knowledge only.
   Confidence scores reduced. All findings marked as "REQUIRES_VERIFICATION".
   ```

2. Lower confidence scores:
   - High → Medium
   - Medium → Low
   - Low → Very Low

3. Mark findings as "REQUIRES_VERIFICATION":
   ```markdown
   ### Bug #1: Potential race condition
   **Confidence**: MEDIUM (reduced from HIGH due to Context7 unavailable)
   **Status**: ⚠️ REQUIRES_VERIFICATION
   ```

4. Continue work with general knowledge:
   - Use built-in knowledge of best practices
   - Reference static docs (if available)
   - Apply common patterns

5. Notify user of reduced accuracy:
   ```
   ⚠️ Context7 MCP server unavailable

   Proceeding with general knowledge only.
   Findings may not reflect latest library best practices.

   Recommendation: Verify findings manually or enable Context7 MCP.

   To enable Context7:
   1. Add to .mcp.json
   2. Restart Claude Code
   ```

**Do NOT**: Halt workflow (Context7 is enhancement, not requirement)
```

**Example Report with Fallback**:

```markdown
# Bug Detection Report

**Generated**: 2025-10-21 14:30:00 UTC
**Worker**: bug-hunter
**Status**: ⚠️ PARTIAL
**Context7 Status**: ⚠️ Unavailable
**Confidence Mode**: Reduced (No Context7)

---

## ⚠️ Context7 Unavailability Notice

Context7 MCP server was not available during analysis.
All findings are based on general knowledge and may be outdated.

**Impact**:
- Confidence scores reduced by 1 level
- All findings marked as "REQUIRES_VERIFICATION"
- False positive risk: Increased from <5% to ~20-30%

**Recommendation**: Install Context7 for accurate pattern validation:
```bash
# Add to .mcp.json:
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

---

## Executive Summary

Detected 8 bugs (all marked REQUIRES_VERIFICATION):
- Critical: 2 (confidence: MEDIUM - verify manually)
- High: 3 (confidence: LOW - verify manually)
- Medium: 3 (confidence: VERY LOW - verify manually)

⚠️ Manual verification strongly recommended for all findings.
```

**When to Use**: Always when Context7 unavailable. Don't halt - provide value with reduced confidence.

---

### Fallback 2: Quality Gate Failure

**Trigger**: Blocking gate fails (type-check, build, tests)

**Scenario**: Worker makes changes, runs quality gates, and type-check fails with errors.

**Action**:

```markdown
1. HALT workflow immediately

2. Report failure to user with details:
   ```
   ⛔ Type-check failed after bug fixes

   Errors (3):
   - src/utils/helper.ts:42 - Type 'string' is not assignable to type 'number'
   - src/components/Form.tsx:18 - Property 'onChange' missing in type
   - src/services/api.ts:105 - Cannot find name 'ResponseType'

   Options:
   1. Fix issues (rollback changes, manual fix, retry)
   2. Skip validation (mark workflow as UNVALIDATED - not recommended)

   What would you like to do? (fix/skip)
   ```

3. If user chooses "fix":
   a. Run `rollback-changes` Skill:
      - Restore backups from `.tmp/current/backups/`
      - Delete created files
      - Clean up temporary artifacts

   b. Provide diagnostic info:
      ```
      ✅ Changes rolled back successfully

      Restored files (3):
      - src/utils/helper.ts
      - src/components/Form.tsx
      - src/services/api.ts

      Next steps:
      1. Review errors above
      2. Fix manually or adjust workflow config
      3. Retry workflow when ready
      ```

   c. Return control to user

4. If user chooses "skip":
   a. Add warning to final report:
      ```markdown
      ⚠️ **CRITICAL WARNING**: Type-check quality gate was SKIPPED

      This workflow completed without type validation.
      Manual verification is REQUIRED before deployment.

      Unvalidated changes:
      - src/utils/helper.ts
      - src/components/Form.tsx
      - src/services/api.ts
      ```

   b. Mark workflow as "UNVALIDATED"
   c. Continue workflow
   d. All subsequent reports show "UNVALIDATED" badge
```

**Example Fix Flow**:

```
⛔ Type-check failed

User chooses: fix

Rollback initiated...
✅ Restored: src/utils/helper.ts
✅ Restored: src/components/Form.tsx
✅ Restored: src/services/api.ts
✅ Deleted: src/utils/validator.ts (created file)

Changes rolled back successfully.

Control returned to user for manual fix.
```

**Example Skip Flow**:

```
⛔ Type-check failed

User chooses: skip

⚠️ WARNING: Proceeding without type validation

Workflow marked as: UNVALIDATED
Manual verification REQUIRED before deployment

Continuing workflow...
```

**When to Use**: Always when blocking quality gates fail. Never proceed without user decision.

---

### Fallback 3: Max Iterations Reached

**Trigger**: Orchestrator completes 3 iterations, issues remain

**Scenario**: Bug-fixing workflow runs 3 times, fixes 8 bugs, but 4 complex bugs remain.

**Action**:

```markdown
1. STOP iterative cycle (prevent infinite loop)

2. Generate comprehensive report:
   - Issues resolved (with details)
   - Issues remaining (prioritized by complexity)
   - Recommendations for each category
   - Next steps with options

3. Ask user for decision:
   - Continue for 1 more iteration? (risky)
   - Stop here and review? (recommended)
   - Manual intervention? (hybrid)

4. If continue:
   - Reset iteration counter to 1
   - Update plan with reduced scope
   - Resume at Phase 2

5. If stop:
   - Archive results to `.tmp/archive/{timestamp}/`
   - Generate final summary
   - Save to `docs/reports/summaries/{date}-health-summary.md`
   - Exit gracefully
```

**Example Max Iterations Report**:

```markdown
# Max Iterations Reached (3/3)

## Issues Resolved ✅

**Total**: 8 bugs fixed successfully

1. Bug #1: Type error in UserService
   - Priority: critical, Complexity: 3
   - Status: ✅ Fixed and validated

2. Bug #2: Missing null check in API handler
   - Priority: high, Complexity: 2
   - Status: ✅ Fixed and validated

3. Bug #3: Incorrect state update
   - Priority: high, Complexity: 4
   - Status: ✅ Fixed and validated

4. Bug #4: Memory leak in component
   - Priority: medium, Complexity: 5
   - Status: ✅ Fixed and validated

5. Bug #5: Race condition in auth flow
   - Priority: critical, Complexity: 6
   - Status: ✅ Fixed and validated

6. Bug #6: Improper error handling
   - Priority: medium, Complexity: 3
   - Status: ✅ Fixed and validated

7. Bug #7: Missing validation
   - Priority: high, Complexity: 2
   - Status: ✅ Fixed and validated

8. Bug #8: Incorrect async logic
   - Priority: medium, Complexity: 4
   - Status: ✅ Fixed and validated

**Validation**: All fixes passed type-check, build, and tests

---

## Issues Remaining ⏳

**Total**: 4 bugs (ranked by complexity/priority)

1. **Bug #9**: Complex WebRTC state management issue
   - Complexity: 9/10 (research required)
   - Priority: high
   - Reason not fixed: Requires deep protocol understanding
   - Recommendation: Use research-agent or manual deep-dive

2. **Bug #10**: Performance degradation in large lists
   - Complexity: 7/10
   - Priority: medium
   - Reason not fixed: Needs profiling and benchmarking
   - Recommendation: Dedicated performance optimization task

3. **Bug #11**: TypeScript strict mode warning
   - Complexity: 4/10
   - Priority: low
   - Reason not fixed: Non-critical, deprioritized
   - Recommendation: Batch-fix in next cleanup cycle

4. **Bug #12**: Console.log cleanup
   - Complexity: 1/10
   - Priority: low
   - Reason not fixed: Max iterations reached
   - Recommendation: Quick manual cleanup (5 minutes)

---

## Recommendations

1. **High-complexity issues (Bug #9, #10)**:
   - Address separately with dedicated research
   - Bug #9: Use research-agent or manual deep-dive
   - Bug #10: Use profiling tools (React DevTools, Chrome Performance)

2. **Low-complexity issues (Bug #11, #12)**:
   - Batch-fix in next `/health-bugs` run
   - Or fix manually (total effort: <30 minutes)

3. **Quality status**:
   - Critical and high priority bugs: ✅ Resolved
   - Codebase health: Significantly improved
   - Safe to deploy current fixes

---

## Next Steps

**Option 1**: Continue for 1 more iteration
- Focus on Bug #9 and #10 only
- Skip low-priority issues
- Risk: May still hit complexity limits

**Option 2**: Stop here and review (RECOMMENDED)
- Deploy current fixes (8 bugs resolved)
- Address high-complexity issues separately
- Batch remaining low-priority issues later

**Option 3**: Manual intervention
- Take over Bug #9, #10 manually
- Use research tools and profiling
- Return to automation for Bug #11, #12

What would you like to do? (continue/stop/manual)
```

**When to Use**: Always after 3 iterations. Prevents infinite loops and provides clear status to user.

---

### Fallback 4: Worker Failure

**Trigger**: Worker reports failure or doesn't generate report

**Scenario**: Worker crashes mid-execution or exits without generating report.

**Action**:

```markdown
1. Orchestrator detects missing report:
   ```
   ⛔ Worker Report Missing

   Expected: `.tmp/current/reports/bug-fixing-report.md`
   Status: NOT FOUND

   Checking for partial work...
   ```

2. Check changes log for modifications:
   ```
   Changes log: `.tmp/current/changes/bug-changes.json`
   Status: EXISTS
   Files modified: 3
   ```

3. If modifications exist:
   a. Initiate rollback via `rollback-changes` Skill:
      ```
      ⛔ Worker Failed - Initiating Rollback

      Worker: bug-fixer
      Modified files: 3
      Rollback status: 🔄 In progress...

      Restoring backups:
      - src/utils/helper.ts ✅
      - src/components/Form.tsx ✅
      - src/services/api.ts ✅

      Rollback complete: ✅
      ```

   b. Report to user:
      ```
      ⛔ Worker failed, changes rolled back successfully

      Worker: bug-fixer
      Modified files: 3
      Rollback status: ✅ Complete

      Reason: Worker did not generate report (possible crash or error)

      Diagnostic info:
      - Worker was fixing Bug #5 (race condition)
      - Modifications made to 3 files
      - No report generated (abnormal termination suspected)

      Options:
      1. Retry with same config (may fail again)
      2. Retry with reduced scope (skip Bug #5, try others)
      3. Abort workflow (investigate manually)

      What would you like to do? (retry-same/retry-reduced/abort)
      ```

4. If no modifications:
   ```
   ⛔ Worker failed (no changes made)

   Worker: bug-hunter
   Modified files: 0
   Rollback: Not needed

   Reason: Worker did not generate report (possible early termination)

   Safe to retry - no changes were made to codebase.

   Retry? (yes/no)
   ```
```

**Example Rollback Flow**:

```
Worker: bug-fixer
Status: Failed (no report)

Changes log found:
- src/utils/helper.ts (modified)
- src/components/Form.tsx (modified)
- src/services/api.ts (modified)

Initiating rollback...

✅ Restored: src/utils/helper.ts
   From: .tmp/current/backups/src/utils/helper.ts.rollback

✅ Restored: src/components/Form.tsx
   From: .tmp/current/backups/src/components/Form.tsx.rollback

✅ Restored: src/services/api.ts
   From: .tmp/current/backups/src/services/api.ts.rollback

Rollback complete.
Codebase restored to pre-worker state.

User can retry or abort.
```

**When to Use**: Always when worker fails to generate report. Protects against partial modifications.

---

### Fallback 5: Plan File Invalid

**Trigger**: `validate-plan-file` Skill reports errors

**Scenario**: Orchestrator creates malformed plan file (bug in orchestrator logic).

**Action**:

```markdown
1. Orchestrator logs validation errors:
   ```json
   {
     "valid": false,
     "errors": [
       "Missing required field: nextAgent",
       "Invalid phase number: expected 1-5, got 6",
       "Validation criteria malformed: 'required' must be array"
     ]
   }
   ```

2. HALT workflow immediately

3. Report internal error to user:
   ```
   ⛔ Internal Error: Invalid Plan File Created

   This is a bug in the orchestrator logic.
   Please report this issue.

   Validation errors:
   - Missing required field: nextAgent
   - Invalid phase number: expected 1-5, got 6
   - Validation criteria malformed: 'required' must be array

   Plan file: `.tmp/current/plans/.bug-detection-plan.json`

   Workflow aborted to prevent worker errors.

   Diagnostic info saved to: `.tmp/archive/failed-plans/{timestamp}/`
   ```

4. Archive faulty plan for debugging:
   - Copy plan to `.tmp/archive/failed-plans/{timestamp}/`
   - Include orchestrator state snapshot
   - Log full error details

5. Exit workflow (user or developer must fix orchestrator)
```

**Example Archived Plan**:

```
.tmp/archive/failed-plans/2025-10-21-143000/
├── plan.json (faulty plan file)
├── validation-errors.json
├── orchestrator-state.json
└── invocation-history.json
```

**When to Use**: Always when plan validation fails. Prevents workers from crashing on invalid plans.

---

## Emergency Protocols

Emergency Protocols handle **critical failures** that threaten workflow integrity. These are rare but severe scenarios requiring immediate intervention.

### Emergency: Infinite Loop Detected

**Symptoms**: Same agent invoked 3+ times with identical config, all failing

**Detection**:

```markdown
Orchestrator checks before each worker invocation:

1. Read invocation history: `.tmp/current/logs/invocation-history.json`
2. Check if current worker+config invoked 3+ times already
3. Compare results: All failures?
4. If yes: 🚨 INFINITE LOOP DETECTED
```

**Example Invocation History**:

```json
{
  "invocations": [
    {
      "agent": "bug-fixer",
      "config": {"priority": "critical", "scope": ["src/"]},
      "timestamp": "2025-10-21T14:10:00Z",
      "result": "validation_failed",
      "error": "Type 'string' not assignable to 'number' in src/utils/helper.ts:42"
    },
    {
      "agent": "bug-fixer",
      "config": {"priority": "critical", "scope": ["src/"]},
      "timestamp": "2025-10-21T14:15:00Z",
      "result": "validation_failed",
      "error": "Type 'string' not assignable to 'number' in src/utils/helper.ts:42"
    },
    {
      "agent": "bug-fixer",
      "config": {"priority": "critical", "scope": ["src/"]},
      "timestamp": "2025-10-21T14:20:00Z",
      "result": "validation_failed",
      "error": "Type 'string' not assignable to 'number' in src/utils/helper.ts:42"
    }
  ]
}
```

**If config identical and all failed: INFINITE LOOP**

**Recovery**:

```markdown
1. HALT immediately (don't invoke worker again)

2. Report emergency to user:
   ```
   🚨 EMERGENCY: Infinite Loop Detected

   Agent: bug-fixer
   Config: {"priority": "critical", "scope": ["src/"]}
   Invocations: 3 (all failed validation)

   Suspected cause:
   Bug-fixer repeatedly fails type-check validation.
   Orchestrator retries without changing config or approach.
   No progress being made.

   Diagnostic info:
   - Last 3 invocations: All failed type-check
   - Same files modified each time: src/utils/helper.ts
   - Same error each time: Type 'string' not assignable to 'number'
   - No learning or adaptation occurring

   Root cause analysis:
   The bug fix approach is incorrect. Repeatedly trying the same
   fix without adapting to validation failures.

   Aborting workflow to prevent further failures.

   Recommendations:
   1. Review bug-fixer logs manually
   2. Adjust fix approach (different strategy needed)
   3. Consider using research-agent for complex bugs
   4. Update bug complexity scoring if this bug is harder than detected

   Diagnostic archive: `.tmp/archive/infinite-loop-{timestamp}/`
   ```

3. Archive diagnostic data:
   - Invocation history
   - All worker reports (if any)
   - Changes logs
   - Plan files

4. Exit workflow (user must intervene)
```

**Prevention**: Use complexity scoring to route complex bugs to research-first workflow.

---

### Emergency: File Corruption

**Symptoms**: Plan file or report file unreadable (invalid JSON, encoding issues)

**Detection**:

```markdown
Worker attempts to read plan file:

try {
  const planContent = readFile('.tmp/current/plans/.bug-detection-plan.json');
  const plan = JSON.parse(planContent);
} catch (error) {
  if (error instanceof SyntaxError) {
    // 🚨 FILE CORRUPTION DETECTED
  }
}
```

**Recovery**:

```markdown
1. Attempt to read backup (if exists):
   ```
   Backup location: `.tmp/current/backups/plan-files/.bug-detection-plan.json.backup`
   Checking backup...
   ```

2. If backup valid:
   - Restore from backup:
     ```
     ⚠️ Plan file corrupted - restored from backup

     Original file: `.tmp/current/plans/.bug-detection-plan.json`
     Status: Corrupted (SyntaxError: Unexpected token at position 145)

     Backup file: `.tmp/current/backups/plan-files/.bug-detection-plan.json.backup`
     Status: Valid ✅

     Restored from backup successfully.
     Timestamp: 2025-10-21 14:30:00 UTC

     Continuing work...
     ```
   - Log warning in report
   - Continue work with restored plan

3. If no backup or backup also corrupt:
   - Report emergency to user:
     ```
     ⛔ EMERGENCY: Plan File Corrupted and No Valid Backup

     File: `.tmp/current/plans/.bug-detection-plan.json`
     Error: Invalid JSON (SyntaxError: Unexpected token '<' at position 1)

     Backup: `.tmp/current/backups/plan-files/.bug-detection-plan.json.backup`
     Status: Also corrupted or not found

     Cannot proceed without plan file.
     Worker requires plan to execute work.

     Possible causes:
     - Concurrent write conflict
     - Disk I/O error
     - Orchestrator bug (malformed JSON generation)

     Options:
     1. Abort workflow (recommended)
     2. Provide plan manually (advanced users only)

     What would you like to do? (abort/manual)
     ```

4. If manual plan provided:
   - Validate via `validate-plan-file` Skill
   - If valid: proceed
   - If invalid: reject and abort

5. Log incident for metrics
```

**Prevention**: Create plan file backups, validate after creation.

---

### Emergency: Token Budget Exhausted

**Symptoms**: Approaching Claude Code token limit (>180k tokens used)

**Detection**:

```markdown
Orchestrator monitors token usage (available in system context):

If tokens_used > 180000:
  ⚠️ WARNING: Token budget running low

If tokens_used > 195000:
  🚨 EMERGENCY: Token budget exhaustion imminent
```

**Recovery - Warning Level (180k tokens)**:

```markdown
1. Simplify workflow immediately:
   - Orchestrator: Compress todos, skip verbose logging
   - Workers: Generate minimal reports (executive summary only)
   - Skip non-critical Context7 queries
   - Use minimal MCP mode

2. Warn user:
   ```
   ⚠️ Token Budget Running Low

   Current usage: 180k / 200k tokens (90%)
   Remaining: 20k tokens

   Simplifying workflow to conserve tokens:
   - ✅ Minimal reports (summaries only, skip detailed sections)
   - ✅ Essential Context7 queries only
   - ✅ Verbose logging disabled
   - ✅ MCP usage reduced

   Workflow will continue but with reduced detail.

   Recommendation:
   Consider completing this workflow and starting a new session
   for remaining tasks to ensure full detail and accuracy.
   ```
```

**Recovery - Emergency Level (195k tokens)**:

```markdown
1. HALT workflow immediately

2. Generate emergency summary:
   - Current progress (phases completed)
   - Results so far (bugs fixed, changes made)
   - Files modified (for reference)
   - Next steps (how to resume)

3. Ask user to start new session:
   ```
   🚨 Token budget exhausted - new session required

   Progress saved:
   - 7 bugs fixed successfully (validated)
   - 5 bugs remaining (prioritized)
   - All changes logged for resume

   Start a new Claude Code session and continue with:
   /health-bugs --resume-from=.tmp/current/plans/.bug-fixing-plan.json

   Or commit current fixes and start fresh:
   git add . && git commit -m "fix: resolve 7 bugs (emergency token stop)"
   /health-bugs
   ```
```

**Example Emergency Summary**:

```markdown
# Emergency Summary (Token Exhaustion)

**Status**: Workflow halted due to token budget exhaustion
**Tokens Used**: 195k / 200k (97.5%)
**Timestamp**: 2025-10-21 14:45:00 UTC

---

## Progress

- Phase 1 (Detection): ✅ Complete
  - Bugs detected: 12

- Phase 2 (Fixing): 🔄 In Progress (60% complete)
  - Bugs fixed: 7 / 12
  - Current iteration: 2 / 3

- Phase 3 (Verification): ⏸️ Not Started

---

## Results So Far

### Bugs Fixed (7)
All validated ✅

1. Type error in UserService
2. Missing null check
3. Incorrect state update
4. Memory leak
5. Race condition
6. Improper error handling
7. Incorrect async logic

### Bugs Remaining (5)
8. Performance issue (in progress)
9-12. (see detection report)

---

## Files Modified

```
src/services/UserService.ts
src/handlers/ApiHandler.ts
src/components/StateManager.tsx
src/components/ProfileView.tsx
src/auth/AuthFlow.ts
src/utils/ErrorHandler.ts
src/services/AsyncService.ts
```

All changes logged: `.tmp/current/changes/bug-changes.json`

---

## Next Steps

**Immediate**: Start new Claude Code session

**Resume with**:
```bash
/health-bugs --resume-from=.tmp/current/plans/.bug-fixing-plan.json
```

**Or commit current progress**:
```bash
git add . && git commit -m "fix: resolve 7 bugs (token limit reached)"
/health-bugs  # Start fresh for remaining bugs
```
```

**Prevention**: Monitor token usage, simplify reports early, batch work into smaller sessions.

---

### Emergency: Concurrent Workflow Conflict

**Symptoms**: Two orchestrators trying to modify same files simultaneously

**Detection**:

```markdown
Worker checks for active lock before modifying files:

1. Check for lock file: `.tmp/current/locks/.active-fixer.lock`
2. If exists:
   - Read lock file (agent name, timestamp, workflow)
   - Check if expired (>30 minutes old)
   - If not expired: 🚨 CONFLICT DETECTED
```

**Example Lock File**:

```json
{
  "agent": "security-fixer",
  "workflow": "health-security",
  "timestamp": "2025-10-21T14:00:00Z",
  "pid": "12345",
  "user": "developer@example.com"
}
```

**Recovery**:

```markdown
1. Report conflict to user:
   ```
   ⛔ Workflow Conflict Detected

   Another fixer is currently active:
   - Agent: security-fixer
   - Workflow: health-security
   - Started: 2025-10-21 14:00:00 UTC (5 minutes ago)
   - Lock file: `.tmp/current/locks/.active-fixer.lock`

   Cannot proceed with concurrent file modifications.
   Risk: File conflicts, race conditions, data corruption

   Options:
   1. Wait for other workflow to complete (recommended)
      - Will poll every 30 seconds
      - Auto-resume when lock released
      - Safe, no conflicts

   2. Force takeover (risky)
      - Delete lock file
      - Proceed with modifications
      - May cause conflicts with other workflow
      - Only use if other workflow is stuck/dead

   3. Abort this workflow
      - Exit cleanly
      - Try again later
      - Safest option

   What would you like to do? (wait/force/abort)
   ```

2. If user chooses "wait":
   - Poll lock file every 30 seconds
   - When lock released: resume workflow

3. If user chooses "force":
   - Log warning (potential conflict)
   - Delete lock file
   - Create new lock for current workflow
   - Proceed (user assumes risk)

4. If user chooses "abort":
   - Exit cleanly
   - No modifications made
```

**Prevention**: Use lock files, check before modifying, respect active locks.

---

## Self-Diagnostics

Self-Diagnostics enable agents to **verify their own state** before executing work. This catches errors early and prevents cascading failures.

### Agent Self-Check Protocol

**EVERY agent MUST perform on invocation:**

#### Step 1: Verify Identity

**Purpose**: Ensure correct agent was invoked

**Process**:

```markdown
1. Read plan file: `.tmp/current/plans/.{workflow}-plan.json`
2. Extract field: `nextAgent`
3. Compare:
   - Plan file nextAgent: "bug-hunter"
   - My name: "bug-hunter"

4. Match?
   - YES → ✅ Continue to Step 2
   - NO → ⛔ Report error and halt
```

**Example Error**:

```
⛔ Wrong agent invoked

Expected (from plan): bug-hunter
Actual (my name): security-scanner

This is an orchestrator bug. Plan file specifies wrong agent.

Aborting to prevent incorrect work execution.
```

**Why This Matters**: Prevents wrong agent from executing work, catching orchestrator bugs early.

---

#### Step 2: Verify Dependencies

**Purpose**: Ensure all required tools and resources are available

**For bug-hunter (detection worker)**:

```markdown
Dependencies checklist:
- [ ] Context7 MCP available? → Use `validate-context7-availability`
- [ ] Plan file readable? → Check `.tmp/current/plans/.bug-detection-plan.json`
- [ ] Write access to reports? → Check `.tmp/current/reports/`
- [ ] Read access to source? → Check source code directories

If any dependency missing:
1. Report to user with specific missing item
2. Attempt auto-fix if possible (e.g., create missing directories)
3. If auto-fix fails: abort with clear error
```

**For bug-fixer (implementation worker)**:

```markdown
Dependencies checklist:
- [ ] Plan file readable? → `.tmp/current/plans/.bug-fixing-plan.json`
- [ ] Changes log writable? → `.tmp/current/changes/`
- [ ] Backup directory exists? → `.tmp/current/backups/`
- [ ] Quality gates available? → npm run type-check, npm run build
- [ ] Write access to source? → Check source file permissions

If any dependency missing:
1. Report specific issue
2. Attempt auto-fix (create directories, check tools)
3. If auto-fix fails: abort with instructions
```

**For orchestrators**:

```markdown
Dependencies checklist:
- [ ] Temp directory structure? → `.tmp/current/` exists
- [ ] Write access to plans? → `.tmp/current/plans/`
- [ ] Skills available? → validate-plan-file, run-quality-gate, etc.
- [ ] Previous phase complete? → If not Phase 0, check predecessor

If any dependency missing:
1. Create missing directories (auto-fix)
2. Report missing Skills (user must enable)
3. If previous phase incomplete: error with phase status
```

**Example Auto-Fix**:

```
⚠️ Dependency Missing: .tmp/current/reports/

Auto-fix: Creating directory...
✅ Created: .tmp/current/reports/

Continuing with self-check...
```

**Example Fatal Error**:

```
⛔ Dependency Missing: npm run type-check not available

Checked: package.json scripts
Result: No "type-check" script found

This workflow requires type-check for quality gates.

Fix:
1. Add to package.json scripts:
   "type-check": "tsc --noEmit"
2. Retry workflow

Aborting.
```

**Why This Matters**: Prevents workers from failing mid-execution due to missing dependencies.

---

#### Step 3: Verify Prime Directives Compliance

**Purpose**: Check if about to violate any Prime Directive before proceeding

**For Orchestrators**:

```markdown
PD-1 (Return Control):
- Am I about to use Task tool to invoke worker?
- YES → ⛔ HALT, report PD-1 violation
- NO → ✅ Continue

PD-2 (Quality Gates):
- Will I skip blocking quality gates without user confirmation?
- YES → ⛔ HALT, report PD-2 violation
- NO → ✅ Continue

PD-7 (Plan File Validation):
- Will I create plan file without validating?
- YES → ⛔ HALT, report PD-7 violation
- NO → ✅ Continue
```

**For Workers**:

```markdown
PD-3 (Changes Logging):
- Am I about to modify files without creating changes log?
- YES → ⛔ HALT, report PD-3 violation
- NO → ✅ Continue

PD-4 (Context7 Validation):
- Am I about to flag findings without checking Context7 (if available)?
- YES → ⛔ HALT, report PD-4 violation
- NO → ✅ Continue

PD-6 (Report Generation):
- Will I complete work without generating report?
- YES → ⛔ HALT, report PD-6 violation
- NO → ✅ Continue
```

**Example Violation Detection**:

```
⛔ Prime Directive Violation Detected

Directive: PD-3 (Changes Logging)
Agent: bug-fixer

Self-check detected:
- About to modify files
- No changes log created yet
- Violation of PD-3

Action: Creating changes log before proceeding

✅ Changes log created: .tmp/current/changes/bug-changes.json

Continuing with work...
```

**Why This Matters**: Catches violations before they happen, enabling self-correction.

---

#### Step 4: Log Invocation

**Purpose**: Record invocation for loop detection and metrics

**Process**:

```markdown
Append to invocation history: `.tmp/current/logs/invocation-history.json`

Entry format:
```json
{
  "agent_name": "bug-hunter",
  "event_type": "invocation",
  "timestamp": "2025-10-21T14:30:00Z",
  "plan_file": ".bug-detection-plan.json",
  "config": {
    "priority": "critical",
    "scope": ["src/"],
    "maxBugs": 10
  },
  "self_check_status": "passed"
}
```

This creates invocation history for:
- Infinite loop detection
- Workflow metrics
- Audit trail
```

**Example Invocation Log**:

```json
{
  "invocations": [
    {
      "agent_name": "bug-hunter",
      "event_type": "invocation",
      "timestamp": "2025-10-21T14:30:00Z",
      "plan_file": ".bug-detection-plan.json",
      "config": {"priority": "critical", "maxBugs": 10},
      "self_check_status": "passed",
      "result": "completed",
      "duration_seconds": 45
    },
    {
      "agent_name": "bug-fixer",
      "event_type": "invocation",
      "timestamp": "2025-10-21T14:31:00Z",
      "plan_file": ".bug-fixing-plan.json",
      "config": {"bugs": [1, 2, 3]},
      "self_check_status": "passed",
      "result": "validation_failed",
      "error": "Type-check failed"
    }
  ]
}
```

**Why This Matters**: Enables infinite loop detection and provides audit trail for debugging.

---

#### Step 5: Proceed with Work

**Summary**:

```markdown
## Self-Check Summary

✅ Identity verified: Correct agent invoked (bug-hunter)
✅ Dependencies verified: All required tools/files available
✅ PD compliance verified: No violations detected
✅ Invocation logged: History updated

Proceeding with work...
```

**If any check failed**:

```
⛔ Self-Check Failed

Agent: bug-hunter
Failed check: Dependencies

Issue: Context7 MCP not available
Status: Non-fatal (fallback available)

Action: Proceeding with fallback (reduced confidence)

⚠️ Report will show Context7 unavailable warning
```

**Why This Matters**: Provides confidence that agent is ready to execute work correctly.

---

### Implementation Example

**Complete Self-Check Flow**:

```markdown
# Agent: bug-hunter Invocation

## Step 0: Self-Diagnostics (MANDATORY)

### Step 1: Verify Identity

Read plan: `.tmp/current/plans/.bug-detection-plan.json`
Extract: nextAgent = "bug-hunter"
My name: "bug-hunter"
Match: YES ✅

### Step 2: Verify Dependencies

Context7 MCP:
- Check via `validate-context7-availability`
- Result: ✅ Available

Plan file:
- Path: `.tmp/current/plans/.bug-detection-plan.json`
- Status: ✅ Readable

Reports directory:
- Path: `.tmp/current/reports/`
- Status: ✅ Writable

Source code:
- Scope: ["src/"]
- Status: ✅ Readable

All dependencies: ✅ PASSED

### Step 3: Verify PD Compliance

PD-4 (Context7 Validation):
- Context7 available: YES
- Will query for each finding: YES
- Compliance: ✅ PASSED

PD-6 (Report Generation):
- Will generate report: YES
- Compliance: ✅ PASSED

All directives: ✅ PASSED

### Step 4: Log Invocation

Logged to: `.tmp/current/logs/invocation-history.json`
Entry:
```json
{
  "agent_name": "bug-hunter",
  "timestamp": "2025-10-21T14:30:00Z",
  "plan_file": ".bug-detection-plan.json",
  "config": {"priority": "critical", "maxBugs": 10},
  "self_check_status": "passed"
}
```

### Step 5: Proceed with Work

✅ All self-checks passed
✅ Ready to execute work

Proceeding to bug detection...
```

---

## Implementation Guide

### How to Create Agents that Follow Behavioral OS

**Step 1: Start with Self-Diagnostics Template**

Every agent must begin with:

```markdown
---
name: my-worker
description: Worker that does X
---

# My Worker

## Step 0: Self-Diagnostics (MANDATORY)

Perform self-check before proceeding (see CLAUDE.md PART 5):

1. **Verify identity**: Match plan file `nextAgent` with my name
2. **Verify dependencies**: Check MCP, file access, tools
3. **Verify PD compliance**: Ensure no violations
4. **Log invocation**: Record to invocation history

If any check fails: HALT and report error to user.

---

## Step 1: Read Plan File

(Continue with agent-specific work...)
```

**Step 2: Add Prime Directive Compliance**

For each Prime Directive that applies to your agent, add checks:

```markdown
## Before Modifying Files (PD-3)

1. Check: Have I created changes log?
2. If NO:
   - Create `.tmp/current/changes/{workflow}-changes.json`
   - Initialize empty changes array

3. For each modification:
   a. Create backup
   b. Log change
   c. Make modification

## Before Completing Work (PD-6)

1. Generate report at `.tmp/current/reports/{worker-name}-report.md`
2. Validate via `validate-report-file` Skill
3. If validation fails: fix report, do NOT exit
4. If validation passes: return control
```

**Step 3: Implement Fallback Strategies**

Add fallback logic for expected failures:

```markdown
## Context7 Validation (PD-4 with Fallback)

1. Pre-flight check:
   Use `validate-context7-availability`
   Set flag: `context7_available`

2. For each finding:
   - If `context7_available = true`:
     Query Context7 → validate → flag if confirmed

   - If `context7_available = false`:
     Use fallback:
     - Flag with reduced confidence
     - Mark REQUIRES_VERIFICATION
     - Add warning note
```

**Step 4: Add Emergency Handling**

Include emergency detection where applicable:

```markdown
## Before Invoking Worker (Emergency: Infinite Loop)

1. Read invocation history
2. Check if same worker+config invoked 3+ times
3. If yes:
   🚨 Infinite loop detected
   HALT and report to user
4. If no:
   ✅ Continue
```

**Step 5: Document Contracts**

Clearly state what your agent promises:

```markdown
# My Worker Contract

## Promises to Orchestrator:
1. Read plan file first
2. Execute work per plan config
3. Log all changes
4. Generate report
5. Return control

## Promises to User:
1. Report progress
2. Ask for decisions when blocked
3. Provide clear error messages

## Expects from Orchestrator:
1. Valid plan file
2. Clear nextAgent field
3. Defined validation criteria
```

---

### Common Pitfalls

**Pitfall 1: Skipping Self-Diagnostics**

```markdown
# ❌ WRONG - No self-diagnostics

## Step 1: Read Plan File

Read plan from `.tmp/current/plans/.my-plan.json`
```

```markdown
# ✅ CORRECT - Self-diagnostics first

## Step 0: Self-Diagnostics (MANDATORY)

1. Verify identity
2. Verify dependencies
3. Verify PD compliance
4. Log invocation

## Step 1: Read Plan File

Read plan from `.tmp/current/plans/.my-plan.json`
```

**Pitfall 2: Modifying Files Without Logging**

```markdown
# ❌ WRONG - Direct modification

Edit file: src/utils/helper.ts
Fix bug: Type error on line 42
```

```markdown
# ✅ CORRECT - Log with backup

1. Create backup:
   `.tmp/current/backups/src/utils/helper.ts.rollback`

2. Log change:
   ```json
   {
     "type": "modified",
     "file": "src/utils/helper.ts",
     "backup": ".tmp/current/backups/src/utils/helper.ts.rollback",
     "description": "Fixed type error on line 42"
   }
   ```

3. Edit file: src/utils/helper.ts
   Fix bug: Type error on line 42
```

**Pitfall 3: No Fallback for Context7**

```markdown
# ❌ WRONG - Assumes Context7 available

For each bug:
  Query Context7 → validate → flag if confirmed
```

```markdown
# ✅ CORRECT - Fallback included

Pre-flight: Use `validate-context7-availability`
Set: `context7_available` flag

For each bug:
  If `context7_available = true`:
    Query Context7 → validate → flag if confirmed

  If `context7_available = false`:
    Fallback:
      - Flag with reduced confidence
      - Mark REQUIRES_VERIFICATION
      - Add warning note
```

**Pitfall 4: Exiting Without Report**

```markdown
# ❌ WRONG - Exit without report

Work complete!
Return control.
```

```markdown
# ✅ CORRECT - Report required

1. Generate report:
   Path: `.tmp/current/reports/my-worker-report.md`
   Sections: All required

2. Validate report:
   Use `validate-report-file` Skill
   If invalid: fix and retry
   If valid: continue

3. Return control
```

**Pitfall 5: Orchestrator Invokes Worker Directly**

```markdown
# ❌ WRONG - Direct invocation (violates PD-1)

Use Task tool to invoke bug-hunter:
```
Task: bug-hunter
Config: {...}
```
```

```markdown
# ✅ CORRECT - Return Control pattern

1. Create plan file:
   Path: `.tmp/current/plans/.bug-detection-plan.json`
   Content: {..., "nextAgent": "bug-hunter"}

2. Validate plan:
   Use `validate-plan-file` Skill

3. Return control:
   Report: "Plan ready. Main session will invoke bug-hunter."
   Exit orchestrator

Main session automatically invokes bug-hunter.
```

---

### Testing Contracts and Fallbacks

**Test 1: Prime Directive Enforcement**

```markdown
Objective: Verify PD-1 violation is caught and halted

Steps:
1. Modify orchestrator to attempt Task tool usage
2. Run workflow
3. Expected: Orchestrator halts with error
4. Expected: No worker invocation occurs

Result: PASS if orchestrator halts, FAIL if worker invoked
```

**Test 2: Context7 Fallback**

```markdown
Objective: Verify graceful degradation when Context7 unavailable

Steps:
1. Disable Context7 MCP (remove from .mcp.json)
2. Restart Claude Code
3. Run /health-bugs
4. Expected:
   - Worker continues (doesn't halt)
   - Report shows "⚠️ Context7 Unavailable"
   - Confidence scores reduced
   - Findings marked REQUIRES_VERIFICATION

Result: PASS if fallback works, FAIL if worker halts
```

**Test 3: Self-Diagnostics Identity Check**

```markdown
Objective: Verify wrong agent detection

Steps:
1. Create plan with nextAgent: "bug-hunter"
2. Manually invoke different agent (security-scanner)
3. Expected:
   - Agent detects identity mismatch in Step 1
   - Agent halts with error
   - No work executed

Result: PASS if detected and halted, FAIL if work executed
```

**Test 4: Quality Gate Fallback**

```markdown
Objective: Verify user decision on quality gate failure

Steps:
1. Introduce type error in code
2. Run bug-fixer workflow
3. Worker makes changes that fail type-check
4. Expected:
   - Workflow halts
   - User prompted: "Fix or skip?"
   - If fix: changes rolled back
   - If skip: workflow continues with warning

Result: PASS if user decision required, FAIL if auto-proceeds
```

**Test 5: Emergency Infinite Loop Detection**

```markdown
Objective: Verify infinite loop halts workflow

Steps:
1. Create scenario where bug-fixer repeatedly fails
2. Orchestrator retries 3 times with same config
3. Expected:
   - After 3rd attempt, infinite loop detected
   - Workflow halted
   - User notified with diagnostic info

Result: PASS if halted after 3, FAIL if continues beyond 3
```

---

## Troubleshooting

### Issue 1: Agent Ignores Prime Directive

**Symptoms**:
- Agent violates PD but doesn't halt
- No error reported
- Work proceeds with violation

**Diagnosis**:

```markdown
Check agent implementation:

1. Does agent have self-diagnostics (Step 0)?
2. Does Step 3 check PD compliance?
3. Is violation halting execution?

Example missing check:
```markdown
# Missing PD-3 check
## Modify Files

Edit src/utils/helper.ts
(No changes log creation)
```
```

**Solution**:

```markdown
Add PD compliance check:

## Before Modifying Files (PD-3)

1. Check: Have I created changes log?
2. If NO:
   ⛔ HALT - PD-3 violation
   Create changes log first
3. If YES:
   ✅ Continue to modification
```

---

### Issue 2: Fallback Not Triggered

**Symptoms**:
- Context7 unavailable
- Worker halts instead of using fallback
- No graceful degradation

**Diagnosis**:

```markdown
Check fallback implementation:

1. Is pre-flight check performed?
2. Is `context7_available` flag set?
3. Is fallback conditional on flag?

Example missing fallback:
```markdown
# No fallback - assumes Context7 always available
For each finding:
  Query Context7 → validate
  (No check for Context7 availability)
```
```

**Solution**:

```markdown
Add fallback logic:

Pre-flight:
  Use `validate-context7-availability`
  Set: `context7_available` flag

For each finding:
  If `context7_available = true`:
    Query Context7 → validate
  Else:
    Fallback:
      - Use general knowledge
      - Reduce confidence
      - Mark REQUIRES_VERIFICATION
```

---

### Issue 3: Emergency Not Detected

**Symptoms**:
- Infinite loop continues beyond 3 iterations
- No halt or warning
- Workflow stuck

**Diagnosis**:

```markdown
Check emergency detection:

1. Is invocation history being logged?
2. Is orchestrator checking history before invoking?
3. Is loop detection logic correct?

Example missing detection:
```markdown
# No loop detection
## Invoke Worker

Create plan
Signal readiness
(No check for previous invocations)
```
```

**Solution**:

```markdown
Add loop detection:

## Before Invoking Worker

1. Read invocation history:
   `.tmp/current/logs/invocation-history.json`

2. Check if current worker+config invoked 3+ times:
   - Filter by agent name and config
   - Count consecutive failures
   - If >= 3: 🚨 INFINITE LOOP DETECTED

3. If loop detected:
   HALT immediately
   Report to user with diagnostics
   Archive data
   Exit workflow

4. If no loop:
   Continue with invocation
```

---

### Issue 4: Contract Violation Unhandled

**Symptoms**:
- Worker violates contract (e.g., no report)
- Orchestrator doesn't detect
- Workflow continues with errors

**Diagnosis**:

```markdown
Check contract enforcement:

1. Does orchestrator validate worker output?
2. Is report file existence checked?
3. Is violation handled gracefully?

Example missing validation:
```markdown
# No validation
## After Worker Returns

Continue to next phase
(No report file check)
```
```

**Solution**:

```markdown
Add contract validation:

## After Worker Returns

1. Check for report file:
   ```
   ls .tmp/current/reports/{worker-name}-report.md
   ```

2. If NOT FOUND:
   ⛔ Worker violated PD-6 (no report)

   Check for changes:
   - If modifications exist: initiate rollback
   - Report to user with options

3. If FOUND:
   Validate report structure
   Continue to quality gates
```

---

### Issue 5: Self-Check Passes But Should Fail

**Symptoms**:
- Self-check reports "all passed"
- But dependencies actually missing
- Agent fails later during execution

**Diagnosis**:

```markdown
Check self-diagnostics implementation:

1. Are all dependencies actually checked?
2. Are checks thorough (not just superficial)?
3. Are failures properly detected?

Example weak check:
```markdown
# Weak check - doesn't actually verify
Context7 MCP:
- Status: Assume available ✅
(No actual validation performed)
```
```

**Solution**:

```markdown
Strengthen checks:

Context7 MCP:
- Use `validate-context7-availability` Skill
- Check result:
  ```json
  {
    "available": false,
    "reason": "MCP server not found"
  }
  ```
- If available = false:
  ⚠️ Non-fatal but impacts work
  Set flag: `context7_available = false`
  Continue with fallback

Quality gates:
- Check tools exist:
  ```bash
  npm run type-check --help
  ```
- If command not found:
  ⛔ Fatal - cannot validate
  Report error and abort
```

---

## Benefits

### 1. Predictable Behavior

**Without Behavioral OS**:
```
User: Run /health-bugs

Agent behavior:
- Sometimes follows rules
- Sometimes ignores rules
- Unpredictable error handling
- User confused about what went wrong

Result: Low trust, frustration
```

**With Behavioral OS**:
```
User: Run /health-bugs

Agent behavior:
- Always follows Prime Directives
- Clear fallbacks for failures
- Consistent error handling
- User knows exactly what happened

Result: High trust, predictability
```

**Example**:

```markdown
Traditional (Unpredictable):
"Workflow failed. Try again later."

Behavioral OS (Predictable):
"⛔ Type-check failed (PD-2)

Errors: [detailed list]

Options:
1. Fix (rollback + manual)
2. Skip (mark UNVALIDATED)

What would you like to do?"
```

---

### 2. Clear Error Recovery

**Without Behavioral OS**:
```
Worker fails midway through modifications.

Recovery:
- User doesn't know what changed
- No automatic rollback
- Manual cleanup required
- Risk of partial state

Result: Time wasted, potential corruption
```

**With Behavioral OS**:
```
Worker fails midway through modifications.

Recovery:
- Changes logged (PD-3)
- Automatic rollback offered
- Files restored from backups
- Clean state guaranteed

Result: Fast recovery, no corruption
```

**Example**:

```markdown
Worker failure detected:
Modified files: 3

Initiating rollback (PD-3)...

✅ Restored: src/utils/helper.ts
✅ Restored: src/components/Form.tsx
✅ Restored: src/services/api.ts

Rollback complete.
Codebase restored to pre-workflow state.

Options to proceed:
1. Retry
2. Abort
```

---

### 3. Reduced Coordination Bugs

**Without Behavioral OS**:
```
Orchestrator creates plan.
Worker reads plan.
Mismatch in expectations.

Result:
- Worker fails with cryptic error
- Hard to debug
- No clear contract
```

**With Behavioral OS**:
```
Orchestrator creates plan.
Plan validated (PD-7).
Worker validates before reading.
Self-check verifies identity.

Result:
- Mismatches caught early
- Clear error messages
- Contract violations explicit
```

**Example**:

```markdown
Traditional:
"Error: Cannot read property 'config'"

Behavioral OS:
"⛔ Plan File Invalid (PD-7)

Validation errors:
- Missing required field: nextAgent
- Config object malformed

This is an orchestrator bug.
Workflow halted to prevent worker errors."
```

---

### 4. Self-Enforcing Rules

**Without Behavioral OS**:
```
Rules in CLAUDE.md:
"Orchestrators should create plan files"

Enforcement:
- None
- Agents can ignore
- Violations undetected

Result: Rules frequently broken
```

**With Behavioral OS**:
```
Prime Directive PD-7:
❌ FORBIDDEN: Invalid plan files
✅ REQUIRED: Validate via validate-plan-file Skill

Enforcement:
- Orchestrator checks before proceeding
- Worker checks before reading
- Violations halt execution

Result: Rules always enforced
```

**Example**:

```markdown
Agent self-check (Step 3):

PD-7 compliance:
- Will I create plan without validating?
- YES → ⛔ HALT, report violation

Action:
Before proceeding, run validate-plan-file
If invalid: fix plan, retry validation
If valid: continue

Self-enforcement: Agent catches own violations
```

---

### 5. User Trust

**Without Behavioral OS**:
```
User experience:
- Workflows sometimes succeed
- Sometimes fail mysteriously
- Unclear what to do on failure
- Fear of running workflows

Result: Low adoption, manual work preferred
```

**With Behavioral OS**:
```
User experience:
- Workflows behave consistently
- Failures explained clearly
- Recovery options provided
- Confidence in automation

Result: High adoption, trust in agents
```

**Example User Journey**:

```markdown
User: /health-bugs

Agent: ✅ Phase 1: Detection complete (12 bugs found)
Agent: ✅ Phase 2: Fixing bugs (iteration 1/3)
Agent: ⛔ Type-check failed

       Options:
       1. Fix (rollback + manual)
       2. Skip (UNVALIDATED)

User: fix

Agent: ✅ Changes rolled back
Agent: Files restored: [list]
Agent: Ready for manual fix

User: (fixes manually)
User: /health-bugs --retry

Agent: ✅ Phase 2: Fixing bugs (iteration 2/3)
Agent: ✅ Phase 3: All quality gates passed
Agent: ✅ Workflow complete

Result: User trusts automation, knows what to expect
```

---

## Examples

### Example 1: Complete Workflow with Contracts

**Scenario**: Run `/health-bugs` workflow from detection to deployment

**Flow**:

```markdown
## User Invokes Workflow

User: /health-bugs

---

## Orchestrator: Phase 0 - Pre-Flight

Self-diagnostics:
✅ Identity: bug-orchestrator
✅ Dependencies: All available
✅ PD compliance: No violations
✅ Invocation logged

Create directory structure:
✅ .tmp/current/plans/
✅ .tmp/current/reports/
✅ .tmp/current/changes/
✅ .tmp/current/backups/

---

## Orchestrator: Phase 1 - Detection Plan

Create plan:
```json
{
  "phase": 1,
  "config": {"priority": "critical", "maxBugs": 10},
  "validation": {"required": [], "optional": []},
  "mcpGuidance": {
    "recommended": ["mcp__context7__*"],
    "library": "react",
    "reason": "Validate React patterns before flagging"
  },
  "nextAgent": "bug-hunter"
}
```

Validate plan (PD-7):
✅ All required fields present
✅ Schema valid

TodoWrite update:
Phase 1: Detection → in_progress

Return control:
"Plan ready for bug-hunter. Returning control."

---

## Worker: bug-hunter Invoked

Self-diagnostics:
✅ Identity: bug-hunter (matches plan nextAgent)
✅ Dependencies:
   - Context7 MCP: ✅ Available
   - Plan file: ✅ Readable
   - Reports dir: ✅ Writable
✅ PD compliance:
   - PD-4: Will query Context7 ✅
   - PD-6: Will generate report ✅
✅ Invocation logged

Read plan:
Config: {"priority": "critical", "maxBugs": 10}

Execute detection:
Scanning src/ for bugs...

Finding #1: Missing useEffect dependency
- Query Context7: React 18.2.0 exhaustive-deps
- Context7: ✅ Confirmed error
- Confidence: HIGH
- Flag bug

Finding #2: Type assertion 'as any'
- Query Context7: TypeScript 5.0.0 type assertions
- Context7: ✅ Confirmed anti-pattern
- Confidence: HIGH
- Flag bug

(Continue for all findings...)

Generate report (PD-6):
Path: .tmp/current/reports/bug-detection-report.md
Validate: ✅ All required sections present

Return control:
"Detection complete. 12 bugs found."

---

## Orchestrator: Phase 2 - Implementation Plan

Read detection report:
✅ Report exists
✅ 12 bugs found

Create fixing plan:
```json
{
  "phase": 2,
  "config": {"bugs": [1, 2, 3, 4, 5], "iteration": 1},
  "validation": {"required": ["type-check", "build"], "optional": ["tests"]},
  "nextAgent": "bug-fixer"
}
```

Validate plan: ✅

TodoWrite update:
Phase 1: Detection → completed
Phase 2: Implementation → in_progress

Return control

---

## Worker: bug-fixer Invoked

Self-diagnostics: ✅

Read plan:
Bugs to fix: [1, 2, 3, 4, 5]

Initialize changes log (PD-3):
Created: .tmp/current/changes/bug-changes.json

Fix Bug #1:
1. Create backup:
   .tmp/current/backups/src/hooks/useData.ts.rollback
2. Log change:
   ```json
   {
     "type": "modified",
     "file": "src/hooks/useData.ts",
     "backup": "...",
     "description": "Added userId to useEffect dependencies"
   }
   ```
3. Make modification
4. ✅ Complete

(Fix bugs #2-5 similarly...)

Self-validate (PD-2):
Run type-check: ✅ PASSED
Run build: ✅ PASSED
Run tests: ✅ PASSED (optional)

Generate report (PD-6):
Path: .tmp/current/reports/bug-fixing-report.md
Status: ✅ PASSED
Validation: All quality gates passed

Return control

---

## Orchestrator: Quality Gate Validation

Read report:
✅ Exists
✅ Status: PASSED
✅ Validation: All gates passed

TodoWrite update:
Phase 2: Implementation → completed
Phase 3: Verification → in_progress

All phases complete!

Generate final summary:
docs/reports/summaries/2025-10-21-health-summary.md

TodoWrite update:
Phase 3: Verification → completed

Report to user:
"✅ Workflow complete! 12 bugs fixed, all validated."
```

**Result**: Clean execution, all contracts honored, quality guaranteed.

---

### Example 2: Fallback Scenario

**Scenario**: Context7 unavailable during bug detection

**Flow**:

```markdown
## Worker: bug-hunter Invoked

Self-diagnostics:

Step 1: Identity ✅
Step 2: Dependencies

Context7 MCP:
- Use `validate-context7-availability`
- Result:
  ```json
  {
    "available": false,
    "reason": "MCP server not found in .mcp.json"
  }
  ```
- Status: ⚠️ UNAVAILABLE (non-fatal)
- Set flag: `context7_available = false`

Other dependencies: ✅

Step 3: PD Compliance

PD-4 check:
- Context7 available: NO
- Will use fallback: YES
- Compliance: ✅ (fallback allowed)

Step 4: Invocation logged ✅

Step 5: Proceed with fallback

---

## Execute Detection with Fallback

Finding #1: Missing useEffect dependency

Context7 check:
- Flag: `context7_available = false`
- Action: Use fallback

Fallback logic:
1. Use general knowledge (React exhaustive-deps rule)
2. Reduce confidence: HIGH → MEDIUM
3. Mark: REQUIRES_VERIFICATION
4. Add note:
   "Not validated via Context7 - general knowledge only"

Flag finding:
```markdown
### Bug #1: Missing useEffect dependency
**Confidence**: MEDIUM ⚠️ (reduced from HIGH - Context7 unavailable)
**Verification Status**: REQUIRES_VERIFICATION
**Note**: Based on general React knowledge. Verify with React 18.2 docs.
```

(Continue for all findings with fallback...)

---

## Generate Report with Warning

Report header:
```markdown
# Bug Detection Report

**Context7 Status**: ⚠️ Unavailable
**Confidence Mode**: Reduced (No Context7)

## ⚠️ Context7 Unavailability Notice

Context7 MCP server not available - findings based on general knowledge only.

Recommendation: Install Context7 for validated findings.
[Installation instructions...]
```

Executive summary:
12 bugs detected (all marked REQUIRES_VERIFICATION)
Manual verification recommended

---

## Result

Workflow completed successfully:
- Despite Context7 unavailable
- Fallback provided value
- User warned of reduced confidence
- Clear next steps (install Context7 or verify manually)

User trust maintained:
- Transparent about limitations
- Graceful degradation
- Still useful output
```

**Takeaway**: Fallbacks enable workflows to provide value even when dependencies unavailable.

---

### Example 3: Emergency Recovery

**Scenario**: Infinite loop detected during bug fixing

**Flow**:

```markdown
## Iteration 1: Bug-fixer Invoked

Fix Bug #5: Race condition
Modifications: src/auth/AuthFlow.ts
Quality gates: ❌ Type-check FAILED

Error: Type 'Promise<void>' not assignable to 'void'

Rollback: ✅ Complete
Report: Validation failed

Invocation log:
```json
{
  "agent": "bug-fixer",
  "config": {"bugs": [5]},
  "result": "validation_failed",
  "error": "Type-check failed"
}
```

---

## Iteration 2: Bug-fixer Invoked Again

(Same bug, same approach)

Fix Bug #5: Race condition
Modifications: src/auth/AuthFlow.ts
Quality gates: ❌ Type-check FAILED

Same error!

Rollback: ✅ Complete
Report: Validation failed

Invocation log updated:
(Now 2 failed attempts with same config)

---

## Iteration 3: Bug-fixer Invoked Again

(Still same bug, same approach)

Fix Bug #5: Race condition
Modifications: src/auth/AuthFlow.ts
Quality gates: ❌ Type-check FAILED

Same error!

Rollback: ✅ Complete

Invocation log updated:
(Now 3 failed attempts with identical config)

---

## Orchestrator: Emergency Detection

Before invoking worker for 4th time:

Check invocation history:
```json
{
  "invocations": [
    {
      "agent": "bug-fixer",
      "config": {"bugs": [5]},
      "result": "validation_failed",
      "error": "Type-check failed",
      "file": "src/auth/AuthFlow.ts:42",
      "timestamp": "2025-10-21T14:10:00Z"
    },
    {
      "agent": "bug-fixer",
      "config": {"bugs": [5]},
      "result": "validation_failed",
      "error": "Type-check failed",
      "file": "src/auth/AuthFlow.ts:42",
      "timestamp": "2025-10-21T14:15:00Z"
    },
    {
      "agent": "bug-fixer",
      "config": {"bugs": [5]},
      "result": "validation_failed",
      "error": "Type-check failed",
      "file": "src/auth/AuthFlow.ts:42",
      "timestamp": "2025-10-21T14:20:00Z"
    }
  ]
}
```

Analysis:
- Same agent: bug-fixer
- Same config: {"bugs": [5]}
- Same result: validation_failed
- Same error: Type-check failed at same location
- Count: 3 consecutive failures

Conclusion: 🚨 INFINITE LOOP DETECTED

---

## Emergency Protocol Activated

HALT workflow immediately

Report to user:
```
🚨 EMERGENCY: Infinite Loop Detected

Agent: bug-fixer
Bug: #5 (race condition in auth flow)
Invocations: 3 (all failed type-check)

Diagnostic info:
- Same file modified: src/auth/AuthFlow.ts:42
- Same error: Type 'Promise<void>' not assignable to 'void'
- No adaptation or learning occurring

Root cause:
Bug fix approach is incorrect. Repeatedly trying same fix
without addressing validation failure.

Bug #5 requires different approach:
- Complexity: 6/10 (higher than direct-fix threshold)
- Recommendation: Route to research-agent for deep analysis

Aborting workflow.

Other bugs (#1-4): Successfully fixed ✅
You can commit those fixes safely.

For Bug #5:
1. Use research-agent: /research "race condition in AuthFlow.ts"
2. Or fix manually with async/await analysis
3. Or skip for now (non-critical)

What would you like to do? (research/manual/skip)
```

Archive diagnostic data:
.tmp/archive/infinite-loop-2025-10-21-142000/
├── invocation-history.json
├── bug-detection-report.md
├── bug-fixing-reports/ (3 failed attempts)
└── changes-logs/ (3 rollbacks)

---

## User Decision

User chooses: research

Orchestrator:
Create research plan for Bug #5
Route to research-agent for deep analysis

Result:
- Infinite loop prevented
- Other work preserved (4 bugs fixed)
- Complex bug routed to appropriate workflow
- User informed and in control
```

**Takeaway**: Emergency protocols prevent wasted cycles and provide clear recovery paths.

---

## Summary

The Behavioral Operating System provides:

1. **Prime Directives**: Non-negotiable rules with enforcement
2. **Behavioral Contracts**: Explicit promises between agents
3. **Fallback Strategies**: Graceful degradation on failure
4. **Emergency Protocols**: Recovery from critical failures
5. **Self-Diagnostics**: Agent self-verification before work

**Key Benefits**:
- Predictable behavior in all scenarios
- Clear recovery paths for failures
- Self-enforcing rules
- Reduced coordination bugs
- High user trust

**Implementation**:
- All agents follow self-check protocol
- Prime Directives enforced via checks
- Contracts documented and validated
- Fallbacks implemented for common failures
- Emergency detection for rare but critical issues

**Next Steps**:
1. Review CLAUDE.md (canonical source)
2. Implement self-diagnostics in your agents
3. Add fallback strategies for expected failures
4. Test contracts and emergency protocols
5. Monitor and improve based on real usage

---

**Document Status**: Complete
**Last Updated**: 2025-10-21
**Maintained By**: Agent Ecosystem Team
**Related Docs**:
- CLAUDE.md (canonical behavioral OS)
- ARCHITECTURE.md (agent patterns)
- CONTEXT7-INTEGRATION-GUIDE.md (MCP validation)
- QUALITY-GATES-SPECIFICATION.md (validation criteria)
