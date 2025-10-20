# create-claude-agents

Scaffold production-ready AI agent ecosystem for Claude Code.

## Quick Start

```bash
npx create-claude-agents
```

## Features

- 32 AI agents (orchestrators + workers)
- 14 reusable skills
- 7 slash commands
- Quality gates + validation
- Token-efficient MCP configs

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

- `.claude/` - 32 agents, 14 skills, 7 commands
- `CLAUDE.md` - Project conventions
- `.mcp.json` - Minimal MCP config (saves tokens)
- `docs/` - Architecture, quality gates, templates
- `.tmp/` - Temporary files structure

## Commands

```bash
/health-bugs        # Bug detection + fixing
/health-security   # Security audit + fixes
/health-cleanup    # Dead code removal
/health-deps       # Dependency audit
```

## Architecture

Based on Anthropic multi-agent research:
- Return Control Pattern
- 2-level hierarchy (L1/L2)
- Quality gates
- Iterative cycles

## License

MIT
