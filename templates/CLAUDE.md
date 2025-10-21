# CLAUDE.md — Behavioral Operating System

> **STATUS**: Canonical behavioral contract for all agents
> **VERSION**: 3.0
> **LAST UPDATED**: 2025-10-21

> **IMPORTANT**: This file overrides default Claude Code behavior. Follow these rules strictly.

---

## PART 1: PRIME DIRECTIVES (NON-NEGOTIABLE)

**These rules CANNOT be violated under any circumstances.**

### PD-1: Return Control Pattern

```
❌ FORBIDDEN: Orchestrators MUST NOT invoke workers via Task tool
✅ REQUIRED: Orchestrators create plan files → return control → main session invokes workers
```

**Enforcement**: If orchestrator attempts Task tool, HALT and report error.

**Rationale**: Main session manages agent invocation for proper state management and error handling.

---

### PD-2: Quality Gates

```
❌ FORBIDDEN: Skip blocking quality gates without user confirmation
✅ REQUIRED: All blocking gates (type-check, build, tests) must PASS or user explicitly skips
```

**Enforcement**: If gate fails, STOP workflow, ask user: "Fix or skip?"

**Blocking Criteria**:
- Type-check must pass
- Build must succeed
- Tests must pass (if configured as blocking)

**If blocking gate fails**:
1. HALT workflow immediately
2. Report failure details to user
3. Provide fix/skip options
4. Only proceed after user decision

---

### PD-3: Changes Logging

```
❌ FORBIDDEN: Modify files without logging to changes file
✅ REQUIRED: ALL file modifications logged to `.tmp/current/changes/{workflow}-changes.json`
```

**Enforcement**: Workers MUST create backup before modification.

**Changes Log Format**:
```json
{
  "timestamp": "2025-10-21T14:30:00Z",
  "agent": "bug-fixer",
  "changes": [
    {
      "type": "modified",
      "file": "src/utils/helper.ts",
      "backup": ".tmp/current/backups/src/utils/helper.ts.rollback",
      "description": "Fixed type error in parseData function"
    },
    {
      "type": "created",
      "file": "src/utils/validator.ts",
      "backup": null,
      "description": "Added input validation utility"
    },
    {
      "type": "deleted",
      "file": "src/legacy/old-helper.ts",
      "backup": ".tmp/current/backups/src/legacy/old-helper.ts.rollback",
      "description": "Removed deprecated helper"
    }
  ]
}
```

**Rollback Support**: All changes must be reversible via `rollback-changes` Skill.

---

### PD-4: Context7 Validation

```
❌ FORBIDDEN: Flag bugs/security issues without Context7 validation when available
✅ REQUIRED: Query Context7 for current best practices before flagging findings
⚠️ FALLBACK: If Context7 unavailable, reduce confidence and mark "REQUIRES_VERIFICATION"
```

**Enforcement**:

1. **Workers MUST**:
   - Use `validate-context7-availability` Skill on invocation
   - Query Context7 for EACH finding (if available)
   - Include Context7 status in report header

2. **If Context7 available but NOT used**:
   - Mark finding confidence as "LOW"
   - Add note: "Not validated via Context7 - general knowledge only"

3. **If Context7 unavailable**:
   - Add warning to report header
   - Reduce all confidence scores by 1 level
   - Mark all findings as "REQUIRES_VERIFICATION"
   - Continue work (don't halt)

**Example Enforcement in Worker**:

```markdown
## Bug Detection

For EACH potential bug:

1. Check `context7_available` flag
2. If true: Query Context7 → validate → flag if confirmed
3. If false: Flag with reduced confidence + verification note
4. NEVER skip Context7 validation if available
```

---

### PD-5: Template Sync After Changes

```
⚡ CRITICAL: After updating templates/, sync to local .claude/
🎯 TRIGGER: Any changes to templates/.claude/*, templates/docs/, templates/CLAUDE.md
✅ ACTION: Run `npm run sync:agents` immediately after commit
```

**Why This Matters**:
- We develop agents in `templates/` (source of truth for generator)
- We USE agents from `.claude/` (local working copy)
- Without sync: "Сапожник без сапог" - improvements don't help development

**Automatic Sync**:
- ✅ Git post-commit hook auto-syncs when `templates/` changed
- ✅ Manual: `npm run sync:agents`
- ✅ Install: `npm install` runs postinstall hook

**Workflow**:
```
1. Update templates/.claude/agents/...
2. git commit -m "T003: ..."
3. 🎉 Git hook auto-syncs templates/ → .claude/
4. Use improved agents immediately!
```

**IMPORTANT**: Always verify sync completed:
```bash
# After task completion:
ls .claude/skills/validate-context7-availability/  # Should exist
ls .claude/skills/calculate-complexity-score/      # Should exist
```

---

### PD-6: Report Generation

```
❌ FORBIDDEN: Complete work without generating structured report
✅ REQUIRED: All workers generate report following REPORT-TEMPLATE-STANDARD.md
```

**Enforcement**: Orchestrator checks for report file existence before proceeding.

**Required Report Sections**:
1. **Header**: Report type, timestamp, status (✅ PASSED | ⚠️ PARTIAL | ❌ FAILED)
2. **Executive Summary**: Key metrics, validation status, critical findings
3. **Work Performed**: Detailed task breakdown with status
4. **Changes Made**: Files modified/created/deleted with counts
5. **Validation Results**: Type-check, build, tests results
6. **Metrics**: Duration, completion stats, validation pass rate
7. **Errors Encountered**: Any errors with resolution steps
8. **Next Steps**: What orchestrator should do next
9. **Artifacts**: Links to plan files, reports, logs

**Report Location**:
- Temporary: `.tmp/current/reports/{worker-name}-report.md`
- Permanent: `docs/reports/{domain}/{YYYY-MM}/{date}-{report-name}.md` (orchestrator archives)

---

### PD-7: Plan File Validation

```
❌ FORBIDDEN: Create invalid plan files
✅ REQUIRED: All plan files validated via `validate-plan-file` Skill before use
```

**Enforcement**:
- Orchestrator validates plan after creation
- Worker validates before reading
- If invalid: HALT workflow, report error

**Required Plan File Fields**:
```json
{
  "phase": 1,
  "config": {},
  "validation": {
    "required": ["type-check"],
    "optional": ["tests"]
  },
  "nextAgent": "worker-name"
}
```

**Validation Points**:
1. **After creation** (orchestrator): Use `validate-plan-file` Skill
2. **Before reading** (worker): Verify schema compliance
3. **If invalid**: Log error, HALT, report to user

---

## PART 2: BEHAVIORAL CONTRACTS

**Explicit promises between agents.**

### Contract: Orchestrator ↔ Worker

#### Orchestrator Promises

1. **Create valid plan file** (validated via `validate-plan-file` Skill)
2. **Specify clear `nextAgent` field** pointing to correct worker
3. **Define validation criteria** in plan (required/optional gates)
4. **NOT invoke workers directly** (Return Control pattern, PD-1)
5. **Validate worker outputs** at quality gates before proceeding
6. **Provide rollback option** on worker failure
7. **Report progress** via TodoWrite (user visibility)

#### Worker Promises

1. **Read plan file FIRST** before any work (from `.tmp/current/plans/`)
2. **Execute work according to plan config** (respect priority, scope, limits)
3. **Log all changes** for rollback capability (PD-3)
4. **Generate structured report** following template (PD-6)
5. **Return control** (no agent invocation, no Task tool)
6. **Self-validate work** before reporting success (run quality gates)
7. **Handle errors gracefully** (rollback on failure, report issues)

#### If Contract Violated

**Worker violation**:
- Report error to orchestrator via error status in report
- Refuse to proceed without valid plan
- Example: "⛔ Plan file missing `nextAgent` field - cannot proceed"

**Orchestrator violation**:
- Re-create plan if invalid
- Apologize to user, explain what went wrong
- Example: "⛔ Created invalid plan file - regenerating with correct schema"

---

### Contract: Worker ↔ MCP Servers

#### Worker Promises

1. **Check MCP availability** before relying on it
   - Use `validate-context7-availability` Skill for Context7
   - Check MCP server status before critical operations

2. **Use fallback strategy** if MCP unavailable
   - Context7 unavailable → general knowledge + reduced confidence
   - Supabase unavailable → skip RLS checks, warn user

3. **Document MCP usage** in report
   - Which MCP servers used
   - What queries performed
   - Impact on findings

4. **Handle MCP timeouts gracefully**
   - Retry once (10 second timeout)
   - If still fails: fallback to general knowledge
   - Log timeout in report

#### MCP Promises (Expected)

1. **Provide accurate, current documentation**
   - Context7 returns latest library docs
   - Supabase returns current schema

2. **Respond within reasonable timeframe**
   - Target: <10 seconds per query
   - If longer: worker should timeout and fallback

#### If Contract Violated

**MCP timeout**:
- Retry once
- If still fails: fallback to general knowledge
- Mark findings as "REQUIRES_VERIFICATION"

**MCP unavailable**:
- Log warning in report header
- Continue with reduced confidence
- Notify user of reduced accuracy

**Worker didn't check MCP availability**:
- Findings marked as "LOW CONFIDENCE"
- Note added: "Not validated via Context7 - general knowledge only"

---

### Contract: Orchestrator ↔ User

#### Orchestrator Promises

1. **Report progress** via TodoWrite
   - Mark phases `in_progress` → `completed`
   - User always knows current status

2. **Ask for user decision when blocked**
   - Quality gate fails: "Fix or skip?"
   - Worker fails: "Retry, rollback, or abort?"
   - Max iterations: "Continue or stop?"

3. **Provide rollback option on failure**
   - Use `rollback-changes` Skill
   - Restore files to pre-workflow state
   - Clean up temporary artifacts

4. **Limit iterations** (prevent infinite loops)
   - Max 3 cycles per workflow
   - Use `check-infinite-loop` Skill
   - HALT if loop detected

5. **Generate comprehensive final report**
   - Summary of all phases
   - Metrics (success rate, changes made)
   - Next steps

#### User Promises (Expected)

1. **Provide necessary inputs** when asked
   - Configuration preferences
   - Fix/skip decisions
   - Continue/abort choices

2. **Make decisions when workflow blocked**
   - Respond to quality gate failures
   - Choose retry/rollback options

#### If Contract Violated

**User unresponsive**:
- Wait for input (don't proceed)
- Mark workflow as "PAUSED"
- Re-prompt after 2 minutes
- If still no response: archive partial results, exit gracefully

**Orchestrator fails to report**:
- User should check `.tmp/current/reports/` for last worker report
- Check git status for uncommitted changes
- Run `rollback-changes` manually if needed

---

## PART 3: FALLBACK STRATEGIES

**What to do when things fail.**

### Fallback 1: Context7 Unavailable

**Trigger**: Context7 MCP tools not found or timing out

**Action**:

1. **Log warning in report header**:
   ```markdown
   ⚠️ **Context7 Unavailable**
   Context7 MCP server not available - findings based on general knowledge only.
   Confidence scores reduced. All findings marked as "REQUIRES_VERIFICATION".
   ```

2. **Lower confidence scores**:
   - High → Medium
   - Medium → Low
   - Low → Very Low

3. **Mark findings as "REQUIRES_VERIFICATION"**:
   ```markdown
   ### Bug #1: Potential race condition
   **Confidence**: MEDIUM (reduced from HIGH due to Context7 unavailable)
   **Status**: ⚠️ REQUIRES_VERIFICATION
   ```

4. **Continue work with general knowledge**:
   - Use built-in knowledge of best practices
   - Reference static docs (if available)
   - Apply common patterns

5. **Notify user** of reduced accuracy:
   ```
   ⚠️ Context7 MCP server unavailable

   Proceeding with general knowledge only.
   Findings may not reflect latest library best practices.

   Recommendation: Verify findings manually or enable Context7 MCP.
   ```

**Do NOT**: Halt workflow (Context7 is enhancement, not requirement)

---

### Fallback 2: Quality Gate Failure

**Trigger**: Blocking gate fails (type-check, build, tests)

**Action**:

1. **HALT workflow immediately**

2. **Report failure to user** with details:
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

3. **If user chooses "fix"**:
   - Run `rollback-changes` Skill
   - Restore file backups from `.tmp/current/backups/`
   - Delete created files
   - Clean up temporary artifacts
   - Return control to user for manual fix
   - Provide diagnostic info:
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

4. **If user chooses "skip"**:
   - Add warning to final report:
     ```markdown
     ⚠️ **CRITICAL WARNING**: Type-check quality gate was SKIPPED

     This workflow completed without type validation.
     Manual verification is REQUIRED before deployment.

     Unvalidated changes:
     - src/utils/helper.ts
     - src/components/Form.tsx
     - src/services/api.ts
     ```
   - Continue workflow (mark as "UNVALIDATED")
   - All subsequent reports show "UNVALIDATED" badge

---

### Fallback 3: Max Iterations Reached

**Trigger**: Orchestrator completes 3 iterations, issues remain

**Action**:

1. **STOP iterative cycle** (prevent infinite loop)

2. **Generate comprehensive report**:
   ```markdown
   # Max Iterations Reached (3/3)

   ## Issues Resolved ✅

   **Total**: 8 bugs fixed successfully

   - Bug #1: Type error in UserService (priority: critical, complexity: 3)
   - Bug #2: Missing null check in API handler (priority: high, complexity: 2)
   - Bug #3: Incorrect state update (priority: high, complexity: 4)
   - Bug #4: Memory leak in component (priority: medium, complexity: 5)
   - Bug #5: Race condition in auth flow (priority: critical, complexity: 6)
   - Bug #6: Improper error handling (priority: medium, complexity: 3)
   - Bug #7: Missing validation (priority: high, complexity: 2)
   - Bug #8: Incorrect async logic (priority: medium, complexity: 4)

   **Validation**: All fixes passed type-check, build, and tests

   ---

   ## Issues Remaining ⏳

   **Total**: 4 bugs (ranked by complexity/priority)

   1. **Bug #9**: Complex WebRTC state management issue
      - Complexity: 9/10 (research required)
      - Priority: high
      - Reason not fixed: Requires deep protocol understanding
      - Recommendation: Use `/health-bugs` with research-first routing

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
      - Recommendation: Quick manual cleanup or next run

   ---

   ## Recommendations

   1. **High-complexity issues (Bug #9, #10)**:
      - Address separately with dedicated research
      - Consider using research-agent for Bug #9
      - Use profiling tools for Bug #10

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

   **Option 2**: Stop here and review
   - Deploy current fixes (8 bugs resolved)
   - Address high-complexity issues separately
   - Batch remaining low-priority issues later

   **Option 3**: Manual intervention
   - Take over Bug #9, #10 manually
   - Use research tools and profiling
   - Return to automation for Bug #11, #12

   What would you like to do? (continue/stop/manual)
   ```

3. **Ask user for decision**:
   - Continue for 1 more iteration? (risky)
   - Stop here and review resolved issues? (recommended)
   - Manual intervention for complex issues? (hybrid approach)

4. **If continue**:
   - Reset iteration counter to 1
   - Update plan with reduced scope (high-complexity only)
   - Resume at Phase 2 (Implementation)

5. **If stop**:
   - Archive results to `.tmp/archive/{timestamp}/`
   - Generate final summary report
   - List files to `docs/reports/summaries/{date}-health-summary.md`
   - Exit gracefully

---

### Fallback 4: Worker Failure

**Trigger**: Worker reports failure or doesn't generate report

**Action**:

1. **Orchestrator detects missing report**:
   ```
   ⛔ Worker Report Missing

   Expected: `.tmp/current/reports/bug-detection-report.md`
   Status: NOT FOUND

   Checking for partial work...
   ```

2. **Check changes log** for modifications:
   ```
   Changes log: `.tmp/current/changes/bug-changes.json`
   Status: EXISTS
   Files modified: 3
   ```

3. **If modifications exist**:
   - Initiate rollback via `rollback-changes` Skill:
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

   - Report to user:
     ```
     ⛔ Worker failed, changes rolled back successfully

     Worker: bug-fixer
     Modified files: 3
     Rollback status: ✅ Complete

     Reason: Worker did not generate report (possible crash or error)

     Diagnostic info:
     - Worker was fixing Bug #5 (race condition)
     - Modifications were made to 3 files
     - No report generated (abnormal termination suspected)

     Options:
     1. Retry with same config (may fail again)
     2. Retry with reduced scope (skip Bug #5, try others)
     3. Abort workflow (investigate manually)

     What would you like to do? (retry-same/retry-reduced/abort)
     ```

4. **If no modifications**:
   - Report failure without rollback:
     ```
     ⛔ Worker failed (no changes made)

     Worker: bug-hunter
     Modified files: 0
     Rollback: Not needed

     Reason: Worker did not generate report (possible early termination)

     Safe to retry - no changes were made to codebase.

     Retry? (yes/no)
     ```

---

### Fallback 5: Plan File Invalid

**Trigger**: `validate-plan-file` Skill reports errors

**Action**:

1. **Orchestrator logs validation errors**:
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

2. **HALT workflow immediately**

3. **Report internal error to user**:
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

4. **Archive faulty plan** for debugging:
   - Copy plan file to `.tmp/archive/failed-plans/{timestamp}/`
   - Include orchestrator state snapshot
   - Log full error details

5. **Exit workflow** (user or developer must fix orchestrator logic)

---

## PART 4: EMERGENCY PROTOCOLS

**Recovery from critical failures.**

### Emergency: Infinite Loop Detected

**Symptoms**: Same agent invoked 3+ times with identical config

**Detection**:

Orchestrator checks before each worker invocation:

```markdown
## Before Invoking Worker

1. Read invocation history: `.tmp/current/logs/invocation-history.json`
2. Check if current worker+config invoked 3+ times already
3. If yes: 🚨 INFINITE LOOP DETECTED

Example invocation history:
```json
{
  "invocations": [
    {
      "agent": "bug-fixer",
      "config": {"priority": "critical", "scope": ["src/"]},
      "timestamp": "2025-10-21T14:10:00Z",
      "result": "validation_failed"
    },
    {
      "agent": "bug-fixer",
      "config": {"priority": "critical", "scope": ["src/"]},
      "timestamp": "2025-10-21T14:15:00Z",
      "result": "validation_failed"
    },
    {
      "agent": "bug-fixer",
      "config": {"priority": "critical", "scope": ["src/"]},
      "timestamp": "2025-10-21T14:20:00Z",
      "result": "validation_failed"
    }
  ]
}
```

If config identical and all failed: INFINITE LOOP
```

**Action**:

1. **HALT immediately** (don't invoke worker again)

2. **Report emergency to user**:
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

3. **Archive diagnostic data**:
   - Invocation history
   - All worker reports (if any)
   - Changes logs
   - Plan files

4. **Exit workflow** (user must intervene)

---

### Emergency: File Corruption

**Symptoms**: Plan file or report file unreadable (invalid JSON, encoding issues)

**Detection**:

Worker attempts to read plan file:

```markdown
## Worker: Read Plan File

try {
  const planContent = readFile('.tmp/current/plans/.bug-detection-plan.json');
  const plan = JSON.parse(planContent);
} catch (error) {
  if (error instanceof SyntaxError) {
    // 🚨 FILE CORRUPTION DETECTED
  }
}
```

**Action**:

1. **Attempt to read backup** (if exists):
   ```
   Backup location: `.tmp/current/backups/plan-files/.bug-detection-plan.json.backup`
   Checking backup...
   ```

2. **If backup valid**:
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

3. **If no backup or backup also corrupt**:
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

4. **If manual plan provided**:
   - Validate provided plan via `validate-plan-file` Skill
   - If valid: proceed with work
   - If invalid: reject and abort

5. **Log incident** for metrics:
   - File corruption events tracked
   - Helps identify systemic issues

---

### Emergency: Token Budget Exhausted

**Symptoms**: Approaching Claude Code token limit (>180k tokens used)

**Detection**:

Orchestrator monitors token usage (available in system context):

```markdown
## Orchestrator: Monitor Token Usage

Check current token usage from system context.

If tokens_used > 180000:
  ⚠️ WARNING: Token budget running low

If tokens_used > 195000:
  🚨 EMERGENCY: Token budget exhaustion imminent
```

**Action**:

1. **At 180k tokens (Warning Level)**:
   - Simplify workflow immediately:
     - Orchestrator: Compress todos, skip verbose logging
     - Workers: Generate minimal reports (executive summary only)
     - Skip non-critical Context7 queries
     - Use minimal MCP mode (disable heavy servers)

   - Warn user:
     ```
     ⚠️ Token Budget Running Low

     Current usage: 180k / 200k tokens (90%)
     Remaining: 20k tokens

     Simplifying workflow to conserve tokens:
     - ✅ Minimal reports (summaries only, skip detailed sections)
     - ✅ Essential Context7 queries only (skip nice-to-have validations)
     - ✅ Verbose logging disabled
     - ✅ MCP usage reduced (only critical servers)

     Workflow will continue but with reduced detail.

     Recommendation:
     Consider completing this workflow and starting a new session
     for remaining tasks to ensure full detail and accuracy.
     ```

2. **At 195k tokens (Emergency Level)**:
   - **HALT workflow immediately**

   - Generate emergency summary:
     ```markdown
     # Emergency Summary (Token Exhaustion)

     **Status**: Workflow halted due to token budget exhaustion
     **Tokens Used**: 195k / 200k (97.5%)
     **Timestamp**: 2025-10-21 14:45:00 UTC

     ---

     ## Progress

     - Phase 1 (Detection): ✅ Complete
       - Bugs detected: 12
       - Report: `.tmp/current/reports/bug-detection-report.md`

     - Phase 2 (Fixing): 🔄 In Progress (60% complete)
       - Bugs fixed: 7 / 12
       - Current iteration: 2 / 3
       - Last successful fix: Bug #7 (incorrect async logic)
       - Currently working on: Bug #8 (performance issue)

     - Phase 3 (Verification): ⏸️ Not Started

     ---

     ## Results So Far

     ### Bugs Fixed (7)
     1. Bug #1: Type error in UserService ✅
     2. Bug #2: Missing null check ✅
     3. Bug #3: Incorrect state update ✅
     4. Bug #4: Memory leak ✅
     5. Bug #5: Race condition ✅
     6. Bug #6: Improper error handling ✅
     7. Bug #7: Incorrect async logic ✅

     **Validation**: All passed type-check, build, tests

     ### Bugs Remaining (5)
     8. Bug #8: Performance issue (in progress)
     9. Bug #9: WebRTC state management
     10. Bug #10: List performance degradation
     11. Bug #11: TypeScript strict warning
     12. Bug #12: Console.log cleanup

     ---

     ## Files Modified

     Total: 7 files

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
     Backups available: `.tmp/current/backups/`

     ---

     ## Next Steps

     **Immediate**: Start a new Claude Code session

     **Continue workflow with**:
     1. Resume from Phase 2, iteration 2
     2. Focus on remaining 5 bugs
     3. Reference this summary for context
     4. Use existing detection report: `.tmp/current/reports/bug-detection-report.md`

     **Command to resume**:
     ```bash
     # In new session
     /health-bugs --resume-from=.tmp/current/plans/.bug-fixing-plan.json
     ```

     **Verification**:
     Current fixes are safe to commit (all validated).
     Consider committing progress before resuming.

     ---

     ## Artifacts

     - Detection report: `.tmp/current/reports/bug-detection-report.md`
     - Fixing plan: `.tmp/current/plans/.bug-fixing-plan.json`
     - Changes log: `.tmp/current/changes/bug-changes.json`
     - This summary: `docs/reports/summaries/2025-10-21-emergency-token-exhaustion.md`
     ```

   - Ask user to start new session:
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

---

### Emergency: Concurrent Workflow Conflict

**Symptoms**: Two orchestrators trying to modify same files simultaneously

**Detection**:

Worker checks for active lock before modifying files:

```markdown
## Worker: Check for Active Lock

Before modifying files:

1. Check for lock file: `.tmp/current/locks/.active-fixer.lock`
2. If exists:
   - Read lock file (agent name, timestamp, workflow)
   - Check if expired (>30 minutes old)
   - If not expired: 🚨 CONFLICT DETECTED

Example lock file:
```json
{
  "agent": "security-fixer",
  "workflow": "health-security",
  "timestamp": "2025-10-21T14:00:00Z",
  "pid": "12345"
}
```
```

**Action**:

1. **Report conflict to user**:
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

2. **If user chooses "wait"**:
   - Poll lock file every 30 seconds:
     ```
     ⏳ Waiting for other workflow to complete...

     Checking lock file: `.tmp/current/locks/.active-fixer.lock`
     Status: Still locked (security-fixer active)
     Elapsed: 1 minute

     Will retry in 30 seconds...
     (Press Ctrl+C to abort)
     ```
   - When lock released:
     ```
     ✅ Lock released - resuming workflow

     Other workflow completed: security-fixer
     Lock file removed: `.tmp/current/locks/.active-fixer.lock`

     Proceeding with bug-fixer workflow...
     ```

3. **If user chooses "force takeover"**:
   - Log warning (potential conflict):
     ```
     ⚠️ Force takeover initiated

     Removing lock: `.tmp/current/locks/.active-fixer.lock`
     Previous workflow: security-fixer (may cause conflicts)

     Proceeding with modifications...
     Risk: High (concurrent modification possible)
     ```
   - Delete lock file
   - Create new lock for current workflow
   - Proceed with modifications (user assumes risk)

4. **If user chooses "abort"**:
   - Exit workflow cleanly:
     ```
     ✅ Workflow aborted (no changes made)

     Lock still held by: security-fixer
     No modifications performed

     Try again later when other workflow completes.
     ```

---

## PART 5: SELF-DIAGNOSTICS PROTOCOL

**Agents verify their own state on invocation.**

### Agent Self-Check Protocol

**EVERY agent MUST perform on invocation:**

#### Step 1: Verify Identity

Check that the correct agent was invoked:

```markdown
## Identity Verification

Read plan file: `.tmp/current/plans/.{workflow}-plan.json`
Extract field: `nextAgent`

Compare:
- Plan file nextAgent: "bug-hunter"
- My name: "bug-hunter"

Match? YES → ✅ Continue to Step 2
Match? NO → ⛔ Report error:

"⛔ Wrong agent invoked
Expected: bug-hunter
Got: {my-name}

This is an orchestrator bug. Plan file specifies wrong agent.
Aborting to prevent incorrect work execution."
```

---

#### Step 2: Verify Dependencies

Check required dependencies based on agent type:

**For bug-hunter (detection worker)**:
```markdown
Dependencies checklist:
- [ ] Context7 MCP available? (use `validate-context7-availability` Skill)
- [ ] Plan file readable at `.tmp/current/plans/.bug-detection-plan.json`?
- [ ] Write access to `.tmp/current/reports/`?
- [ ] Read access to source code directories?

If any dependency missing:
- Report to user with specific missing item
- Attempt auto-fix if possible (e.g., create missing directories)
- If auto-fix fails: abort with clear error
```

**For bug-fixer (implementation worker)**:
```markdown
Dependencies checklist:
- [ ] Plan file readable at `.tmp/current/plans/.bug-fixing-plan.json`?
- [ ] Changes log writable at `.tmp/current/changes/`?
- [ ] Backup directory exists at `.tmp/current/backups/`?
- [ ] Quality gate tools available? (npm run type-check, npm run build)
- [ ] Write access to source files?

If any dependency missing:
- Report specific issue
- Attempt auto-fix (create directories, check tool installation)
- If auto-fix fails: abort with instructions for user
```

**For orchestrators**:
```markdown
Dependencies checklist:
- [ ] `.tmp/current/` directory structure exists?
- [ ] Write access to `.tmp/current/plans/`?
- [ ] Skills available? (validate-plan-file, run-quality-gate, etc.)
- [ ] Previous phase completed? (if not Phase 0)

If any dependency missing:
- Create missing directories (auto-fix)
- Report missing Skills (user must enable)
- If previous phase incomplete: error with phase status
```

---

#### Step 3: Verify Prime Directives Compliance

Check if about to violate any PD before proceeding:

**Example (Orchestrator)**:
```markdown
## PD Compliance Check

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

**Example (Worker)**:
```markdown
## PD Compliance Check

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

---

#### Step 4: Log Invocation

Record invocation for loop detection and metrics:

```markdown
## Log Invocation

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
- Infinite loop detection (`check-infinite-loop` Skill)
- Workflow metrics and debugging
- Audit trail
```

---

#### Step 5: Proceed with Work

All checks passed → execute work according to plan:

```markdown
## Self-Check Summary

✅ Identity verified: Correct agent invoked
✅ Dependencies verified: All required tools/files available
✅ PD compliance verified: No violations detected
✅ Invocation logged: History updated

Proceeding with work...
```

If any check failed → agent HALTS and reports specific error to user.

---

## PART 6: OPERATIONAL PROCEDURES

### Project Conventions

**File Organization**:
- Agents → `.claude/agents/{domain}/{orchestrators|workers}/`
- Commands → `.claude/commands/`
- Skills → `.claude/skills/{skill-name}/SKILL.md`
- Temporary Files → `.tmp/` (git ignored)

**Temporary Files Structure** (`.tmp/`):
```
tmp/
├── current/              # Current orchestration run
│   ├── plans/           # Plan files for workers
│   ├── changes/         # Changes logs for rollback
│   ├── backups/         # File backups (.rollback/)
│   ├── reports/         # Worker reports (temporary)
│   ├── logs/            # Invocation history, metrics
│   └── locks/           # Lock files for conflict prevention
└── archive/             # Archived runs (auto-cleanup > 7 days)
    └── YYYY-MM-DD-HHMMSS/
        ├── plans/
        ├── changes/
        └── reports/
```

**Permanent Files** (git committed):
- Bug reports → `docs/reports/bugs/{YYYY-MM}/{date}-bug-hunting-report.md`
- Security audits → `docs/reports/security/{YYYY-MM}/{date}-security-audit.md`
- Dead code reports → `docs/reports/cleanup/{YYYY-MM}/{date}-dead-code-report.md`
- Dependency reports → `docs/reports/deps/{YYYY-MM}/{date}-dependency-audit.md`
- Final summaries → `docs/reports/summaries/{date}-health-summary.md`

**Cleanup Protocol**:
- Archive created after each successful run
- Auto-cleanup removes archives > 7 days old
- Workers cleanup temporary files after completion
- Orchestrator manages archive lifecycle

**Code Standards**:
- Type-check must pass before commit
- Build must pass before commit
- No hardcoded credentials

**Documentation**:
- All reports must follow REPORT-TEMPLATE-STANDARD.md
- Include timestamps, validation status, next steps

---

### Agent Selection

**Use Orchestrator** when:
- Coordinating multiple workers
- Multi-phase workflows
- Need quality gates
- Iterative cycles required

**Use Worker** when:
- Single domain task (bug-fixing, security scan)
- Implement from plan file
- Generate report
- Execute specific work phase

**Use Skill** when:
- Reusable utility function
- No state/context needed
- <100 lines logic
- Pure function (input → output)

---

### Orchestrator Pattern

**Flow**:
1. **Pre-Flight**: Setup directories, validate environment
2. **Create Plan**: Write to `.tmp/current/plans/.{workflow}-plan.json`
3. **Validate Plan**: Use `validate-plan-file` Skill
4. **Signal Readiness**: Report to user, return control
5. **Main Session Invokes Worker**: Automatic
6. **Worker Returns**: Worker completes and exits
7. **Quality Gate**: Orchestrator validates output from `.tmp/current/reports/`
8. **Repeat or Finish**: Next phase or final summary

**Must Do**:
- Create plan files before signaling readiness (PD-7)
- Track progress via TodoWrite (mark in_progress → completed)
- Validate worker outputs at quality gates (PD-2)
- Report status to user (Contract: Orchestrator ↔ User)
- Handle errors with rollback instructions (PD-3)

**Prohibitions**:
- ❌ NO Task tool to invoke subagents (PD-1)
- ❌ NO implementation work (orchestrators coordinate only)
- ❌ NO skip quality gate validations (PD-2)

---

### Worker Pattern

**Flow**:
1. **Self-Diagnostics**: Verify identity, dependencies, PD compliance (PART 5)
2. **Read Plan**: From `.tmp/current/plans/.{workflow}-plan.json`
3. **Execute Work**: Domain-specific tasks (bug fixing, security scanning, etc.)
4. **Log Changes**: Write to `.tmp/current/changes/{workflow}-changes.json` (PD-3)
5. **Validate Work**: Run quality gates internally (type-check, build, tests)
6. **Generate Report**: Follow REPORT-TEMPLATE-STANDARD.md (PD-6)
7. **Return Control**: Exit to main session (no agent invocation)

**Must Do**:
- Read plan file first (Contract: Orchestrator ↔ Worker)
- Execute domain-specific work according to plan config
- Validate work internally (self-validation before reporting success)
- Generate structured report (PD-6)
- Return to main session (no Task tool, no agent invocation)

**Prohibitions**:
- ❌ NO invoke other agents (workers execute, don't coordinate)
- ❌ NO skip report generation (PD-6)
- ❌ NO report success without validation (PD-2)

---

### Plan File Format

**Location**: `.tmp/current/plans/.{workflow}-plan.json`

**Required Schema**:
```json
{
  "phase": 1,
  "config": {
    "priority": "critical",
    "scope": ["src/", "lib/"],
    "maxItems": 10
  },
  "validation": {
    "required": ["type-check", "build"],
    "optional": ["tests"]
  },
  "mcpGuidance": {
    "recommended": ["mcp__context7__*"],
    "library": "react",
    "reason": "Check current React patterns before implementing fixes"
  },
  "nextAgent": "worker-name"
}
```

**Required Fields**:
- `phase` (number): Current phase number
- `config` (object): Worker configuration
- `validation` (object): Quality gate criteria
  - `required` (array): Blocking gates
  - `optional` (array): Non-blocking gates
- `nextAgent` (string): Worker to invoke

**Optional Fields**:
- `mcpGuidance` (object): MCP server recommendations
  - `recommended` (array): MCP server patterns
  - `library` (string): Library name for Context7
  - `reason` (string): Why to use these MCPs

**Validation**: Use `validate-plan-file` Skill after creation (PD-7)

---

### Report File Format

**Location**:
- Temporary: `.tmp/current/reports/{worker-name}-report.md`
- Permanent: `docs/reports/{domain}/{YYYY-MM}/{date}-{report-name}.md`

**Required Sections** (see REPORT-TEMPLATE-STANDARD.md):
1. **Header**: Report type, timestamp, status (✅ PASSED | ⚠️ PARTIAL | ❌ FAILED)
2. **Executive Summary**: Key metrics, validation status, critical findings
3. **Work Performed**: Detailed task breakdown with status
4. **Changes Made**: Files modified/created/deleted with counts
5. **Validation Results**: Type-check, build, tests results
6. **Metrics**: Duration, completion stats, validation pass rate
7. **Errors Encountered**: Any errors with resolution steps
8. **Next Steps**: What orchestrator should do next
9. **Artifacts**: Links to plan files, reports, logs

**Status Indicators**:
- ✅ PASSED: All validation passed, work complete
- ⚠️ PARTIAL: Some work complete, some failed
- ❌ FAILED: Validation failed, work incomplete

---

### Quality Gates

**Blocking Criteria** (must pass):
- Report file exists and well-formed (PD-6)
- Validation status is PASSED (PD-2)
- Core metrics meet thresholds (defined in plan)
- No critical errors

**If Blocking Fails**:
1. STOP workflow (PD-2)
2. Report failures to user with details
3. Provide corrective actions (rollback, manual fix, skip)
4. Ask user: "Fix issues or skip validation? (fix/skip)"

**Non-Blocking Criteria** (warnings only):
- Performance benchmarks
- Best practices violations
- Documentation completeness
- Code style issues

**Validation Execution**: Use `run-quality-gate` Skill

---

### TodoWrite Format

**Structure**:
```json
{
  "content": "Phase 1: Discovery and analysis",
  "status": "in_progress",
  "activeForm": "Discovering and analyzing codebase"
}
```

**Status Values**:
- `pending`: Task not yet started
- `in_progress`: Currently working on (ONLY ONE at a time)
- `completed`: Task finished successfully
- `failed`: Task blocked or failed

**Usage**:
- Mark phase `in_progress` BEFORE starting
- Mark phase `completed` IMMEDIATELY after finishing
- Mark phase `failed` if blocked
- EXACTLY ONE task `in_progress` at any time

---

### File Locations

**Documentation**:
- Architecture: `docs/Agents Ecosystem/ARCHITECTURE.md`
- Quality Gates: `docs/Agents Ecosystem/QUALITY-GATES-SPECIFICATION.md`
- Report Template: `docs/Agents Ecosystem/REPORT-TEMPLATE-STANDARD.md`
- Behavioral OS Guide: `docs/Agents Ecosystem/BEHAVIORAL-OS-GUIDE.md`

**Temporary Files**:
- Plan files: `.tmp/current/plans/.{workflow}-plan.json`
- Reports: `.tmp/current/reports/{report-name}.md`
- Changes logs: `.tmp/current/changes/{workflow}-changes.json`
- Backups: `.tmp/current/backups/`
- Invocation logs: `.tmp/current/logs/invocation-history.json`
- Lock files: `.tmp/current/locks/.{workflow}.lock`

**Permanent Reports**:
- Bugs: `docs/reports/bugs/{YYYY-MM}/{date}-bug-hunting-report.md`
- Security: `docs/reports/security/{YYYY-MM}/{date}-security-audit.md`
- Dead code: `docs/reports/cleanup/{YYYY-MM}/{date}-dead-code-report.md`
- Dependencies: `docs/reports/deps/{YYYY-MM}/{date}-dependency-audit.md`
- Summaries: `docs/reports/summaries/{date}-health-summary.md`

**Agents**:
- Workers: `.claude/agents/{domain}/workers/{name}.md`
- Orchestrators: `.claude/agents/{domain}/orchestrators/{name}.md`

**IMPORTANT**:
- Workers MUST read plans from `.tmp/current/plans/` (NOT root)
- Workers MUST write reports to `.tmp/current/reports/` first
- Only orchestrators archive reports to `docs/reports/` after validation

---

### Automatic Invocation

**Agent Description Format**:

Agent `description` (in YAML frontmatter) must include:
- "Use proactively" or "MUST BE USED"
- When agent should be invoked
- Specific capabilities

**Example**:
```yaml
---
name: bug-hunter
description: Use proactively for detecting bugs via static analysis. Expert in type errors, logic bugs, and anti-patterns. Validates findings via Context7 MCP.
---
```

**Keywords for Auto-Invocation**:
- "Use proactively" → Main session invokes automatically when relevant
- "MUST BE USED" → Required for specific workflows
- "Expert in" → Domain specialization
- "Handles" → Specific scenarios

---

### MCP Server Configuration

**Two-tier strategy for token efficiency:**

#### Default: `.mcp.json` (Minimal)

**Servers**:
- `context7` - Library docs (MANDATORY for workers)
- `server-sequential-thinking` - Sequential reasoning

**Use for**: Daily development, most agent workflows

**Token savings**: ~600-3000 tokens per conversation

#### Extended: `.mcp.full.json` (Full)

**Includes minimal servers plus**:
- `playwright` - Browser automation
- `supabase` / `supabase-legacy` - Supabase management
- `n8n-workflows` - n8n docs
- `n8n-mcp` - n8n instance control
- `shadcn` - shadcn/ui components

**Use for**: Supabase RLS tasks, browser testing, n8n automation, shadcn implementation

#### Switch Configs

```bash
# Enable full
mv .mcp.json .mcp.minimal.json && mv .mcp.full.json .mcp.json

# Revert to minimal
mv .mcp.json .mcp.full.json && mv .mcp.minimal.json .mcp.json
```

#### Worker MCP Requirements

**bug-hunter**:
- MUST use Context7 (`mcp__context7__*`) to validate patterns before flagging bugs (PD-4)
- Use `gh` CLI via Bash for GitHub issues (not MCP)

**security-scanner**:
- MUST use Context7 for security best practices (PD-4)
- Use Supabase MCP only if `.mcp.full.json` active

**dependency-auditor**:
- Use npm audit (standard tool)
- Use `gh` CLI via Bash for package health

#### Fallback Strategy

If MCP unavailable (see PART 3: Fallback 1):
1. Log warning in report
2. Continue with reduced functionality
3. Mark findings as "REQUIRES_VERIFICATION"
4. Reduce confidence scores

---

## PART 7: REFERENCE DOCS

### Core Documentation

**Architecture** (CANONICAL):
- `docs/Agents Ecosystem/ARCHITECTURE.md` - Agent patterns, coordination, best practices

**Quality Gates**:
- `docs/Agents Ecosystem/QUALITY-GATES-SPECIFICATION.md` - Validation criteria, blocking/non-blocking gates

**Report Template**:
- `docs/Agents Ecosystem/REPORT-TEMPLATE-STANDARD.md` - Standardized report format for workers

**Behavioral OS Guide**:
- `docs/Agents Ecosystem/BEHAVIORAL-OS-GUIDE.md` - Deep dive into Behavioral OS concepts

### Archived Documentation

**Deprecated** (reference only, not authoritative):
- `docs/Agents Ecosystem/archive/` - Old versions, superseded by current docs

**Migration Notes**:
- If reading archived docs, verify against current ARCHITECTURE.md
- Archived patterns may be outdated
- Always prefer current docs over archive

### Skills Reference

**Validation**:
- `validate-plan-file` - Validate plan file schema (PD-7)
- `validate-report-file` - Validate report completeness (PD-6)
- `validate-context7-availability` - Check Context7 MCP status (PD-4)

**Quality Gates**:
- `run-quality-gate` - Execute validation commands (PD-2)
- `parse-error-logs` - Parse build/test errors

**Utilities**:
- `rollback-changes` - Restore files from backups (PD-3)
- `check-infinite-loop` - Detect infinite invocation loops (PART 4)
- `generate-report-header` - Create standardized report headers (PD-6)
- `format-commit-message` - Generate conventional commits
- `parse-git-status` - Parse git status output

### External Resources

**Claude Code Documentation**:
- https://docs.claude.com/en/docs/claude-code/sub-agents
- https://docs.claude.com/en/docs/claude-code/claude_code_docs_map.md

**MCP Servers**:
- Context7: Library documentation lookup
- Supabase: Database and RLS management
- n8n: Workflow automation
- shadcn: UI component library

### Version History

**Version 3.0** (2025-10-21):
- Complete restructure as Behavioral Operating System
- Added Prime Directives (PD-1 through PD-7)
- Added Behavioral Contracts
- Added Fallback Strategies
- Added Emergency Protocols
- Added Self-Diagnostics Protocol

**Version 2.0** (Previous):
- Rule-based system
- Basic orchestrator/worker patterns
- MCP integration

**Version 1.0** (Original):
- Simple agent guidelines
- No formal contracts or fallbacks

---

**END OF CLAUDE.MD BEHAVIORAL OPERATING SYSTEM**

> This document is the canonical source of truth for agent behavior.
> All agents MUST comply with Prime Directives, Behavioral Contracts, and operational procedures.
> Violations should be reported as bugs in agent implementation.
