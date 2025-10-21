---
name: record-metrics
description: Record agent invocations, successes, failures, and key events for ecosystem health monitoring. Use after agent events to track performance metrics, quality gates, Context7 usage, and system health for data-driven improvements.
allowed-tools: Read, Write, Bash
---

# Record Metrics

Log agent ecosystem events to monthly metrics files for performance tracking and data-driven optimization.

## When to Use

- After agent invocation (Step 0, immediately after self-diagnostics)
- After agent success (final step before exit)
- After agent failure (error handler)
- After each quality gate execution (type-check, build, tests)
- After complexity analysis (calculate-complexity-score)
- After Context7 query (pattern validation)
- When fallback strategy triggered
- When emergency protocol triggered

## Instructions

### Step 1: Receive Input

Accept event data with agent name, event type, and metadata.

**Expected Input**:
```json
{
  "agent_name": "bug-hunter",
  "event_type": "success" | "failure" | "invocation" | "quality_gate" | "complexity_analysis" | "context7_query" | "fallback" | "emergency",
  "metadata": {
    // Event-specific data
  }
}
```

**Parameters**:
- `agent_name`: String (required) - Name of agent generating event
- `event_type`: String (required) - Type of event (one of 8 types)
- `metadata`: Object (required) - Event-specific data (varies by event_type)

### Step 2: Determine Metrics File Path

Calculate current month and metrics file path.

**Logic**:
```
Current date: 2025-10-21
Current month: 2025-10
Metrics file: .tmp/metrics/2025-10.json
```

**Directory Creation**:
- If `.tmp/metrics/` doesn't exist: create it
- Metrics directory is git-ignored via `.tmp/` parent

### Step 3: Read Existing Metrics

Read current month's metrics file or initialize if not exists.

**If file exists**:
- Read `.tmp/metrics/YYYY-MM.json`
- Parse JSON
- Proceed to update

**If file doesn't exist**:
- Create new metrics object with initial structure:

```json
{
  "month": "2025-10",
  "generated": "2025-10-21T14:30:00Z",
  "agents": {},
  "orchestrators": {},
  "quality_gates": {},
  "complexity_analysis": {
    "tasks_analyzed": 0,
    "trivial": 0,
    "moderate": 0,
    "high": 0,
    "critical": 0,
    "research_phases_triggered": 0,
    "avg_complexity_score": 0
  },
  "context7": {
    "total_queries": 0,
    "successful_queries": 0,
    "failed_queries": 0,
    "avg_response_time_ms": 0,
    "unavailable_events": 0,
    "top_libraries_queried": {}
  },
  "token_efficiency": {
    "estimated_conversations": 0,
    "minimal_mcp_mode": 0,
    "full_mcp_mode": 0,
    "avg_tokens_saved_per_conversation": 1200,
    "total_tokens_saved_estimate": 0
  },
  "behavioral_os": {
    "prime_directive_violations": 0,
    "fallback_strategies_triggered": {
      "context7_unavailable": 0,
      "quality_gate_failure": 0,
      "max_iterations_reached": 0,
      "worker_failure": 0,
      "plan_invalid": 0
    },
    "emergency_protocols_triggered": {
      "infinite_loop": 0,
      "file_corruption": 0,
      "token_exhaustion": 0,
      "concurrent_conflict": 0
    }
  }
}
```

### Step 4: Update Metrics Based on Event Type

Process event and update appropriate metrics sections.

#### Event Type: invocation

**When**: Agent starts work (Step 0 after self-diagnostics)

**Metadata Required**:
```json
{
  "timestamp": "2025-10-21T14:30:00Z",
  "plan_file": ".bug-detection-plan.json",
  "config": {"priority": "all", "scope": ["src/"]}
}
```

**Update Logic**:

1. **For Workers (bug-hunter, security-scanner, etc.)**:
   - Initialize agent entry if doesn't exist:
     ```json
     "agents": {
       "bug-hunter": {
         "invocations": 0,
         "successes": 0,
         "failures": 0,
         "avg_duration_minutes": 0,
         "context7_usage": {
           "available": 0,
           "unavailable": 0,
           "queries_made": 0
         }
       }
     }
     ```
   - Increment `agents[agent_name].invocations`
   - Store invocation timestamp for duration calculation on success/failure

2. **For Orchestrators (bug-orchestrator, security-orchestrator, etc.)**:
   - Initialize orchestrator entry if doesn't exist:
     ```json
     "orchestrators": {
       "bug-orchestrator": {
         "runs": 0,
         "completed": 0,
         "aborted": 0,
         "avg_iterations": 0,
         "max_iterations_hit": 0,
         "avg_duration_minutes": 0
       }
     }
     ```
   - Increment `orchestrators[agent_name].runs`

3. **Store invocation data** (for duration calculation):
   - Save timestamp in temporary tracking object
   - Will be used when success/failure event arrives

---

#### Event Type: success

**When**: Agent completes successfully

**Metadata Required** (varies by agent):
```json
{
  "duration_minutes": 8.5,
  "bugs_found": 12,              // bug-hunter
  "false_positives": 2,          // bug-hunter
  "fixes_applied": 8,            // bug-fixer
  "vulnerabilities_found": 5,    // security-scanner
  "context7_used": true,
  "context7_queries": 23,
  "top_bug_types": ["type-errors", "react-hooks"]  // optional
}
```

**Update Logic**:

1. **For Workers**:
   - Increment `agents[agent_name].successes`
   - Update `avg_duration_minutes` (rolling average):
     ```
     New avg = (old avg * successes + new duration) / (successes + 1)
     ```
   - Add domain-specific metrics:
     * bug-hunter: `total_bugs_found`, `false_positives`, `top_bug_types`
     * bug-fixer: `fixes_applied`, `rollbacks`, `quality_gate_failures`
     * security-scanner: `vulnerabilities_found`, `by_severity`
     * research-agent: `hypotheses_generated`, `avg_hypotheses_per_task`

   - Update Context7 usage:
     * If `context7_used === true`: Increment `context7_usage.available`
     * If `context7_used === false`: Increment `context7_usage.unavailable`
     * Add `context7_queries` to `context7_usage.queries_made`

2. **For Orchestrators**:
   - Increment `orchestrators[agent_name].completed`
   - Update `avg_duration_minutes` (rolling average)
   - Update `avg_iterations` if metadata includes `iterations`

---

#### Event Type: failure

**When**: Agent fails to complete work

**Metadata Required**:
```json
{
  "duration_minutes": 2.3,
  "error": "Context7 timeout",
  "reason": "MCP server unresponsive"
}
```

**Update Logic**:

1. **For Workers**:
   - Increment `agents[agent_name].failures`
   - Update `avg_duration_minutes` (include failed attempts in average)

2. **For Orchestrators**:
   - Increment `orchestrators[agent_name].aborted`
   - Update `avg_duration_minutes`

---

#### Event Type: quality_gate

**When**: Quality gate runs (type-check, build, tests)

**Metadata Required**:
```json
{
  "gate_name": "type-check" | "build" | "tests",
  "status": "passed" | "failed",
  "duration_seconds": 12.3,
  "error_count": 0
}
```

**Update Logic**:

1. **Initialize gate entry if doesn't exist**:
   ```json
   "quality_gates": {
     "type-check": {
       "runs": 0,
       "passes": 0,
       "failures": 0,
       "pass_rate": 0,
       "avg_duration_seconds": 0
     }
   }
   ```

2. **Update gate metrics**:
   - Increment `quality_gates[gate_name].runs`
   - If `status === "passed"`: Increment `passes`
   - If `status === "failed"`: Increment `failures`
   - Recalculate `pass_rate`: `(passes / runs) * 100`
   - Update `avg_duration_seconds` (rolling average)

3. **Track failures per agent** (if agent provided):
   - Update `agents[agent_name].quality_gate_failures[gate_name]` counter

---

#### Event Type: complexity_analysis

**When**: Complexity score calculated (calculate-complexity-score Skill)

**Metadata Required**:
```json
{
  "task_type": "bug" | "security" | "dependency",
  "complexity_score": 7,
  "complexity_level": "trivial" | "moderate" | "high" | "critical",
  "requires_research": true
}
```

**Update Logic**:

1. **Increment counters**:
   - Increment `complexity_analysis.tasks_analyzed`
   - Increment complexity level counter:
     * `complexity_level === "trivial"` (0-3): Increment `trivial`
     * `complexity_level === "moderate"` (4-6): Increment `moderate`
     * `complexity_level === "high"` (7-8): Increment `high`
     * `complexity_level === "critical"` (9-10): Increment `critical`

2. **Track research triggers**:
   - If `requires_research === true`: Increment `research_phases_triggered`

3. **Update average complexity score** (rolling average):
   ```
   New avg = (old avg * tasks_analyzed + new score) / (tasks_analyzed + 1)
   ```

---

#### Event Type: context7_query

**When**: Context7 MCP query made (library documentation lookup)

**Metadata Required**:
```json
{
  "library": "react",
  "query": "useEffect dependency array best practices",
  "success": true,
  "response_time_ms": 1234
}
```

**Update Logic**:

1. **Increment query counters**:
   - Increment `context7.total_queries`
   - If `success === true`: Increment `successful_queries`
   - If `success === false`: Increment `failed_queries`

2. **Update average response time** (rolling average):
   ```
   New avg = (old avg * total_queries + new response_time) / (total_queries + 1)
   ```

3. **Track library usage**:
   - Increment `top_libraries_queried[library]` counter
   - Example:
     ```json
     "top_libraries_queried": {
       "react": 156,
       "typescript": 89,
       "next.js": 67
     }
     ```

4. **Track unavailability**:
   - If `success === false` AND `error === "unavailable"`:
     * Increment `unavailable_events`

---

#### Event Type: fallback

**When**: Fallback strategy triggered (PART 3 of CLAUDE.md)

**Metadata Required**:
```json
{
  "fallback_type": "context7_unavailable" | "quality_gate_failure" | "max_iterations_reached" | "worker_failure" | "plan_invalid",
  "reason": "MCP server not found",
  "action_taken": "Continued with reduced confidence"
}
```

**Update Logic**:

1. **Increment fallback counter**:
   - Increment `behavioral_os.fallback_strategies_triggered[fallback_type]`

2. **Valid fallback types**:
   - `context7_unavailable`
   - `quality_gate_failure`
   - `max_iterations_reached`
   - `worker_failure`
   - `plan_invalid`

---

#### Event Type: emergency

**When**: Emergency protocol triggered (PART 4 of CLAUDE.md)

**Metadata Required**:
```json
{
  "emergency_type": "infinite_loop" | "file_corruption" | "token_exhaustion" | "concurrent_conflict",
  "details": "bug-fixer invoked 3 times with same config",
  "action_taken": "Halted workflow"
}
```

**Update Logic**:

1. **Increment emergency counter**:
   - Increment `behavioral_os.emergency_protocols_triggered[emergency_type]`

2. **Valid emergency types**:
   - `infinite_loop`
   - `file_corruption`
   - `token_exhaustion`
   - `concurrent_conflict`

---

### Step 5: Update Timestamp

Update the `generated` field with current timestamp.

**Logic**:
```json
{
  "generated": "2025-10-21T14:35:22Z"
}
```

This shows when metrics were last updated.

---

### Step 6: Write Metrics Back to File

Write updated metrics object to file.

**File Path**: `.tmp/metrics/YYYY-MM.json`

**Format**: Pretty-printed JSON with 2-space indentation for human readability

**Atomicity**:
- Write to temporary file first: `.tmp/metrics/YYYY-MM.json.tmp`
- Move to final location after successful write
- Prevents corruption if write interrupted

---

### Step 7: Return Result

Return success/failure status with details.

**Expected Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-hunter (success event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "success"
}
```

**Output Fields**:
- `success`: Boolean indicating if metrics were recorded successfully
- `message`: Human-readable status message
- `metrics_file`: Path to updated metrics file
- `event_type`: Echo of event type processed

---

## Error Handling

### Invalid Input

**Missing Required Fields**:
```json
{
  "success": false,
  "error": "Missing required field: agent_name",
  "message": "Cannot record metrics without agent name"
}
```

**Invalid Event Type**:
```json
{
  "success": false,
  "error": "Invalid event_type: unknown",
  "message": "Event type must be one of: invocation, success, failure, quality_gate, complexity_analysis, context7_query, fallback, emergency"
}
```

### File System Errors

**Directory Creation Failed**:
- Attempt to create `.tmp/metrics/` directory
- If fails: Return error with permissions issue
- Suggest user creates directory manually

**File Read/Write Failed**:
- If existing file corrupt: Initialize new metrics object (don't fail)
- If write fails: Return error with file path and permissions
- Log error for debugging

**JSON Parse Error**:
- If existing file has invalid JSON: Backup corrupt file
- Initialize new metrics object
- Log warning about corruption
- Continue with fresh metrics

---

## Examples

### Example 1: Agent Invocation

**Input**:
```json
{
  "agent_name": "bug-hunter",
  "event_type": "invocation",
  "metadata": {
    "timestamp": "2025-10-21T14:30:00Z",
    "plan_file": ".bug-detection-plan.json",
    "config": {"priority": "all", "scope": ["src/"]}
  }
}
```

**Actions**:
1. Read `.tmp/metrics/2025-10.json` (or create if not exists)
2. Initialize `agents.bug-hunter` if not exists
3. Increment `agents.bug-hunter.invocations`
4. Store timestamp for duration calculation
5. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-hunter (invocation event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "invocation"
}
```

---

### Example 2: Agent Success

**Input**:
```json
{
  "agent_name": "bug-hunter",
  "event_type": "success",
  "metadata": {
    "duration_minutes": 8.5,
    "bugs_found": 12,
    "false_positives": 2,
    "context7_used": true,
    "context7_queries": 23,
    "top_bug_types": ["type-errors", "react-hooks", "async-race-conditions"]
  }
}
```

**Actions**:
1. Read metrics file
2. Increment `agents.bug-hunter.successes`
3. Update `avg_duration_minutes`: `(0 * 0 + 8.5) / 1 = 8.5`
4. Add `bugs_found`: 12 to `total_bugs_found`
5. Add `false_positives`: 2 to counter
6. Increment `context7_usage.available` (context7_used = true)
7. Add 23 to `context7_usage.queries_made`
8. Update `top_bug_types` distribution
9. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-hunter (success event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "success"
}
```

---

### Example 3: Quality Gate

**Input**:
```json
{
  "agent_name": "bug-fixer",
  "event_type": "quality_gate",
  "metadata": {
    "gate_name": "type-check",
    "status": "passed",
    "duration_seconds": 12.3,
    "error_count": 0
  }
}
```

**Actions**:
1. Read metrics file
2. Initialize `quality_gates.type-check` if not exists
3. Increment `quality_gates.type-check.runs`
4. Increment `quality_gates.type-check.passes` (status = passed)
5. Recalculate `pass_rate`: `(1 / 1) * 100 = 100`
6. Update `avg_duration_seconds`: 12.3
7. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-fixer (quality_gate event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "quality_gate"
}
```

---

### Example 4: Complexity Analysis

**Input**:
```json
{
  "agent_name": "bug-orchestrator",
  "event_type": "complexity_analysis",
  "metadata": {
    "task_type": "bug",
    "complexity_score": 7,
    "complexity_level": "high",
    "requires_research": true
  }
}
```

**Actions**:
1. Read metrics file
2. Increment `complexity_analysis.tasks_analyzed`
3. Increment `complexity_analysis.high` (complexity_level = high)
4. Increment `complexity_analysis.research_phases_triggered` (requires_research = true)
5. Update `avg_complexity_score`: `(0 * 0 + 7) / 1 = 7`
6. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-orchestrator (complexity_analysis event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "complexity_analysis"
}
```

---

### Example 5: Context7 Query

**Input**:
```json
{
  "agent_name": "bug-hunter",
  "event_type": "context7_query",
  "metadata": {
    "library": "react",
    "query": "useEffect dependency array best practices",
    "success": true,
    "response_time_ms": 1234
  }
}
```

**Actions**:
1. Read metrics file
2. Increment `context7.total_queries`
3. Increment `context7.successful_queries` (success = true)
4. Update `avg_response_time_ms`: `(0 * 0 + 1234) / 1 = 1234`
5. Increment `context7.top_libraries_queried.react`
6. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-hunter (context7_query event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "context7_query"
}
```

---

### Example 6: Fallback Strategy

**Input**:
```json
{
  "agent_name": "security-scanner",
  "event_type": "fallback",
  "metadata": {
    "fallback_type": "context7_unavailable",
    "reason": "MCP server not found",
    "action_taken": "Continued with reduced confidence, marked findings as REQUIRES_VERIFICATION"
  }
}
```

**Actions**:
1. Read metrics file
2. Increment `behavioral_os.fallback_strategies_triggered.context7_unavailable`
3. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for security-scanner (fallback event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "fallback"
}
```

---

### Example 7: Emergency Protocol

**Input**:
```json
{
  "agent_name": "bug-orchestrator",
  "event_type": "emergency",
  "metadata": {
    "emergency_type": "infinite_loop",
    "details": "bug-fixer invoked 3 times with same config, all failed type-check",
    "action_taken": "Halted workflow, archived diagnostic data"
  }
}
```

**Actions**:
1. Read metrics file
2. Increment `behavioral_os.emergency_protocols_triggered.infinite_loop`
3. Write back to file

**Output**:
```json
{
  "success": true,
  "message": "Metrics recorded for bug-orchestrator (emergency event)",
  "metrics_file": ".tmp/metrics/2025-10.json",
  "event_type": "emergency"
}
```

---

## Implementation Notes

### Rolling Averages

**Formula**:
```
New Average = (Old Average * Count + New Value) / (Count + 1)
```

**Example**:
- Current avg: 8.0 minutes (from 5 runs)
- New value: 10.0 minutes
- New avg: `(8.0 * 5 + 10.0) / 6 = 8.33 minutes`

**Why Rolling Average**:
- Maintains accuracy without storing all historical values
- Memory efficient
- Easy to update incrementally

### Agent vs Orchestrator Detection

**Heuristic**:
```
If agent_name ends with "-orchestrator" → orchestrator
Otherwise → worker
```

**Examples**:
- `bug-orchestrator` → orchestrator
- `bug-hunter` → worker
- `security-scanner` → worker
- `dependency-orchestrator` → orchestrator

### Concurrent Access Handling

**Issue**: Multiple agents may try to update metrics simultaneously

**Solution**:
1. Use atomic write pattern (write to `.tmp`, move to final)
2. File system guarantees atomic file operations
3. Last write wins (acceptable for metrics aggregation)
4. Alternative: Implement file locking if needed

**Current Approach**: Accept last-write-wins (simple, good enough for metrics)

---

## Benefits

✅ **Data-Driven Decisions**: Know which agents to improve based on success rates
✅ **Performance Tracking**: Monitor duration, pass rates, trends over time
✅ **ROI Proof**: Demonstrate value with concrete metrics (bugs found, vulnerabilities fixed)
✅ **Issue Detection**: Flag underperforming agents or quality gates early
✅ **Context7 Monitoring**: Track MCP usage and effectiveness
✅ **System Health**: Monitor fallbacks/emergencies to detect systemic issues
✅ **Trend Analysis**: Compare month-over-month to see improvements

---

## Related

- `/health-metrics` command: Generates monthly reports from metrics files
- `generate-report-header` Skill: Uses metrics for report headers
- CLAUDE.md PART 5: Self-Diagnostics → Step 4 logs invocations for metrics
