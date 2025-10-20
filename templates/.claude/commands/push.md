---
description: Automated release management with version bumping and changelog updates
argument-hint: [patch|minor|major]
---

Execute the release automation script with auto-confirmation for Claude Code.

The script analyzes commits since last release, auto-detects version bump type, generates CHANGELOG, updates all package.json files, and pushes to GitHub.

For detailed documentation see docs/release-process.md

Run the script with --yes flag to skip confirmation prompt:

bash .claude/scripts/release.sh $ARGUMENTS --yes
