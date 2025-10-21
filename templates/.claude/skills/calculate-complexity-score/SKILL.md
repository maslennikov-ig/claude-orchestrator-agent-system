---
name: calculate-complexity-score
description: Analyze bugs/tasks to determine complexity score (0-10) and recommend appropriate workflow approach. Use when processing bugs, features, or security issues to route to correct workflow (direct-fix vs research-first).
---

# Calculate Complexity Score

Analyze bugs, tasks, and issues to determine complexity score and recommend appropriate workflow approach (direct-fix vs research-first).

## When to Use

- Bug prioritization and workflow routing
- Determining if research phase is needed
- Estimating task effort and duration
- Deciding whether to break down complex tasks
- Quality gate decisions in orchestrators
- Task parallelization assessment

## Instructions

### Step 1: Receive Task Context

Accept task attributes as input.

**Expected Input**:
```json
{
  "type": "bug|security|feature|refactor|performance",
  "title": "Brief description",
  "context": {
    "files_affected": 1,
    "dependencies_involved": ["react", "socket.io-client"],
    "error_patterns": ["TypeError: Cannot read property 'x' of undefined"],
    "user_description": "App crashes when viewing user profile",
    "stack_trace": "UserProfile.tsx:45"
  }
}
```

**Parameters**:
- `type`: Type of task (required)
- `title`: Brief description (required)
- `context.files_affected`: Number of files affected (required)
- `context.dependencies_involved`: Array of external dependencies (required)
- `context.error_patterns`: Array of error messages/patterns (required)
- `context.user_description`: User's description of issue (required)
- `context.stack_trace`: Stack trace if available (optional)

### Step 2: Calculate Scope Points (0-3)

Analyze number of files affected.

**Scoring Rules**:
- **0 points**: 1 file affected
- **1 point**: 2-5 files affected
- **2 points**: 6-15 files affected
- **3 points**: 16+ files affected

**Logic**:
```
if files_affected === 1: scope_points = 0
if files_affected >= 2 && files_affected <= 5: scope_points = 1
if files_affected >= 6 && files_affected <= 15: scope_points = 2
if files_affected >= 16: scope_points = 3
```

### Step 3: Calculate Dependencies Points (0-2)

Count external dependencies involved.

**Scoring Rules**:
- **0 points**: No external dependencies
- **1 point**: 1-2 external dependencies
- **2 points**: 3+ external dependencies

**Logic**:
```
dep_count = dependencies_involved.length

if dep_count === 0: dependencies_points = 0
if dep_count >= 1 && dep_count <= 2: dependencies_points = 1
if dep_count >= 3: dependencies_points = 2
```

### Step 4: Calculate Error Clarity Points (0-2)

Analyze error clarity and type.

**Scoring Rules**:
- **0 points**: Clear error (has stack trace with line numbers, specific error message, TypeError/ReferenceError/SyntaxError)
- **1 point**: Vague error (user description like "doesn't work", "broken", "slow", no stack trace, generic error)
- **2 points**: Behavioral issue (no error message, intermittent issue like "sometimes fails", performance degradation, UI/UX description)

**Clear Error Indicators**:
- Has stack_trace with line numbers
- Error message mentions specific variable/function
- TypeScript error codes (TS####)
- TypeError, ReferenceError, SyntaxError, etc.

**Vague Error Indicators**:
- User description contains "doesn't work", "broken", "not working"
- No stack trace provided
- Generic error messages without specifics

**Behavioral Issue Indicators**:
- No error message at all
- Contains "intermittent", "sometimes", "randomly"
- Performance-related ("slow", "laggy", "freezes")
- UI/UX descriptions without technical errors

**Logic**:
```
has_stack_trace = stack_trace is not null and stack_trace.length > 0
has_specific_error = error_patterns contains specific error codes or types
is_behavioral = user_description contains behavioral keywords
is_vague = user_description contains vague keywords

if has_stack_trace && has_specific_error: error_clarity_points = 0
else if is_behavioral: error_clarity_points = 2
else if is_vague: error_clarity_points = 1
else: error_clarity_points = 1
```

### Step 5: Calculate Domain Knowledge Points (0-3)

Analyze technical domain complexity.

**Scoring Rules**:
- **0 points**: Common patterns (CRUD operations, REST APIs, auth with JWT/sessions, form validation, basic routing, simple state management)
- **1 point**: Framework-specific (Next.js SSR/ISR/middleware, React hooks/context/portals, tRPC, Prisma, GraphQL, Tailwind advanced features)
- **2 points**: Complex domain (WebRTC, WebSockets, real-time sync, cryptography, encryption, security tokens, payment processing, webhooks, database transactions, migrations)
- **3 points**: Cutting-edge (experimental browser APIs, beta framework versions, AI/ML integration, vector databases, bleeding-edge tech)

**Analysis Strategy**:
1. Examine `dependencies_involved` for known libraries
2. Analyze `user_description` for technical terms
3. Check `error_patterns` for domain-specific errors

**Common Pattern Libraries/Terms**:
- express, koa, fastify (basic REST)
- bcrypt, passport, jsonwebtoken (standard auth)
- joi, yup, zod (validation)

**Framework-Specific Libraries/Terms**:
- next, react (with hooks/SSR mentions)
- trpc, prisma, graphql
- tailwindcss, styled-components

**Complex Domain Libraries/Terms**:
- simple-peer, webrtc, socket.io
- crypto, bcryptjs, jose
- stripe, paypal
- knex migrations, typeorm

**Cutting-Edge Libraries/Terms**:
- @vercel/ai, langchain
- experimental APIs mentioned
- beta/canary versions

**Logic**:
```
if any cutting_edge_library in dependencies: domain_points = 3
else if any complex_domain_library in dependencies: domain_points = 2
else if any framework_specific_library in dependencies: domain_points = 1
else: domain_points = 0
```

### Step 6: Calculate Total Score

Sum all factor scores.

**Formula**:
```
complexity_score = scope_points + dependencies_points + error_clarity_points + domain_points
```

**Range**: 0-10

### Step 7: Determine Complexity Level

Map score to complexity level.

**Levels**:
- **Trivial** (0-3): Simple, straightforward fix
- **Moderate** (4-6): Standard workflow
- **High** (7-8): Requires research first
- **Critical** (9-10): Deep research, consider breaking down

**Logic**:
```
if score >= 0 && score <= 3: level = "trivial"
if score >= 4 && score <= 6: level = "moderate"
if score >= 7 && score <= 8: level = "high"
if score >= 9 && score <= 10: level = "critical"
```

### Step 8: Recommend Workflow Approach

Determine approach based on complexity level.

**Approach Logic**:

**Trivial (0-3)**:
- `recommended_approach`: "direct-fix"
- `requires_research`: false
- `estimated_time`: "<30 minutes"
- `parallelizable`: true
- `recommendations`: Focus on quick fix, add tests

**Moderate (4-6)**:
- `recommended_approach`: "standard-workflow"
- `requires_research`: false
- `estimated_time`: "30 minutes - 2 hours"
- `parallelizable`: true
- `recommendations`: Standard fix workflow, validate with Context7, add tests

**High (7-8)**:
- `recommended_approach`: "research-first"
- `requires_research`: true
- `estimated_time`: "2-4 hours"
- `parallelizable`: false
- `recommendations`: Research phase required, generate hypotheses, use Context7, create test plan

**Critical (9-10)**:
- `recommended_approach`: "deep-research"
- `requires_research`: true
- `estimated_time`: ">4 hours"
- `parallelizable`: false
- `recommendations`: Deep research required, consider breaking down, extensive Context7 usage, phased implementation

### Step 9: Generate Reasoning

Create human-readable explanation.

**Format**:
```
"{scope_description}, {dependencies_description}, {error_description}, {domain_description}"
```

**Examples**:
- "Single file, no dependencies, clear error with line number, common pattern"
- "Multiple files (8), complex dependencies (WebRTC, Socket.io), behavioral issue (intermittent connection drops), complex domain (real-time communication)"

### Step 10: Return Structured Result

Return complete complexity analysis.

**Expected Output**:
```json
{
  "complexity_score": 7,
  "complexity_level": "high",
  "breakdown": {
    "scope_points": 2,
    "dependencies_points": 2,
    "error_clarity_points": 2,
    "domain_points": 1
  },
  "requires_research": true,
  "recommended_approach": "research-first",
  "reasoning": "Multiple files affected (8), complex dependencies (WebRTC, Socket.io), behavioral issue (intermittent connection drops)",
  "estimated_time": "2-4 hours",
  "parallelizable": false,
  "recommendations": [
    "Start with research phase to generate hypotheses",
    "Analyze logs for connection drop patterns",
    "Review WebRTC and Socket.io documentation via Context7",
    "Create test plan before implementing fixes"
  ]
}
```

**Output Fields**:
- `complexity_score`: Total score (0-10)
- `complexity_level`: Level category (trivial|moderate|high|critical)
- `breakdown`: Individual factor scores
- `requires_research`: Boolean flag for research phase
- `recommended_approach`: Workflow approach to use
- `reasoning`: Human-readable explanation
- `estimated_time`: Time estimate string
- `parallelizable`: Whether task can be parallelized
- `recommendations`: Array of actionable recommendations

## Error Handling

- **Missing Required Fields**: Return error listing missing fields
- **Invalid Type**: Return error listing valid types
- **Invalid files_affected**: Must be >= 1, return error if 0 or negative
- **Invalid dependencies_involved**: Must be array, return error if not
- **Empty Context**: Return error requesting all context fields

## Examples

### Example 1: Simple TypeError (Trivial - Score 0)

**Input**:
```json
{
  "type": "bug",
  "title": "TypeError in UserProfile component",
  "context": {
    "files_affected": 1,
    "dependencies_involved": [],
    "error_patterns": ["TypeError: Cannot read property 'name' of undefined"],
    "user_description": "App crashes when viewing user profile",
    "stack_trace": "UserProfile.tsx:45"
  }
}
```

**Scoring Breakdown**:
- Scope: 1 file = 0 points
- Dependencies: 0 dependencies = 0 points
- Error Clarity: Has stack trace + specific TypeError = 0 points
- Domain: No special libraries = 0 points
- **Total: 0 points (Trivial)**

**Output**:
```json
{
  "complexity_score": 0,
  "complexity_level": "trivial",
  "breakdown": {
    "scope_points": 0,
    "dependencies_points": 0,
    "error_clarity_points": 0,
    "domain_points": 0
  },
  "requires_research": false,
  "recommended_approach": "direct-fix",
  "reasoning": "Single file, no dependencies, clear error with line number, common pattern",
  "estimated_time": "<30 minutes",
  "parallelizable": true,
  "recommendations": [
    "Add null check for user object",
    "Verify data loading logic",
    "Add unit test for undefined user case"
  ]
}
```

### Example 2: WebRTC Connection Issue (Critical - Score 9)

**Input**:
```json
{
  "type": "bug",
  "title": "WebRTC connection drops after 5 minutes",
  "context": {
    "files_affected": 8,
    "dependencies_involved": ["simple-peer", "socket.io-client", "webrtc-adapter"],
    "error_patterns": ["connection intermittently fails"],
    "user_description": "Video calls disconnect randomly after ~5 minutes, no error message in console",
    "stack_trace": null
  }
}
```

**Scoring Breakdown**:
- Scope: 8 files = 2 points
- Dependencies: 3 dependencies = 2 points
- Error Clarity: No error message, behavioral issue = 2 points
- Domain: WebRTC/real-time = 3 points (cutting-edge real-time communication)
- **Total: 9 points (Critical)**

**Output**:
```json
{
  "complexity_score": 9,
  "complexity_level": "critical",
  "breakdown": {
    "scope_points": 2,
    "dependencies_points": 2,
    "error_clarity_points": 2,
    "domain_points": 3
  },
  "requires_research": true,
  "recommended_approach": "deep-research",
  "reasoning": "Multiple files (8), complex dependencies (WebRTC stack), behavioral issue with no errors, cutting-edge domain (real-time communication)",
  "estimated_time": ">4 hours",
  "parallelizable": false,
  "recommendations": [
    "RESEARCH PHASE REQUIRED before attempting fixes",
    "Analyze WebRTC connection logs and state transitions",
    "Generate hypotheses: ICE timeout, TURN server issue, socket reconnection race condition",
    "Query Context7 for WebRTC connection lifecycle best practices",
    "Create isolated test environment to reproduce issue",
    "Consider breaking into subtasks: ICE troubleshooting, socket sync, TURN config"
  ]
}
```

### Example 3: React Hook Dependency (Moderate - Score 4)

**Input**:
```json
{
  "type": "bug",
  "title": "Missing dependency in useEffect",
  "context": {
    "files_affected": 3,
    "dependencies_involved": ["react"],
    "error_patterns": ["ESLint exhaustive-deps warning"],
    "user_description": "ESLint warning about missing dependency in effect hook",
    "stack_trace": null
  }
}
```

**Scoring Breakdown**:
- Scope: 3 files = 1 point
- Dependencies: 1 dependency = 1 point
- Error Clarity: Vague (no stack trace, ESLint warning) = 1 point
- Domain: React hooks = 1 point (framework-specific)
- **Total: 4 points (Moderate)**

**Output**:
```json
{
  "complexity_score": 4,
  "complexity_level": "moderate",
  "breakdown": {
    "scope_points": 1,
    "dependencies_points": 1,
    "error_clarity_points": 1,
    "domain_points": 1
  },
  "requires_research": false,
  "recommended_approach": "standard-workflow",
  "reasoning": "Few files (3), React framework-specific, semi-clear error (ESLint warning)",
  "estimated_time": "30 minutes - 2 hours",
  "parallelizable": true,
  "recommendations": [
    "Validate with Context7 for React 18 best practices",
    "Add missing dependencies or use ESLint disable with justification",
    "Review hook for potential stale closure issues",
    "Add unit tests for effect behavior"
  ]
}
```

### Example 4: Performance Issue (High - Score 7)

**Input**:
```json
{
  "type": "performance",
  "title": "Dashboard page loads slowly",
  "context": {
    "files_affected": 12,
    "dependencies_involved": ["react", "chart.js"],
    "error_patterns": [],
    "user_description": "Dashboard takes 5-10 seconds to load, no errors but very slow",
    "stack_trace": null
  }
}
```

**Scoring Breakdown**:
- Scope: 12 files = 2 points
- Dependencies: 2 dependencies = 1 point
- Error Clarity: Behavioral (performance issue, no errors) = 2 points
- Domain: React + Chart.js = 2 points (complex domain - performance optimization)
- **Total: 7 points (High)**

**Output**:
```json
{
  "complexity_score": 7,
  "complexity_level": "high",
  "breakdown": {
    "scope_points": 2,
    "dependencies_points": 1,
    "error_clarity_points": 2,
    "domain_points": 2
  },
  "requires_research": true,
  "recommended_approach": "research-first",
  "reasoning": "Multiple files (12), chart rendering dependencies, behavioral issue (slow performance), complex domain (performance optimization)",
  "estimated_time": "2-4 hours",
  "parallelizable": false,
  "recommendations": [
    "Start with research phase: profile rendering performance",
    "Use React DevTools Profiler to identify slow components",
    "Analyze Chart.js rendering patterns via Context7",
    "Generate hypotheses: unnecessary re-renders, large datasets, missing memoization",
    "Create performance benchmark tests before optimizing"
  ]
}
```

### Example 5: Error Case - Missing Required Fields

**Input**:
```json
{
  "type": "bug",
  "title": "Some bug",
  "context": {
    "files_affected": 1
  }
}
```

**Output**:
```json
{
  "error": true,
  "message": "Missing required context fields: dependencies_involved, error_patterns, user_description",
  "required_fields": [
    "context.files_affected",
    "context.dependencies_involved",
    "context.error_patterns",
    "context.user_description"
  ]
}
```

## Validation

- [ ] Calculates scope points correctly for all file ranges
- [ ] Calculates dependency points correctly
- [ ] Correctly identifies error clarity (clear vs vague vs behavioral)
- [ ] Correctly identifies domain complexity
- [ ] Maps total score to correct complexity level
- [ ] Recommends correct approach for each level
- [ ] Provides accurate time estimates
- [ ] Generates meaningful recommendations
- [ ] Handles missing fields gracefully
- [ ] Returns structured output in expected format

## Integration with Agents

### Orchestrator Usage

Use `calculate-complexity-score` Skill after bug detection to route workflows:

```markdown
## Phase 1.5: Complexity Analysis

For EACH bug detected:

1. Use calculate-complexity-score Skill
2. If requires_research == true:
   - Create research plan
   - Signal readiness for research-agent
3. If requires_research == false:
   - Create fixing plan
   - Signal readiness for bug-fixer
4. Update report with complexity categorization
```

### Worker Self-Assessment

Workers can use this skill to self-assess task complexity:

```markdown
## Step 1: Assess Task Complexity

Use calculate-complexity-score Skill to determine if additional research is needed before implementation.

If complexity_score >= 7:
  - Request research phase from orchestrator
  - Do not proceed with direct fix
```

### Report Categorization

```markdown
## Bugs by Complexity

### Critical Complexity (9-10)
- Bug #7: WebRTC connection drops (score: 9, est: >4h)
  - Approach: deep-research
  - Status: Queued for research-agent

### High Complexity (7-8)
- Bug #3: Performance degradation (score: 7, est: 2-4h)
  - Approach: research-first
  - Status: Queued for research-agent

### Moderate Complexity (4-6)
- Bug #2: Form validation (score: 5, est: 1-2h)
  - Approach: standard-workflow
  - Status: Queued for bug-fixer

### Trivial (0-3)
- Bug #1: TypeError (score: 0, est: <30min)
  - Approach: direct-fix
  - Status: Queued for bug-fixer
```

## Notes

- This is a pure logic skill (no tools required)
- Scoring is deterministic and reproducible
- Designed to complement Context7-driven research workflows
- Domain points may need adjustment based on team expertise
- Consider local team context when applying recommendations
- Score thresholds can be tuned per project needs
- Breaking down critical tasks (9-10) often leads to better outcomes
