import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { installHermesPlugin } from "../../scripts/install-hermes-plugin.mjs";

describe("installHermesPlugin", () => {
  it("copies the Hermes plugin payload into the target Hermes home", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "socraticode-hermes-"));
    const sourceDir = path.join(tempDir, "source");
    const hermesHome = path.join(tempDir, "hermes-home");

    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, "plugin.yaml"), "name: socraticode\n", "utf-8");
    await writeFile(path.join(sourceDir, "skill.md"), "# skill\n", "utf-8");

    const result = await installHermesPlugin({
      hermesHome,
      pluginSourceDir: sourceDir,
    });

    expect(result.destinationDir).toBe(path.join(hermesHome, "plugins", "socraticode"));
    await expect(
      readFile(path.join(hermesHome, "plugins", "socraticode", "plugin.yaml"), "utf-8"),
    ).resolves.toContain("name: socraticode");
  });

  it("refuses to overwrite an existing installation without force", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "socraticode-hermes-"));
    const sourceDir = path.join(tempDir, "source");
    const hermesHome = path.join(tempDir, "hermes-home");

    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, "plugin.yaml"), "name: socraticode\n", "utf-8");
    await mkdir(path.join(hermesHome, "plugins", "socraticode"), { recursive: true });

    await expect(
      installHermesPlugin({
        hermesHome,
        pluginSourceDir: sourceDir,
      }),
    ).rejects.toThrow(/already exists/i);
  });
});
