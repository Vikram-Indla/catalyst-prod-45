/**
 * Obsidian Handover Skill Implementation
 *
 * Handles user prompting and branch context detection for /obsidian commands.
 * Delegates to obsidian-manager.sh for actual handover operations.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const OBSIDIAN_SCRIPT = path.join(PROJECT_DIR, '.claude/scripts/obsidian-manager.sh');

interface BranchInfo {
  name: string;
  id: string;
}

/**
 * Get current git branch
 */
function getCurrentBranch(): string | null {
  try {
    const branch = execSync(`git -C "${PROJECT_DIR}" branch --show-current`, {
      encoding: 'utf-8'
    }).trim();
    return branch && branch !== 'HEAD' ? branch : null;
  } catch {
    return null;
  }
}

/**
 * Extract branch ID from branch name (e.g., BAU-backlog-table-01 -> 01)
 */
function extractBranchId(branchName: string): string | null {
  const match = branchName.match(/-(\d{2})$/);
  return match ? match[1] : null;
}

/**
 * Validate branch name format
 */
function validateBranchName(branchName: string): boolean {
  // Format: {Project}-{SideMenu}-{Component}-{NN}
  // Example: BAU-backlog-table-01
  return /^[A-Z][a-zA-Z0-9]+-[a-z]+-[a-z]+-\d{2}$/.test(branchName);
}

/**
 * Prompt user for branch info if auto-detection fails
 */
async function promptForBranch(): Promise<BranchInfo> {
  // This would be called by the skill system with AskUserQuestion
  // For now, we'll return a placeholder that the skill wrapper will handle
  throw new Error(
    'PROMPT_USER_FOR_BRANCH\n' +
    'Current branch could not be auto-detected.\n' +
    'Please provide your branch name in format: {Project}-{SideMenu}-{Component}-{NN}\n' +
    'Example: BAU-backlog-table-01'
  );
}

/**
 * Save handover with auto-detection or user prompt
 */
async function saveHandover(progressArg?: string): Promise<void> {
  let branchName = getCurrentBranch();
  let branchId: string | null = null;

  // Try to auto-detect branch
  if (branchName && validateBranchName(branchName)) {
    branchId = extractBranchId(branchName);
  } else if (branchName) {
    // Branch exists but doesn't match format
    throw new Error(
      `Invalid branch name format: ${branchName}\n` +
      `Expected format: {Project}-{SideMenu}-{Component}-{NN}\n` +
      `Example: BAU-backlog-table-01`
    );
  } else {
    // No valid branch detected
    await promptForBranch();
    return;
  }

  if (!branchId) {
    throw new Error('Could not extract branch ID from branch name');
  }

  // Call obsidian-manager.sh
  const progress = progressArg || '50';
  const command = `bash "${OBSIDIAN_SCRIPT}" save "${branchName}" "${branchId}" "${progress}"`;

  try {
    const output = execSync(command, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
  } catch (error: any) {
    console.error(error.stdout || error.message);
    throw error;
  }
}

/**
 * Retrieve handover by branch ID
 */
async function retrieveHandover(branchId: string): Promise<void> {
  if (!branchId || !/^\d{2}$/.test(branchId)) {
    throw new Error(
      `Invalid branch ID: ${branchId}\n` +
      `Expected format: 01, 02, 03, etc.\n` +
      `Usage: /obsidian branch 01`
    );
  }

  const command = `bash "${OBSIDIAN_SCRIPT}" retrieve "${branchId}"`;

  try {
    const output = execSync(command, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
  } catch (error: any) {
    console.error(error.stdout || error.message);
    throw error;
  }
}

/**
 * List all handovers
 */
async function listHandovers(): Promise<void> {
  const command = `bash "${OBSIDIAN_SCRIPT}" list`;

  try {
    const output = execSync(command, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
  } catch (error: any) {
    console.error(error.stdout || error.message);
    throw error;
  }
}

/**
 * Delete (archive) handover
 */
async function deleteHandover(branchId: string): Promise<void> {
  if (!branchId || !/^\d{2}$/.test(branchId)) {
    throw new Error(
      `Invalid branch ID: ${branchId}\n` +
      `Expected format: 01, 02, 03, etc.`
    );
  }

  const command = `bash "${OBSIDIAN_SCRIPT}" delete "${branchId}"`;

  try {
    const output = execSync(command, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
  } catch (error: any) {
    console.error(error.stdout || error.message);
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'save':
        await saveHandover(args[1]);
        break;
      case 'branch':
        await retrieveHandover(args[1]);
        break;
      case 'list':
        await listHandovers();
        break;
      case 'delete':
        await deleteHandover(args[1]);
        break;
      default:
        console.log('Obsidian Handover Skill');
        console.log('');
        console.log('Usage:');
        console.log('  /obsidian save [progress]      # Save handover for current branch');
        console.log('  /obsidian branch <id>          # Retrieve handover by ID (01, 02, etc.)');
        console.log('  /obsidian list                 # List all saved handovers');
        console.log('  /obsidian delete <id>          # Archive a handover');
    }
  } catch (error: any) {
    if (error.message?.includes('PROMPT_USER_FOR_BRANCH')) {
      // This error signals that user prompting is needed
      // The skill wrapper will catch this and trigger AskUserQuestion
      throw error;
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
