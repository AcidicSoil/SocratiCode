#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Giancarlo Erra - Altaire Limited

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PLUGIN_NAME = "socraticode";

function repoRootFromHere() {
  return path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
}

function defaultHermesHome() {
  if (process.env.HERMES_HOME && process.env.HERMES_HOME.trim()) {
    return path.resolve(process.env.HERMES_HOME);
  }
  return path.join(os.homedir(), ".hermes");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(sourceDir, destinationDir) {
  await fs.mkdir(destinationDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, destinationPath);
      continue;
    }

    await fs.copyFile(sourcePath, destinationPath);
  }
}

export async function installHermesPlugin(options = {}) {
  const force = Boolean(options.force);
  const hermesHome = options.hermesHome
    ? path.resolve(options.hermesHome)
    : defaultHermesHome();
  const sourceDir = options.pluginSourceDir
    ? path.resolve(options.pluginSourceDir)
    : path.join(repoRootFromHere(), "hermes-plugin");
  const destinationDir = path.join(hermesHome, "plugins", PLUGIN_NAME);

  if (!(await pathExists(sourceDir))) {
    throw new Error(`Hermes plugin payload not found: ${sourceDir}`);
  }

  if (await pathExists(destinationDir)) {
    if (!force) {
      throw new Error(
        `Hermes plugin already exists at ${destinationDir}. Re-run with --force to replace it.`,
      );
    }
    await fs.rm(destinationDir, { recursive: true, force: true });
  }

  await copyDir(sourceDir, destinationDir);

  const message = [
    `Installed Hermes plugin payload to ${destinationDir}.`,
    "",
    "Next steps:",
    "1. Add SocratiCode to ~/.hermes/config.yaml:",
    "   mcp_servers:",
    "     socraticode:",
    '       command: "npx"',
    '       args: ["-y", "socraticode"]',
    '2. Start Hermes with: hermes chat --toolsets "terminal,file,mcp-socraticode,socraticode-plugin"',
    "3. If tools do not appear, run socraticode_doctor inside Hermes.",
  ].join("\n");

  return {
    destinationDir,
    message,
  };
}

const invokedAsMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (invokedAsMain) {
  installHermesPlugin({ force: process.argv.includes("--force") })
    .then((result) => {
      console.log(result.message);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
