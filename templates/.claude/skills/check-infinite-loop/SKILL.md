---
name: check-infinite-loop
description: Detect if the same agent+config has been invoked 3+ times without progress (infinite loop detection). Use when orchestrators are about to invoke workers to prevent workflow loops. Returns loop detection status with diagnostic information.
allowed-tools: Read
---

# Check Infinite Loop

Detect infinite loops by tracking agent invocations with identical configurations to prevent workflow failures from repeating endlessly.

## When to Use

- Before orchestrator invokes worker (pre-invocation check)
- After worker failure with retry logic
- In iterative workflows with max iteration limits
- When detecting repeated validation failures
- During emergency protocol detection

## Instructions

### Step 1: Receive Input

Accept agent name, configuration, and maximum allowed repeats.

**Expected Input**:
```json
{
  "agent_name": "bug-fixer",
  "config": {"priority": "critical"},
  "max_repeats": 3
}
```

**Parameters**:
- `agent_name`: String (required) - Name of agent to check for loop
- `config`: Object (required) - Configuration object for agent invocation
- `max_repeats`: Number (optional, default: 3) - Maximum allowed consecutive invocations before loop detected

### Step 2: Read Invocation History

Load invocation history from temporary logs file.

**File Location**: `.tmp/current/logs/invocation-history.json`

**Expected File Format**:
```json
{
  "invocations": [
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:10:00Z",
      "result": "failed"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:15:00Z",
      "result": "failed"
    }
  ]
}
```

**Tools Used**: Read

**Fallback Handling**:
- If file doesn't exist: Create empty invocation list (first invocation)
- If file corrupt: Log warning, assume empty list (safe fallback)
- If file empty: Treat as empty invocation list

### Step 3: Filter Matching Invocations

Find all consecutive invocations matching current agent+config.

**Matching Logic**:
- Agent name must match exactly
- Config object must match deeply (same keys and values)
- Only count consecutive invocations from most recent backwards

**Example**:
```json
{
  "invocations": [
    {"agent_name": "bug-fixer", "config": {"priority": "critical"}, "timestamp": "14:00"},
    {"agent_name": "bug-fixer", "config": {"priority": "critical"}, "timestamp": "14:05"},
    {"agent_name": "security-fixer", "config": {}, "timestamp": "14:08"},
    {"agent_name": "bug-fixer", "config": {"priority": "critical"}, "timestamp": "14:10"}
  ]
}
```

For query `agent_name="bug-fixer"`, `config={"priority": "critical"}`:
- Count from end: 1 match (14:10)
- Stop at security-fixer (different agent)
- Result: invocation_count = 1 (not consecutive)

For consecutive matches:
```json
{
  "invocations": [
    {"agent_name": "bug-fixer", "config": {"priority": "critical"}, "timestamp": "14:00"},
    {"agent_name": "bug-fixer", "config": {"priority": "critical"}, "timestamp": "14:05"},
    {"agent_name": "bug-fixer", "config": {"priority": "critical"}, "timestamp": "14:10"}
  ]
}
```
Result: invocation_count = 3 (consecutive)

### Step 4: Count Consecutive Invocations

Count consecutive invocations from most recent backwards.

**Counting Algorithm**:
1. Start from most recent invocation (end of array)
2. Check if agent_name and config match
3. If match: increment count, move to previous
4. If no match: stop counting (break consecutive chain)
5. Return count

**Important**: Only consecutive invocations count. Non-matching invocation breaks the chain.

### Step 5: Detect Loop

Compare invocation count with max_repeats threshold.

**Loop Detection Logic**:
```
IF invocation_count >= max_repeats:
  loop_detected = true
  action = "halt"
ELSE:
  loop_detected = false
  action = "continue"
```

**Reasoning**: If same agent+config invoked N times consecutively, likely stuck in infinite retry loop.

### Step 6: Generate Diagnostic Info

Collect diagnostic information about the loop pattern.

**Diagnostic Fields**:
- `recent_invocations`: Last 5 invocations with timestamps and results
- `pattern`: Description of detected pattern
- `suspected_cause`: Analysis of why loop occurred

**Pattern Analysis**:
- All invocations failed validation → "Worker fails validation repeatedly"
- All invocations timeout → "Worker times out repeatedly"
- Mixed results → "Worker produces inconsistent results"
- No results field → "Unknown pattern"

**Suspected Cause Analysis**:
- Type-check failures → "Bug fixes introduce type errors"
- Build failures → "Build process broken by changes"
- Test failures → "Tests fail after modifications"
- Unknown → "Review worker logs for details"

### Step 7: Return Result

Return structured result with loop detection status and diagnostic info.

**Expected Output**:
```json
{
  "loop_detected": boolean,
  "invocation_count": number,
  "max_allowed": number,
  "action": "continue" | "halt",
  "message": string,
  "diagnostic_info": {
    "recent_invocations": [...],
    "pattern": string,
    "suspected_cause": string
  }
}
```

**Output Fields**:
- `loop_detected`: Boolean indicating if infinite loop detected
- `invocation_count`: Number of consecutive invocations for this agent+config
- `max_allowed`: Maximum allowed repeats (from input)
- `action`: Action orchestrator should take ("continue" or "halt")
- `message`: Human-readable status message
- `diagnostic_info`: Detailed diagnostic information for debugging

## Error Handling

- **Missing invocation history file**: Assume first invocation, return continue with count=0
- **Corrupt JSON in history file**: Log warning, assume empty history, return continue
- **Invalid input (missing agent_name or config)**: Return error with message
- **Read permission denied**: Log error, assume safe (return continue with warning)
- **Empty config object**: Valid (matches other empty configs)

## Examples

### Example 1: No Loop - First Invocation

**Input**:
```json
{
  "agent_name": "bug-fixer",
  "config": {"priority": "critical"},
  "max_repeats": 3
}
```

**Invocation History**: File doesn't exist (first run)

**Output**:
```json
{
  "loop_detected": false,
  "invocation_count": 0,
  "max_allowed": 3,
  "action": "continue",
  "message": "First invocation - no loop detected",
  "diagnostic_info": {
    "recent_invocations": [],
    "pattern": "No previous invocations",
    "suspected_cause": "N/A"
  }
}
```

**Explanation**: First invocation of workflow, no history exists. Safe to proceed.

### Example 2: Loop Detected - 3 Identical Invocations

**Input**:
```json
{
  "agent_name": "bug-fixer",
  "config": {"priority": "critical"},
  "max_repeats": 3
}
```

**Invocation History**:
```json
{
  "invocations": [
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:10:00Z",
      "result": "failed",
      "reason": "Type-check failed"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:15:00Z",
      "result": "failed",
      "reason": "Type-check failed"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:20:00Z",
      "result": "failed",
      "reason": "Type-check failed"
    }
  ]
}
```

**Output**:
```json
{
  "loop_detected": true,
  "invocation_count": 3,
  "max_allowed": 3,
  "action": "halt",
  "message": "🚨 EMERGENCY: Infinite loop detected - same agent+config invoked 3 times without progress",
  "diagnostic_info": {
    "recent_invocations": [
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "critical"},
        "timestamp": "2025-10-21T14:10:00Z",
        "result": "failed",
        "reason": "Type-check failed"
      },
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "critical"},
        "timestamp": "2025-10-21T14:15:00Z",
        "result": "failed",
        "reason": "Type-check failed"
      },
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "critical"},
        "timestamp": "2025-10-21T14:20:00Z",
        "result": "failed",
        "reason": "Type-check failed"
      }
    ],
    "pattern": "Same config invoked 3 times consecutively",
    "suspected_cause": "Worker fails type-check repeatedly - bug fixes introduce type errors"
  }
}
```

**Explanation**: Bug-fixer invoked 3 times with identical config, all failed type-check. Clear infinite loop. Orchestrator must HALT.

### Example 3: No Loop - Different Configs

**Input**:
```json
{
  "agent_name": "bug-fixer",
  "config": {"priority": "critical"},
  "max_repeats": 3
}
```

**Invocation History**:
```json
{
  "invocations": [
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "high"},
      "timestamp": "2025-10-21T14:10:00Z",
      "result": "success"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "medium"},
      "timestamp": "2025-10-21T14:15:00Z",
      "result": "success"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:20:00Z"
    }
  ]
}
```

**Output**:
```json
{
  "loop_detected": false,
  "invocation_count": 1,
  "max_allowed": 3,
  "action": "continue",
  "message": "No loop detected - different configurations used",
  "diagnostic_info": {
    "recent_invocations": [
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "high"},
        "timestamp": "2025-10-21T14:10:00Z",
        "result": "success"
      },
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "medium"},
        "timestamp": "2025-10-21T14:15:00Z",
        "result": "success"
      },
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "critical"},
        "timestamp": "2025-10-21T14:20:00Z"
      }
    ],
    "pattern": "Different configurations used - iterative progress",
    "suspected_cause": "N/A - normal workflow progression"
  }
}
```

**Explanation**: Bug-fixer used with different priority configs. This is iterative workflow (fixing critical, then high, then medium), not a loop.

### Example 4: No Loop - Consecutive Chain Broken

**Input**:
```json
{
  "agent_name": "bug-fixer",
  "config": {"priority": "critical"},
  "max_repeats": 3
}
```

**Invocation History**:
```json
{
  "invocations": [
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:00:00Z",
      "result": "failed"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:05:00Z",
      "result": "failed"
    },
    {
      "agent_name": "security-fixer",
      "config": {},
      "timestamp": "2025-10-21T14:08:00Z",
      "result": "success"
    },
    {
      "agent_name": "bug-fixer",
      "config": {"priority": "critical"},
      "timestamp": "2025-10-21T14:15:00Z"
    }
  ]
}
```

**Output**:
```json
{
  "loop_detected": false,
  "invocation_count": 1,
  "max_allowed": 3,
  "action": "continue",
  "message": "No loop detected - consecutive chain broken by different agent",
  "diagnostic_info": {
    "recent_invocations": [
      {
        "agent_name": "security-fixer",
        "config": {},
        "timestamp": "2025-10-21T14:08:00Z",
        "result": "success"
      },
      {
        "agent_name": "bug-fixer",
        "config": {"priority": "critical"},
        "timestamp": "2025-10-21T14:15:00Z"
      }
    ],
    "pattern": "Different agent invoked between retries",
    "suspected_cause": "N/A - normal multi-agent workflow"
  }
}
```

**Explanation**: Bug-fixer invoked 3 times total, but security-fixer ran in between. Only 1 consecutive invocation, not a loop.

### Example 5: Loop Detected - Custom Threshold

**Input**:
```json
{
  "agent_name": "dependency-auditor",
  "config": {"update_strategy": "conservative"},
  "max_repeats": 2
}
```

**Invocation History**:
```json
{
  "invocations": [
    {
      "agent_name": "dependency-auditor",
      "config": {"update_strategy": "conservative"},
      "timestamp": "2025-10-21T14:10:00Z",
      "result": "failed",
      "reason": "Build failed after updates"
    },
    {
      "agent_name": "dependency-auditor",
      "config": {"update_strategy": "conservative"},
      "timestamp": "2025-10-21T14:20:00Z",
      "result": "failed",
      "reason": "Build failed after updates"
    }
  ]
}
```

**Output**:
```json
{
  "loop_detected": true,
  "invocation_count": 2,
  "max_allowed": 2,
  "action": "halt",
  "message": "🚨 EMERGENCY: Infinite loop detected - same agent+config invoked 2 times without progress",
  "diagnostic_info": {
    "recent_invocations": [
      {
        "agent_name": "dependency-auditor",
        "config": {"update_strategy": "conservative"},
        "timestamp": "2025-10-21T14:10:00Z",
        "result": "failed",
        "reason": "Build failed after updates"
      },
      {
        "agent_name": "dependency-auditor",
        "config": {"update_strategy": "conservative"},
        "timestamp": "2025-10-21T14:20:00Z",
        "result": "failed",
        "reason": "Build failed after updates"
      }
    ],
    "pattern": "Same config invoked 2 times consecutively",
    "suspected_cause": "Worker fails build repeatedly - dependency updates break build"
  }
}
```

**Explanation**: Custom threshold of 2 repeats. Dependency-auditor invoked twice with same config, both failed build. Loop detected.

## Validation

- [ ] Reads invocation history file correctly
- [ ] Handles missing history file gracefully (first invocation)
- [ ] Handles corrupt JSON gracefully (safe fallback)
- [ ] Counts only consecutive invocations from most recent
- [ ] Breaks count when different agent/config encountered
- [ ] Compares config objects deeply (not by reference)
- [ ] Detects loop when count >= max_repeats
- [ ] Returns "halt" action when loop detected
- [ ] Returns "continue" action when no loop
- [ ] Generates diagnostic info with recent invocations
- [ ] Analyzes pattern correctly (repeated failures, timeouts, etc)
- [ ] Suggests suspected cause based on failure reasons
- [ ] Respects custom max_repeats threshold
- [ ] Returns structured JSON output conforming to schema

## Integration with Orchestrators

### Pre-Invocation Check Pattern

All orchestrators should use this Skill before invoking workers:

```markdown
## Before Invoking Worker

### Infinite Loop Detection

Use check-infinite-loop Skill BEFORE creating plan file:

Input:
```json
{
  "agent_name": "bug-fixer",
  "config": {"priority": "critical"},
  "max_repeats": 3
}
```

**Handle Result**:

**If action = "continue"**:
- No loop detected
- Proceed to create plan file
- Invoke worker as normal

**If action = "halt"**:
- HALT workflow immediately
- Report emergency to user:
  ```
  🚨 EMERGENCY: Infinite loop detected

  Agent: bug-fixer
  Config: {"priority": "critical"}
  Invocations: 3
  Max Allowed: 3

  Diagnostic Info:
  - Pattern: {diagnostic_info.pattern}
  - Suspected Cause: {diagnostic_info.suspected_cause}

  Recent Invocations:
  {list recent invocations with timestamps and results}

  Aborting workflow to prevent further failures.

  Recommendation: Review worker logs and adjust approach before retrying.
  ```
- Archive diagnostic data to `.tmp/current/logs/infinite-loop-{timestamp}.json`
- Exit workflow
- DO NOT retry or create plan file
```

### Logging Invocation Results

Orchestrators must log invocation results for tracking:

```markdown
## After Worker Returns

### Log Invocation Result

Update invocation history at `.tmp/current/logs/invocation-history.json`:

1. Read existing history (or create empty if doesn't exist)
2. Append new invocation:
   ```json
   {
     "agent_name": "bug-fixer",
     "config": {"priority": "critical"},
     "timestamp": "2025-10-21T14:30:00Z",
     "result": "success" | "failed",
     "reason": "Type-check passed" | "Type-check failed" | etc
   }
   ```
3. Write updated history back to file
4. Keep history file size manageable (max 50 invocations, rotate older ones)
```

### Emergency Protocol Integration

From CLAUDE.md PART 4 - Emergency Protocols:

```markdown
## Emergency: Infinite Loop Detected

**Trigger**: check-infinite-loop Skill returns action="halt"

**Action**:
1. HALT workflow immediately
2. Report to user with diagnostic info
3. Archive diagnostic data
4. Exit workflow
5. DO NOT retry without config change

**User Report Format**:
```
🚨 EMERGENCY: Infinite loop detected

Agent: {agent_name}
Config: {JSON.stringify(config)}
Invocations: {invocation_count}

Suspected cause: {diagnostic_info.suspected_cause}

Diagnostic info:
- Last 3 invocations all failed type-check
- Same files modified each time
- No progress made

Aborting workflow to prevent further failures.

Recommendation: Review bug-fixer logs and adjust approach.
```

**User Options**:
1. Abort workflow (recommended)
2. Retry with different config (advanced)
3. Skip infinite loop check for next invocation (dangerous)
```

## Usage with Max Iteration Limits

Orchestrators with max iteration limits should coordinate with loop detection:

```markdown
## Max Iterations vs Infinite Loop Detection

**Max Iterations** (CLAUDE.md PART 3):
- Limits total workflow cycles (Phase 2 → Phase 3 → Phase 2)
- Default: 3 iterations
- Purpose: Prevent endless refinement cycles

**Infinite Loop Detection** (this Skill):
- Detects same agent+config invoked repeatedly
- Default: 3 consecutive invocations
- Purpose: Prevent same worker failing repeatedly

**Coordination**:
- Max iterations controls workflow-level loops
- Infinite loop detection controls agent-level loops
- Use both for comprehensive protection

**Example**:
Iteration 1:
  - bug-fixer (priority=critical) → failed
  - bug-fixer (priority=critical) → failed
  - bug-fixer (priority=critical) → LOOP DETECTED → HALT

Prevented 2 more iterations of same failure.
```

## Notes

**Consecutive vs Total**: Only consecutive invocations count. If different agent/config runs in between, counter resets. This allows workflows to retry after other agents have made changes.

**Config Comparison**: Config objects compared deeply (all keys and values must match). Empty objects `{}` match other empty objects.

**History File Management**: Keep history file manageable (max 50 invocations). Orchestrators should rotate old entries to prevent file growth.

**Diagnostic Analysis**: Skill analyzes failure patterns (type-check, build, test failures) to suggest root cause. This helps users understand why loop occurred.

**Emergency Protocol**: When loop detected, orchestrator MUST halt workflow. DO NOT retry without changing config or approach.

**Fallback Safety**: If history file missing or corrupt, Skill assumes safe state (first invocation) to prevent false positives blocking legitimate workflows.

**Custom Thresholds**: Default max_repeats=3, but orchestrators can adjust based on workflow needs. Conservative workflows (dependency updates) might use 2, lenient workflows might use 5.

**Integration with record-metrics**: This Skill reads invocation history but doesn't write it. Orchestrators should use `record-metrics` Skill or direct file writes to log invocations.

**Action Enum Values**:
- `continue`: No loop detected, safe to proceed
- `halt`: Loop detected, MUST stop workflow

**Performance**: Reading/parsing history file adds ~50-100ms overhead per invocation check. Acceptable for preventing infinite loops.

**Future Enhancements**:
- Detect progress loops (same files modified/reverted repeatedly)
- Detect time-based loops (invocations too close together)
- Add configurable cooldown period between retries
- Support pattern matching (similar but not identical configs)
