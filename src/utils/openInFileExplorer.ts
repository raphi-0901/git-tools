import { spawn } from "node:child_process";
import { platform } from "node:process";

/**
 * Opens the given file or directory in the system's default file explorer.
 *
 * This function is cross-platform and supports:
 * - macOS (`open`)
 * - Windows (`cmd /c start`)
 * - Linux and other Unix-like systems (`xdg-open`)
 *
 * The process is spawned in detached mode and does not block the Node.js event loop.
 *
 * @param path - Absolute or relative path to a file or directory to open.
 */
export function openInFileExplorer(path: string) {
    let command: string;
    let args: string[] = [];

    switch (platform) {
        case "darwin": { // macOS
            command = "open";
            args = [path];
            break;
        }

        case "win32": { // Windows
            command = "cmd";
            args = ["/c", "start", "", path];
            break;
        }

        default: { // Linux and others
            command = "xdg-open";
            args = [path];
            break;
        }
    }

    spawn(command, args, {
        detached: true,
        stdio: "ignore",
    }).unref();
}
