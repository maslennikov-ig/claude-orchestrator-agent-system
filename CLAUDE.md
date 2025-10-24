# create-claude-agents — Development Guide

> **Purpose**: Instructions for developing the `create-claude-agents` NPM package generator
> **Audience**: Contributors working ON the generator itself (not users of generated projects)

**Note**: This file is for generator development. For Behavioral OS used in generated projects, see `templates/CLAUDE.md`.

---

## Project Structure

```
create-claude-agents/
│
├── 📦 NPM Package (published to npm):
│   ├── bin/                    # CLI entry point
│   ├── package.json            # NPM package metadata
│   ├── README.md               # User-facing documentation
│   └── CHANGELOG.md            # Version history
│
├── 📁 templates/               # Source of truth (copied to generated projects)
│   ├── .claude/                # Agents, skills, commands
│   │   ├── agents/             # 33 AI agents (orchestrators + workers)
│   │   ├── skills/             # 18 reusable skills
│   │   └── commands/           # 8 slash commands
│   ├── docs/                   # Documentation
│   │   └── Agents Ecosystem/   # Architecture, guides, specifications
│   ├── CLAUDE.md               # Behavioral Operating System (for agents)
│   ├── .mcp.json               # Minimal MCP config (default)
│   └── .mcp.full.json          # Full MCP config (optional)
│
├── 📁 .claude/                 # Local working copy (auto-synced from templates/)
│   └── [Same structure as templates/.claude/]
│
├── 📁 scripts/                 # Development utilities
│   ├── sync-local-agents.sh   # Sync templates/ → .claude/
│   └── README.md              # Sync documentation
│
└── 📁 dev/                     # Internal development files (NOT in git)
    ├── specs/                  # Task specifications (T001-T006)
    ├── IMPLEMENTATION-LOG.md   # Development progress log
    └── HANDOFF-PROMPT.md       # Session handoff notes
```

---

## Development Workflow

### 1. Working with Templates

**Rule**: ALWAYS modify files in `templates/`, NEVER in `.claude/` directly.

```bash
# ✅ CORRECT
code templates/.claude/skills/my-new-skill/SKILL.md

# ❌ WRONG
code .claude/skills/my-new-skill/SKILL.md  # This is auto-generated!
```

**Why**: `templates/` is the source of truth. Changes here are committed to git and distributed via NPM.

### 2. Auto-Sync System

After committing changes to `templates/`, the git post-commit hook automatically syncs to `.claude/`:

```bash
git add templates/.claude/skills/new-skill/
git commit -m "feat: Add new-skill"
# → Git hook runs: scripts/sync-local-agents.sh
# → Syncs templates/.claude/ → .claude/
# → You can now use the skill in development!
```

**Manual sync** (if needed):
```bash
npm run sync:agents
```

### 3. Testing Changes

After modifying templates and syncing:

```bash
# Test the skill/agent locally
# Claude Code will read from .claude/ (synced copy)

# Verify sync worked
ls .claude/skills/new-skill/  # Should exist
diff templates/.claude/skills/new-skill/SKILL.md .claude/skills/new-skill/SKILL.md  # Should be identical
```

### 4. Adding New Agents

```bash
# 1. Create in templates/
mkdir -p templates/.claude/agents/domain/workers/
code templates/.claude/agents/domain/workers/new-agent.md

# 2. Follow existing patterns (see templates/.claude/agents/health/workers/)

# 3. Commit
git add templates/.claude/agents/domain/workers/new-agent.md
git commit -m "feat: Add new-agent worker"

# 4. Auto-sync runs → Available in .claude/
```

### 5. Adding New Skills

```bash
# 1. Create in templates/
mkdir -p templates/.claude/skills/new-skill/
code templates/.claude/skills/new-skill/SKILL.md

# 2. Follow SKILL.md format (see existing skills)

# 3. Commit
git add templates/.claude/skills/new-skill/
git commit -m "feat: Add new-skill"

# 4. Auto-sync runs → Available in .claude/
```

### 6. Adding New Commands

```bash
# 1. Create in templates/
code templates/.claude/commands/new-command.md

# 2. Follow existing command patterns

# 3. Commit
git add templates/.claude/commands/new-command.md
git commit -m "feat: Add /new-command"

# 4. Auto-sync runs → Available via /new-command
```

---

## Git Workflow

### Commit Message Format

Follow Conventional Commits:

```bash
# Features
git commit -m "feat: Add Context7 integration"
git commit -m "feat: Add complexity scoring system"

# Fixes
git commit -m "fix: Correct type-check validation logic"

# Documentation
git commit -m "docs: Update Context7 integration guide"

# Chores
git commit -m "chore: Update .gitignore"
git commit -m "chore: Bump version to 2.0.0"
```

### What Gets Committed

**✅ Commit to git**:
```
templates/.claude/          # Agents, skills, commands (source of truth)
templates/docs/             # Documentation
templates/CLAUDE.md         # Behavioral OS for agents
templates/.mcp.json         # MCP configs
bin/                        # CLI
package.json                # NPM metadata
README.md                   # User docs
CLAUDE.md                   # This file (dev guide)
scripts/                    # Sync scripts
```

**❌ Do NOT commit** (in .gitignore):
```
.claude/                    # Auto-synced copy
docs/                       # Copy of templates/docs/
.mcp.json                   # Local MCP config
.mcp.full.json              # Local MCP config
dev/                        # Internal dev files
.tmp/                       # Temporary files
```

### Before Push

1. **Verify git status is clean**:
   ```bash
   git status
   # Should show only templates/, scripts/, package.json, etc.
   # Should NOT show .claude/, docs/, dev/
   ```

2. **Verify sync worked**:
   ```bash
   ls .claude/skills/  # Should match templates/.claude/skills/
   ```

3. **Run release** (auto-bumps version, updates CHANGELOG):
   ```bash
   /push patch   # For bug fixes (1.0.0 → 1.0.1)
   /push minor   # For new features (1.0.0 → 1.1.0)
   /push major   # For breaking changes (1.0.0 → 2.0.0)
   ```

---

## Release Process

Use `/push` command for automated releases:

```bash
# For bug fixes
/push patch

# For new features (T001-T004 done)
/push minor

# For breaking changes
/push major
```

**What it does**:
1. Analyzes commits since last release
2. Auto-detects version bump type
3. Updates package.json version
4. Generates CHANGELOG entry
5. Creates git commit + tag
6. Pushes to GitHub

**Manual process** (if needed):
```bash
# See .claude/scripts/release.sh for details
bash .claude/scripts/release.sh --yes
```

---

## Testing Generator

### Local Testing

```bash
# 1. Build package
npm pack
# → Creates create-claude-agents-X.X.X.tgz

# 2. Test in temporary directory
mkdir /tmp/test-project
cd /tmp/test-project
npx /path/to/create-claude-agents-X.X.X.tgz

# 3. Verify generated project
ls .claude/agents/     # Should have all agents
ls .claude/skills/     # Should have all skills
cat CLAUDE.md          # Should be Behavioral OS (from templates/CLAUDE.md)
```

### Testing After Changes

```bash
# After modifying templates/.claude/skills/new-skill/

# 1. Commit (triggers sync)
git commit -m "feat: Add new-skill"

# 2. Pack
npm pack

# 3. Generate test project
cd /tmp
npx /path/to/tgz

# 4. Verify new-skill exists
ls .claude/skills/new-skill/
```

---

## Architecture Notes

### Two CLAUDE.md Files

**This file (`CLAUDE.md` in root)**:
- Instructions for developing create-claude-agents
- Workflow, testing, release process
- Committed to git

**templates/CLAUDE.md**:
- Behavioral Operating System for agents
- Prime Directives, Contracts, Fallbacks
- Copied to generated projects
- Committed to git

**Why separate**: Different audiences and purposes.

### Sync System

**Why sync exists**:
- `templates/` = source of truth (committed to git, published to npm)
- `.claude/` = working copy (for development with Claude Code)
- Sync keeps them in sync automatically

**How it works**:
```bash
# Git post-commit hook (.git/hooks/post-commit)
if [commit touches templates/]; then
  scripts/sync-local-agents.sh
fi
```

**What gets synced**:
- `templates/.claude/` → `.claude/`
- `templates/docs/` → `docs/`
- (templates/CLAUDE.md stays in templates/ - NOT synced to root)

### Directory Purposes

- **templates/**: Source of truth (for generator, in git)
- **.claude/**: Working copy (for dev, NOT in git)
- **dev/**: Internal notes (NOT in git)
- **bin/**: CLI tool (in git)
- **scripts/**: Dev utilities (in git)

---

## Common Tasks

### Update Behavioral OS (templates/CLAUDE.md)

```bash
# 1. Edit
code templates/CLAUDE.md

# 2. Commit
git add templates/CLAUDE.md
git commit -m "docs: Update Behavioral OS Prime Directives"

# 3. Test in generated project
npm pack
cd /tmp/test && npx /path/to/tgz
cat CLAUDE.md  # Should have your changes
```

### Update Documentation

```bash
# 1. Edit in templates/
code templates/docs/Agents\ Ecosystem/ARCHITECTURE.md

# 2. Commit
git add templates/docs/
git commit -m "docs: Update architecture guide"

# 3. Sync runs automatically
# 4. Local copy appears in docs/
```

### Add Context7 Query Pattern

```bash
# 1. Update worker
code templates/.claude/agents/health/workers/bug-hunter.md

# 2. Add Context7 query example
# (See existing patterns in file)

# 3. Commit
git commit -m "feat: Add Context7 pattern for React hooks"
```

---

## Troubleshooting

### Sync didn't run after commit

```bash
# Manual sync
npm run sync:agents

# Verify git hook exists
ls -la .git/hooks/post-commit
```

### .claude/ is empty

```bash
# Re-run sync
npm run sync:agents

# Or reinstall (runs postinstall hook)
npm install
```

### Changes in .claude/ not in git

**This is correct!** `.claude/` is auto-generated and should NOT be committed.

Always edit `templates/.claude/` instead.

### Git shows .claude/ as untracked

```bash
# Verify .gitignore
cat .gitignore | grep ".claude"
# Should show: /.claude/

# If missing, add it
echo "/.claude/" >> .gitignore
```

---

## Resources

- **Architecture**: `templates/docs/Agents Ecosystem/ARCHITECTURE.md`
- **Context7 Guide**: `templates/docs/Agents Ecosystem/CONTEXT7-INTEGRATION-GUIDE.md`
- **Behavioral OS**: `templates/docs/Agents Ecosystem/BEHAVIORAL-OS-GUIDE.md`
- **Quality Gates**: `templates/docs/Agents Ecosystem/QUALITY-GATES-SPECIFICATION.md`
- **Report Templates**: `templates/docs/Agents Ecosystem/REPORT-TEMPLATE-STANDARD.md`

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code of conduct
- Pull request process
- Style guidelines

---

## Questions?

- Open an issue on GitHub
- Check existing docs in `templates/docs/`
- Review CLAUDE.md behavioral examples

---

**Remember**:
- Work in `templates/` (source of truth)
- Commit triggers sync to `.claude/` (automatic)
- Test with `npm pack` before release
- Use `/push` for releases
