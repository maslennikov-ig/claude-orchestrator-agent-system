---
name: validate-context7-availability
description: Verify that Context7 MCP server is available before workers rely on it for pattern validation. Use when workers need to validate findings against current library documentation. Returns availability status with actionable recommendations.
allowed-tools: None
---

# Validate Context7 Availability

Verify Context7 MCP server availability before workers rely on it for pattern validation to prevent outdated recommendations.

## When to Use

- At worker invocation (Step 0: Pre-flight Validation)
- Before querying library best practices
- When validating bugs, security issues, or dependency patterns
- In quality gate checks requiring current documentation

## Instructions

### Step 1: Receive Input

Accept worker name and requirement configuration.

**Expected Input**:
```json
{
  "worker_name": "bug-hunter",
  "required": true
}
```

**Parameters**:
- `worker_name`: String (required) - Name of worker performing validation
- `required`: Boolean (required) - Whether Context7 is mandatory for this worker

### Step 2: Check MCP Tools Availability

Search for Context7 MCP tools to determine if server is available.

**Detection Method**:
- Look for tools starting with `mcp__context7__`
- Common tools: `mcp__context7__query`, `mcp__context7__search`
- If ANY Context7 tool found → available = true
- If NO Context7 tools found → available = false

**Tools Used**: None (check available tools via system inspection)

### Step 3: Determine Action Based on Availability

Map availability and requirement to appropriate action.

**Decision Logic**:

**Scenario 1: Context7 Available**
- Condition: `available = true`
- Action: `continue`
- Message: "✅ Context7 MCP server available"
- Recommendation: None

**Scenario 2: Context7 Unavailable AND Required**
- Condition: `available = false` AND `required = true`
- Action: `warn`
- Message: "⚠️ Context7 MCP server not available. Findings will have reduced confidence."
- Recommendation: "Install Context7: Add to .mcp.json and restart Claude Code"

**Scenario 3: Context7 Unavailable AND NOT Required**
- Condition: `available = false` AND `required = false`
- Action: `continue`
- Message: "Context7 not required for this worker"
- Recommendation: None

### Step 4: Return Validation Result

Return structured result with availability status and action.

**Expected Output**:
```json
{
  "available": boolean,
  "action": "continue" | "warn" | "halt",
  "message": string,
  "recommendation": string (optional)
}
```

**Output Fields**:
- `available`: Boolean indicating Context7 MCP server availability
- `action`: Action worker should take ("continue", "warn", "halt")
- `message`: Human-readable status message with emoji indicator
- `recommendation`: Optional installation/configuration guidance (only when unavailable)

## Error Handling

- **Invalid Input**: Return error if `worker_name` or `required` missing
- **Tool Inspection Failure**: Assume unavailable and return warn action
- **Unexpected Tool State**: Log warning and proceed with conservative assumption

## Examples

### Example 1: Context7 Available (Happy Path)

**Input**:
```json
{
  "worker_name": "bug-hunter",
  "required": true
}
```

**System State**: `mcp__context7__query` and `mcp__context7__search` tools present

**Output**:
```json
{
  "available": true,
  "action": "continue",
  "message": "✅ Context7 MCP server available"
}
```

**Explanation**: Worker can proceed with high-confidence pattern validation using Context7.

### Example 2: Context7 Unavailable - Required Worker

**Input**:
```json
{
  "worker_name": "security-scanner",
  "required": true
}
```

**System State**: No `mcp__context7__*` tools found

**Output**:
```json
{
  "available": false,
  "action": "warn",
  "message": "⚠️ Context7 MCP server not available. Findings will have reduced confidence.",
  "recommendation": "Install Context7: Add to .mcp.json and restart Claude Code"
}
```

**Explanation**: Worker continues but reduces confidence scores and marks findings as "REQUIRES_VERIFICATION".

### Example 3: Context7 Unavailable - Not Required

**Input**:
```json
{
  "worker_name": "dependency-auditor",
  "required": false
}
```

**System State**: No `mcp__context7__*` tools found

**Output**:
```json
{
  "available": false,
  "action": "continue",
  "message": "Context7 not required for this worker"
}
```

**Explanation**: Worker proceeds normally without Context7 validation (not critical for this worker's task).

### Example 4: Bug Hunter with Context7 Available

**Input**:
```json
{
  "worker_name": "bug-hunter",
  "required": true
}
```

**System State**: `mcp__context7__query` tool available

**Output**:
```json
{
  "available": true,
  "action": "continue",
  "message": "✅ Context7 MCP server available"
}
```

**Worker Next Steps**:
1. Set internal flag: `context7_available = true`
2. For EACH potential bug, query Context7 for current best practices
3. Mark findings with "high confidence (validated via Context7)"
4. Include Context7 source in bug report

### Example 5: Security Scanner Fallback Mode

**Input**:
```json
{
  "worker_name": "security-scanner",
  "required": true
}
```

**System State**: No Context7 tools available

**Output**:
```json
{
  "available": false,
  "action": "warn",
  "message": "⚠️ Context7 MCP server not available. Findings will have reduced confidence.",
  "recommendation": "Install Context7: Add to .mcp.json and restart Claude Code"
}
```

**Worker Next Steps**:
1. Set internal flag: `context7_available = false`
2. Add warning section to report header
3. Reduce all confidence scores by 1 level:
   - high → medium
   - medium → low
   - low → very-low
4. Mark all findings as "REQUIRES_VERIFICATION"
5. Continue analysis using general knowledge

## Validation

- [ ] Detects Context7 tools correctly (mcp__context7__*)
- [ ] Returns correct action for all three scenarios
- [ ] Includes recommendation only when Context7 unavailable
- [ ] Message includes appropriate emoji indicator
- [ ] Handles missing input parameters gracefully
- [ ] Output conforms to expected JSON schema
- [ ] Action field limited to valid enum values
- [ ] Recommendation provides clear installation instructions

## Integration with Workers

### Pre-flight Validation Pattern

All health workers (bug-hunter, security-scanner, dependency-auditor) should use this Skill in Step 0:

```markdown
## Step 0: Pre-flight Validation

### Context7 Availability Check

Use validate-context7-availability Skill:
```json
{
  "worker_name": "bug-hunter",
  "required": true
}
```

**Handle Result**:

**If action = "continue" AND available = true**:
- Set `context7_available = true`
- Use Context7 for ALL pattern validations
- High confidence in findings
- Proceed to next step

**If action = "warn" AND available = false**:
- Set `context7_available = false`
- Add warning to report header (see template below)
- Reduce all confidence scores by 1 level
- Mark all findings as "REQUIRES_VERIFICATION"
- Proceed with reduced confidence mode

**If action = "continue" AND available = false**:
- Context7 not required for this worker
- Proceed normally without Context7 validation
```

### Report Header Template (When Unavailable)

```markdown
## ⚠️ Context7 Unavailability Notice

Context7 MCP server was not available during analysis.
All findings are based on general knowledge and may be outdated.

**Recommendation**: Install Context7 for accurate pattern validation:

1. Add to `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "context7": {
         "command": "npx",
         "args": ["-y", "@upstash/context7-mcp@latest"]
       }
     }
   }
   ```

2. Restart Claude Code

**Impact**:
- Confidence scores reduced by 1 level
- All findings marked as "REQUIRES_VERIFICATION"
- False positive rate may be higher (~30% vs <5% with Context7)
```

### Pattern Validation with Context7

**When context7_available = true**:

```markdown
For EACH potential bug/security issue:

1. Query Context7 for current best practices:
   ```
   Use mcp__context7__query tool:
   - query: "React useEffect dependency array exhaustive-deps rule"
   - library: "react"
   - version: "18.2.0" (from package.json)
   ```

2. Validate finding against Context7 response:
   - If Context7 confirms issue → flag with high confidence
   - If Context7 shows pattern is valid → skip (avoid false positive)
   - If Context7 unclear → flag with medium confidence + note

3. Include Context7 source in report:
   ```markdown
   **Confidence**: high ✅ (validated via Context7)
   **Source**: React 18.2.0 official docs via Context7
   ```
```

**When context7_available = false**:

```markdown
For EACH potential bug/security issue:

1. Rely on general knowledge (pre-training cutoff)

2. Mark with reduced confidence:
   ```markdown
   **Confidence**: medium ⚠️ (not validated - Context7 unavailable)
   **Verification Status**: REQUIRES_VERIFICATION
   **Note**: This finding is based on general knowledge and may be outdated for your specific library version.
   ```
```

## Installation Instructions (For Users)

### Add Context7 to .mcp.json

Create or update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Restart Claude Code

Context7 MCP server will be available after restarting Claude Code.

### Verify Installation

Run any health worker (e.g., `/health-bugs`) and check report header:
- "✅ Context7 MCP server available" → Success
- "⚠️ Context7 MCP server not available" → Check installation steps

## Notes

**Context7 Purpose**: Provides real-time access to current library documentation, preventing AI from recommending outdated patterns based on training data cutoff (January 2025).

**Why Required for Health Workers**:
- Bug detection: Validate React hooks, TypeScript patterns against current versions
- Security scanning: Check for current vulnerability patterns, not deprecated ones
- Dependency auditing: Verify migration paths and breaking changes

**Performance Impact**: Context7 queries add ~1-2 seconds per finding but reduce false positives from ~30% to <5%.

**Fallback Strategy**: Workers continue without Context7 but with reduced confidence. This prevents workflow blocking while maintaining quality awareness.

**Action Enum Values**:
- `continue`: Proceed without warnings
- `warn`: Proceed with warnings and reduced confidence
- `halt`: Stop execution (reserved for future use, currently not used)

**Future Enhancements**:
- Add `halt` action for critical workers that cannot proceed without Context7
- Support configurable timeout for Context7 queries
- Cache Context7 responses to reduce query volume
