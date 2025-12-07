import fs from "fs-extra";
import pathModule from "node:path";

export async function createEmptyConfigFile(filePath: string) {
    const dir = pathModule.dirname(filePath);
    await fs.ensureDir(dir); // ensure all parent directories exist
    await fs.writeJSON(filePath, {}, { spaces: 4 });
}
