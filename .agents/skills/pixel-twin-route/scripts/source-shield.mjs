#!/usr/bin/env node
/**
 * Source Shield
 *
 * Snapshot hashes for source route artifacts before cloning, then verify
 * after cloning that nothing in the source was mutated.
 *
 * Usage:
 *   node .claude/skills/pixel-twin-route/scripts/source-shield.mjs snapshot <source-folder-or-file>
 *   node .claude/skills/pixel-twin-route/scripts/source-shield.mjs verify
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const STATE_DIR = path.resolve(".claude/skills/pixel-twin-route/.state");
const SNAPSHOT_FILE = path.join(STATE_DIR, "source-shield-snapshot.json");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
]);

const TRACKED_EXT = /\.(ts|tsx|js|jsx|css|scss|json|md|yml|yaml)$/;

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function walk(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Path does not exist: ${inputPath}`);
  }
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];

  const files = [];
  for (const entry of fs.readdirSync(inputPath)) {
    const full = path.join(inputPath, entry);
    const s = fs.statSync(full);
    if (s.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function snapshot(targetPath) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const files = walk(targetPath).filter((file) => TRACKED_EXT.test(file));
  const records = files.map((file) => ({
    file: path.relative(process.cwd(), file),
    hash: sha256(file),
  }));

  fs.writeFileSync(
    SNAPSHOT_FILE,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        root: path.relative(process.cwd(), path.resolve(targetPath)),
        files: records,
      },
      null,
      2
    )
  );

  console.log("SOURCE SHIELD SNAPSHOT CREATED");
  console.log(`Files protected: ${records.length}`);
  console.log(`Snapshot: ${SNAPSHOT_FILE}`);
}

function verify() {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    throw new Error(`No snapshot found at ${SNAPSHOT_FILE}`);
  }
  const snapshotData = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
  const changed = [];
  const missing = [];

  for (const record of snapshotData.files) {
    const abs = path.resolve(record.file);
    if (!fs.existsSync(abs)) {
      missing.push(record.file);
      continue;
    }
    if (sha256(abs) !== record.hash) {
      changed.push(record.file);
    }
  }

  console.log("SOURCE SHIELD VERIFY");
  console.log(`Protected files checked: ${snapshotData.files.length}`);
  console.log(`Changed source files: ${changed.length}`);
  console.log(`Missing source files: ${missing.length}`);

  if (changed.length || missing.length) {
    console.error("\nSOURCE SHIELD VIOLATION");
    if (changed.length) {
      console.error("\nChanged files:");
      for (const file of changed) console.error(`- ${file}`);
    }
    if (missing.length) {
      console.error("\nMissing files:");
      for (const file of missing) console.error(`- ${file}`);
    }
    process.exit(2);
  }

  console.log("Source route untouched: PASS");
}

const [command, targetPath] = process.argv.slice(2);

try {
  if (command === "snapshot") {
    if (!targetPath) {
      throw new Error(
        "Usage: source-shield.mjs snapshot <source-folder-or-file>"
      );
    }
    snapshot(targetPath);
  } else if (command === "verify") {
    verify();
  } else {
    console.log(
      [
        "Usage:",
        "  node .claude/skills/pixel-twin-route/scripts/source-shield.mjs snapshot <source-folder-or-file>",
        "  node .claude/skills/pixel-twin-route/scripts/source-shield.mjs verify",
      ].join("\n")
    );
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
