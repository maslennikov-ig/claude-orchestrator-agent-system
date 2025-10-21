# Agent Orchestration Rules

> **IMPORTANT**: This file overrides default Claude Code behavior. Follow these rules strictly.

## PART 1: PRIME DIRECTIVES

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
# After T001-T006 task completion:
ls .claude/skills/validate-context7-availability/  # Should exist
ls .claude/skills/calculate-complexity-score/      # Should exist
```

## Project Conventions

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

## Agent Selection

**Use Orchestrator** when:
- Coordinating multiple workers
- Multi-phase workflows
- Need quality gates

**Use Worker** when:
- Single domain task (bug-fixing, security scan)
- Implement from plan file
- Generate report

**Use Skill** when:
- Reusable utility function
- No state/context needed
- <100 lines logic

## Orchestrator Pattern

**Flow**:
1. Create plan file → `.tmp/current/plans/.{workflow}-plan.json`
2. Signal readiness to user
3. Return control (main session auto-invokes worker)
4. Worker completes and returns
5. Orchestrator validates output from `.tmp/current/reports/`
6. Repeat for next phase

**Must Do**:
- Create plan files before signaling readiness
- Track progress via TodoWrite (mark in_progress → completed)
- Validate worker outputs at quality gates
- Report status to user
- Handle errors with rollback instructions

**Prohibitions**:
- NO Task tool to invoke subagents
- NO implementation work
- NO skip quality gate validations

## Worker Pattern

**Must Do**:
- Read plan file first
- Execute domain-specific work
- Validate work internally
- Generate structured report
- Return to main session

**Prohibitions**:
- NO invoke other agents
- NO skip report generation
- NO report success without validation

## Plan File Format

**Location**: `.tmp/current/plans/.{workflow}-plan.json`

```json
{
  "phase": 1,
  "config": {},
  "validation": {
    "required": ["criterion1"],
    "optional": ["criterion2"]
  },
  "nextAgent": "worker-name"
}
```

## Report File Format

**Location**: `.tmp/current/reports/{task}-report.md` (temporary) or `docs/reports/{domain}/{YYYY-MM}/{date}-{task}-report.md` (permanent)

**Naming**: `{task}-report.md` (temporary) or `{date}-{task}-report.md` (permanent)

**Required Sections**:
1. Header: `# {ReportType} Report` + Generated timestamp + Status
2. Executive Summary: Key metrics, validation status
3. Detailed Findings: Changes, issues, actions
4. Validation Results: `PASS/FAIL Type Check/Build/Tests` + Overall Status
5. Next Steps

## Quality Gates

**Blocking Criteria** (must pass):
- Report file exists and well-formed
- Validation status is PASSED
- Core metrics meet thresholds
- No critical errors

**If Blocking Fails**:
1. STOP workflow
2. Report failures to user
3. Provide corrective actions
4. Ask user: "Fix issues or skip validation? (fix/skip)"

**Non-Blocking Criteria** (warnings only):
- Performance benchmarks
- Best practices
- Documentation

## TodoWrite Format

```json
{
  "content": "Phase 1: Discovery and analysis",
  "status": "in_progress",
  "activeForm": "Discovering and analyzing codebase"
}
```

**Usage**:
- Mark phase `in_progress` BEFORE starting
- Mark phase `completed` IMMEDIATELY after finishing
- Mark phase `failed` if blocked

## File Locations

- Documentation → `docs/`
- Temporary plans → `.tmp/current/plans/.{workflow}-plan.json`
- Temporary reports → `.tmp/current/reports/{report-name}.md`
- Permanent reports → `docs/reports/{domain}/{YYYY-MM}/{date}-{report-name}.md`
- Agents → `.claude/agents/{domain}/{orchestrators|workers}/`

**IMPORTANT**: Workers MUST write:
- Plan files → `.tmp/current/plans/` (orchestrators create here)
- Temporary reports → `.tmp/current/reports/` (workers write here first)
- Changes logs → `.tmp/current/changes/`
- File backups → `.tmp/current/backups/`

Only permanent reports go to `docs/reports/` after orchestrator validation.

## Automatic Invocation

Agent `description` must include:
- "Use proactively" or "MUST BE USED"
- When agent should be invoked
- Specific capabilities

## MCP Server Configuration

**Two-tier strategy for token efficiency:**

### Default: `.mcp.json` (Minimal)
- `context7` - Library docs (MANDATORY for workers)
- `server-sequential-thinking` - Sequential reasoning

Use for: Daily development, most agent workflows

### Extended: `.mcp.full.json` (Full)
Includes above + specialized servers:
- `playwright` - Browser automation
- `supabase` / `supabase-legacy` - Supabase management
- `n8n-workflows` - n8n docs
- `n8n-mcp` - n8n instance control
- `shadcn` - shadcn/ui components

Use for: Supabase RLS tasks, browser testing, n8n automation, shadcn implementation

**Token savings:** ~600-3000 tokens per conversation with minimal config

### Switch Configs
```bash
# Enable full
mv .mcp.json .mcp.minimal.json && mv .mcp.full.json .mcp.json

# Revert
mv .mcp.json .mcp.full.json && mv .mcp.minimal.json .mcp.json
```

### Worker MCP Requirements

**bug-hunter**:
- MUST use Context7 (`mcp__context7__*`) to validate patterns before flagging bugs
- Use `gh` CLI via Bash for GitHub issues (not MCP)

**security-scanner**:
- MUST use Context7 for security best practices
- Use Supabase MCP only if `.mcp.full.json` active

**dependency-auditor**:
- Use npm audit (standard tool)
- Use `gh` CLI via Bash for package health

### Fallback Strategy

If MCP unavailable:
1. Log warning in report
2. Continue with reduced functionality
3. Mark findings as "requires MCP verification"

## Reference Docs

- Architecture: `docs/Agents Ecosystem/ARCHITECTURE.md` (canonical)
- Quality Gates: `docs/Agents Ecosystem/QUALITY-GATES-SPECIFICATION.md`
- Report Template: `docs/Agents Ecosystem/REPORT-TEMPLATE-STANDARD.md`
- Archived Docs: `docs/Agents Ecosystem/archive/` (deprecated, reference only)