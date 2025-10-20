#!/usr/bin/env node
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

async function copyRecursive(src, dest) {
  const stats = await stat(src);
  if (stats.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);
    for (const entry of entries) {
      await copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}

async function install(options) {
  const targetDir = resolve(options.dir || './');
  console.log(chalk.cyan('\n📦 Installing Claude Agents...\n'));

  // Copy .claude
  console.log(chalk.gray('→ Copying agents...'));
  await copyRecursive(join(TEMPLATES_DIR, '.claude'), join(targetDir, '.claude'));
  console.log(chalk.green('✓ Agents installed'));

  // Copy CLAUDE.md
  await copyFile(join(TEMPLATES_DIR, 'CLAUDE.md'), join(targetDir, 'CLAUDE.md'));
  console.log(chalk.green('✓ CLAUDE.md created'));

  // Copy MCP
  await copyFile(join(TEMPLATES_DIR, '.mcp.json'), join(targetDir, '.mcp.json'));
  if (options.mcp === 'full' || options.mcp === 'both') {
    await copyFile(join(TEMPLATES_DIR, '.mcp.full.json'), join(targetDir, '.mcp.full.json'));
  }
  console.log(chalk.green('✓ MCP config created'));

  // Copy docs
  if (options.docs) {
    await copyRecursive(join(TEMPLATES_DIR, 'docs'), join(targetDir, 'docs'));
    console.log(chalk.green('✓ Documentation installed'));
  }

  // Create .tmp
  const tmpDirs = ['.tmp/current/plans', '.tmp/current/changes', '.tmp/current/backups/.rollback', '.tmp/current/locks', '.tmp/archive'];
  for (const dir of tmpDirs) {
    await mkdir(join(targetDir, dir), { recursive: true});
  }
  console.log(chalk.green('✓ .tmp/ structure created'));

  console.log(chalk.bold.green('\n✅ Installation complete!\n'));
  console.log(chalk.gray('Run ') + chalk.white('/health-bugs') + chalk.gray(' to test\n'));
}

program
  .name('create-claude-agents')
  .description('Scaffold Claude Code AI agent ecosystem')
  .version('1.0.0')
  .option('-d, --dir <path>', 'Installation directory', './')
  .option('-m, --mcp <type>', 'MCP config: minimal, full, or both', 'minimal')
  .option('--skip-docs', 'Skip documentation')
  .option('-y, --yes', 'Skip prompts')
  .action(async (options) => {
    try {
      await install({ dir: options.dir, mcp: options.mcp, docs: !options.skipDocs });
    } catch (error) {
      console.error(chalk.red('\n❌ Failed:'), error.message);
      process.exit(1);
    }
  });

program.parse();
