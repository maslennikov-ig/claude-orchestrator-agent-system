# Contributing to create-claude-agents

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/YOUR-USERNAME/create-claude-agents
cd create-claude-agents
npm install
npm link
```

## Testing

```bash
# Test installation
npm test

# Test in specific directory
create-claude-agents -y --dir /tmp/test-project
```

## Adding New Agents

1. Add agent to `templates/.claude/agents/`
2. Update README.md with agent count
3. Test installation
4. Submit PR

## Updating Documentation

Documentation in `templates/docs/` should follow existing format.

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Test: `npm test`
4. Publish: `npm publish`

## Questions?

Open an issue on GitHub.
