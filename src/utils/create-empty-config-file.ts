import fs from "fs-extra";

export async function createEmptyConfigFile(path: string) {
    await fs.writeJSON(path, {}, { spaces: 4 });
}
