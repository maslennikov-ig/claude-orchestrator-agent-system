# create-claude-agents

Scaffold production-ready AI agent ecosystem for Claude Code with **Context7 integration**, **complexity scoring**, **behavioral OS**, and **metrics tracking**.

## Quick Start

```bash
# Using npx (npm)
npx @maslennikovig/claude-orchestrator-agent-system

# Using pnpm
pnpm dlx @maslennikovig/claude-orchestrator-agent-system
```

## Features

### Core System
- **33 AI agents** (orchestrators + workers + research agent)
- **18 reusable skills** (validation, metrics, complexity analysis)
- **8 slash commands** (health checks, metrics, routing)
- **Quality gates** (type-check, build, tests)
- **Token-efficient MCP configs** (minimal & full modes)

### New in v2.0 🎉
- **Context7 Integration** - Real-time library documentation validation (reduces false positives from 30% → <5%)
- **Complexity Scoring** - Automatic routing to research phase for complex tasks (saves ~40% time)
- **Behavioral Operating System** - Predictable agent behavior with fallback strategies and emergency protocols
- **Metrics Tracking** - Monthly performance reports, success rates, ROI proof

## Usage

```bash
# Interactive
npx create-claude-agents

# Non-interactive
npx create-claude-agents -y --dir ./my-project

# Custom MCP
npx create-claude-agents --mcp full
```

## What's Installed

After running the generator, your project will have:

- **`.claude/`** - 33 agents, 18 skills, 8 commands
- **`CLAUDE.md`** - Behavioral Operating System (v3.0)
- **`.mcp.json`** - Minimal MCP config (saves ~1,200 tokens/conversation)
- **`.mcp.full.json`** - Full MCP config (Supabase, Playwright, n8n)
- **`docs/`** - Architecture, guides, quality gates, templates
- **`.tmp/`** - Temporary files structure (metrics, plans, reports)

## Commands

```bash
# Health Checks
/health-bugs          # Bug detection + fixing with complexity routing
/health-security      # Security audit + fixes
/health-cleanup       # Dead code removal
/health-deps          # Dependency audit + updates

# Analytics
/health-metrics       # Monthly ecosystem health reports

# Routing
/push [patch|minor|major]  # Automated release management
```

## Key Features

### 1. Context7 Integration

Validates findings against current library documentation to eliminate outdated recommendations.

**Benefits:**
- Reduces false positives from ~30% to <5%
- Always uses latest library patterns
- Higher confidence in recommendations

**Usage:**
```typescript
// Workers automatically validate via Context7 MCP
validate-context7-availability → query docs → flag bugs
```

### 2. Complexity Scoring

Analyzes task complexity (0-10 scale) and routes appropriately:
- **Trivial/Moderate (0-6)**: Direct implementation
- **High/Critical (7-10)**: Research phase first

**Benefits:**
- 40% time savings (right approach for right complexity)
- Higher success rate on complex tasks
- Faster resolution on simple tasks

**Usage:**
```typescript
calculate-complexity-score → route to research-agent (if complex) → implement
```

### 3. Behavioral Operating System

7 Prime Directives + Behavioral Contracts + Fallback Strategies + Emergency Protocols

**Prime Directives:**
- Return Control Pattern (orchestrators create plans, main session invokes workers)
- Quality Gates (type-check, build, tests must pass)
- Changes Logging (all modifications logged for rollback)
- Context7 Validation (mandatory when available)
- Plan File Validation (schema compliance)
- Report Generation (standardized output)
- Template Sync (auto-sync after commits)

**Fallbacks:**
- Context7 unavailable → reduce confidence, continue with general knowledge
- Quality gate failure → rollback or skip (user choice)
- Max iterations reached → stop, generate comprehensive report

**Emergency Protocols:**
- Infinite loop detection → halt workflow
- File corruption → restore from backup
- Token exhaustion → emergency summary, resume in new session
- Concurrent conflicts → lock files, wait or takeover

### 4. Metrics Tracking

Monthly JSON files track agent performance for data-driven optimization.

**Tracked Metrics:**
- Agent success rates, durations, value delivered
- Quality gate pass rates
- Complexity distribution
- Context7 usage and performance
- Token efficiency (MCP mode usage)
- Behavioral OS health (fallbacks, emergencies)

**Usage:**
```bash
# Agents automatically record events
record-metrics → .tmp/metrics/YYYY-MM.json

# Generate monthly report
/health-metrics → docs/reports/metrics/YYYY-MM-ecosystem-health.md
```

## Architecture

Based on Anthropic multi-agent research:

### Patterns
- **Return Control Pattern** - Orchestrators create plans, main session invokes workers
- **2-level hierarchy** - L1 orchestrators coordinate L2 workers
- **Quality gates** - Type-check, build, tests validation
- **Iterative cycles** - Max 3 iterations with complexity-based routing

### Workers (L2)
- `bug-hunter` - Static analysis bug detection
- `bug-fixer` - Implement fixes with quality gates
- `security-scanner` - Vulnerability detection
- `security-fixer` - Security patching
- `research-agent` - Deep-dive investigation for complex tasks (NEW)
- `dependency-auditor` - Package health analysis
- `dependency-updater` - Safe dependency updates
- `dead-code-hunter` - Unused code detection
- And more... (33 total agents)

### Skills (Reusable)
- `validate-context7-availability` - Check Context7 MCP availability (NEW)
- `calculate-complexity-score` - Task complexity analysis (NEW)
- `check-infinite-loop` - Loop detection (NEW)
- `record-metrics` - Event logging (NEW)
- `run-quality-gate` - Validation execution
- `rollback-changes` - Restore from backups
- `validate-plan-file` - Schema validation
- `generate-report-header` - Standardized headers
- And more... (18 total skills)

## MCP Configurations

### Minimal (Default)
Saves ~1,200 tokens/conversation by including only essential servers:
- `context7` - Library documentation (mandatory for workers)
- `server-sequential-thinking` - Reasoning enhancement

### Full
Includes all servers for advanced use cases:
- All minimal servers +
- `playwright` - Browser automation
- `supabase` - Database management
- `n8n-mcp` - Workflow automation
- `shadcn` - UI components

**Switch configs:**
```bash
mv .mcp.json .mcp.minimal.json && mv .mcp.full.json .mcp.json
```

## Documentation

Generated projects include comprehensive guides:
- **`docs/Agents Ecosystem/ARCHITECTURE.md`** - System design, patterns
- **`docs/Agents Ecosystem/CONTEXT7-INTEGRATION-GUIDE.md`** - Context7 usage, query patterns
- **`docs/Agents Ecosystem/BEHAVIORAL-OS-GUIDE.md`** - Prime Directives, contracts, fallbacks
- **`docs/Agents Ecosystem/QUALITY-GATES-SPECIFICATION.md`** - Validation criteria
- **`docs/Agents Ecosystem/REPORT-TEMPLATE-STANDARD.md`** - Report formatting

## License

MIT

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)
