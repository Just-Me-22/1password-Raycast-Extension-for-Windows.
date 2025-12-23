import { spawn } from "child_process";
import { existsSync, readdirSync } from "fs";
import path from "path";
import { OnePasswordItem, OnePasswordVault, PasswordGeneratorOptions } from "./types";

let cachedOpPath: string | null = null;

// Find op.exe in common Windows locations
async function findOpPath(): Promise<string> {
  if (cachedOpPath) return cachedOpPath;

  // Hardcoded path for your system (try this first since we know it works)
  const hardcodedPath = "C:\\Users\\kkosi\\AppData\\Local\\Microsoft\\WinGet\\Packages\\AgileBits.1Password.CLI_Microsoft.Winget.Source_8wekyb3d8bbwe\\op.exe";
  if (existsSync(hardcodedPath)) {
    cachedOpPath = hardcodedPath;
    return cachedOpPath;
  }

  // Check winget installation
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "C:\\Users\\kkosi", "AppData", "Local");
  const wingetRoot = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  
  if (existsSync(wingetRoot)) {
    try {
      const entries = readdirSync(wingetRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name.toLowerCase().includes("1password") || d.name.toLowerCase().includes("agilebits")))
        .map((d) => d.name);

      for (const dir of entries) {
        const candidate = path.join(wingetRoot, dir, "op.exe");
        if (existsSync(candidate)) {
          cachedOpPath = candidate;
          return cachedOpPath;
        }
      }
    } catch {
      // Continue
    }
  }

  // Try PATH as fallback
  cachedOpPath = "op";
  return cachedOpPath;
}

function runOp(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    findOpPath()
      .then((opCmd) => {
    
    const args: string[] = [];
    let currentArg = "";
    let inQuotes = false;
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === " " && !inQuotes) {
        if (currentArg.length > 0) {
          args.push(currentArg);
          currentArg = "";
        }
      } else {
        currentArg += char;
      }
    }
    
        if (currentArg.length > 0) {
          args.push(currentArg);
        }

        const child = spawn(opCmd, args, {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
          shell: false,
          env: process.env,
        });
    
    let stdout = "";
    let stderr = "";
    
        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("error", (error) => {
          reject(new Error(`Failed to execute op command: ${error.message}`));
        });

        child.on("close", (code) => {
          if (code !== 0) {
            const stderrLower = stderr.toLowerCase();

            if (stderrLower.includes("cannot connect to 1password app") || stderrLower.includes("make sure it is running")) {
              reject(
                new Error(
                  "Cannot connect to 1Password desktop app. Please ensure:\n1. 1Password app is running and unlocked\n2. CLI integration is enabled: Settings → Developer → 'Integrate with 1Password CLI'\n3. Try restarting the 1Password app"
                )
              );
              return;
            }

            if (
              stderrLower.includes("not signed in") ||
              stderrLower.includes("authentication") ||
              stderrLower.includes("you are not signed in") ||
              stderrLower.includes("sign in required") ||
              stderrLower.includes("account is not signed in")
            ) {
              reject(
                new Error(
                  "Please sign in to 1Password CLI. Make sure:\n1. 1Password desktop app is open and unlocked\n2. CLI integration is enabled (Settings → Developer)\n3. Try running 'op signin' in PowerShell"
                )
              );
              return;
            }

            if (stderr && !stderr.includes("warning")) {
              reject(new Error(stderr || `Command failed with exit code ${code}`));
            } else {
              reject(new Error(`Command failed with exit code ${code}. ${stderr || ""}`));
            }
            return;
          }

          if (stderr && !stderr.includes("warning") && stderr.trim().length > 0) {
            console.warn("Stderr output:", stderr);
          }

          resolve(stdout.trim());
        });

        setTimeout(() => {
          child.kill();
          reject(new Error("Command timeout after 30 seconds"));
        }, 30000);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export async function isOPInstalled(): Promise<boolean> {
  try {
    const opCmd = await findOpPath();
    await runOp("--version");
    return true;
  } catch (error) {
    return false;
  }
}

export async function isSignedIn(): Promise<boolean> {
  try {
    await runOp("whoami");
    return true;
  } catch {
    return false;
  }
}

export async function listVaults(): Promise<OnePasswordVault[]> {
  try {
    const output = await runOp("vault list --format json");
    if (!output || output.trim().length === 0) {
      return [];
    }
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error.message?.includes("not signed in") || error.message?.includes("authentication")) {
      throw new Error("Please sign in to 1Password CLI: op signin");
    }
    throw error;
  }
}

export async function listItems(): Promise<OnePasswordItem[]> {
  try {
    const output = await runOp("item list --format json");
    if (!output || output.trim().length === 0) {
      return [];
    }
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error.message?.includes("not signed in") || error.message?.includes("authentication")) {
      throw new Error("Please sign in to 1Password CLI: op signin");
    }
    throw error;
  }
}

export async function listItemsInVault(vaultId: string): Promise<OnePasswordItem[]> {
  const output = await runOp(`item list --vault ${vaultId} --format json`);
  if (!output || output.length === 0) return [];
  return JSON.parse(output);
}

export async function getItem(itemId: string): Promise<OnePasswordItem> {
  const output = await runOp(`item get ${itemId} --format json`);
  if (!output || output.length === 0) throw new Error(`Item not found: ${itemId}`);
  return JSON.parse(output);
}

export async function getPassword(itemId: string): Promise<string> {
  return await runOp(`item get ${itemId} --fields password`);
}

export async function getUsername(itemId: string): Promise<string> {
  return await runOp(`item get ${itemId} --fields username`);
}

export async function getField(itemId: string, fieldLabel: string): Promise<string> {
  return await runOp(`item get ${itemId} --fields "${fieldLabel}"`);
}

export async function generatePassword(options: PasswordGeneratorOptions): Promise<string> {
  const flags: string[] = [];
  
  if (options.length) flags.push(`--length ${options.length}`);
  if (!options.uppercase) flags.push("--no-uppercase");
  if (!options.lowercase) flags.push("--no-lowercase");
  if (!options.numbers) flags.push("--no-digits");
  if (!options.symbols) flags.push("--no-symbols");
  if (options.excludeAmbiguous) flags.push("--exclude-symbols");
  
  return await runOp(`generate password ${flags.join(" ")}`);
}

interface LoginItemInput {
  title: string;
  vaultId?: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
}

interface EditLoginItemInput extends LoginItemInput {
  id: string;
}

export async function createLoginItem(input: LoginItemInput): Promise<OnePasswordItem> {
  const parts: string[] = ['item create "Login"'];

  if (input.title) {
    parts.push(`--title "${input.title}"`);
  }
  if (input.vaultId) {
    parts.push(`--vault "${input.vaultId}"`);
  }
  if (input.username) {
    parts.push(`--username "${input.username}"`);
  }
  if (input.password) {
    parts.push(`--password "${input.password}"`);
  }
  if (input.url) {
    parts.push(`--url "${input.url}"`);
  }
  if (input.notes) {
    parts.push(`--notes "${input.notes}"`);
  }

  parts.push("--format json");

  const output = await runOp(parts.join(" "));
  return JSON.parse(output) as OnePasswordItem;
}

export async function editLoginItem(input: EditLoginItemInput): Promise<OnePasswordItem> {
  const parts: string[] = ["item edit", input.id];

  if (input.title) {
    parts.push(`--title "${input.title}"`);
  }
  if (input.vaultId) {
    parts.push(`--vault "${input.vaultId}"`);
  }
  if (input.username) {
    parts.push(`--username "${input.username}"`);
  }
  if (input.password) {
    parts.push(`--password "${input.password}"`);
  }
  if (input.url) {
    parts.push(`--url "${input.url}"`);
  }
  if (input.notes) {
    parts.push(`--notes "${input.notes}"`);
  }

  parts.push("--format json");

  const output = await runOp(parts.join(" "));
  return JSON.parse(output) as OnePasswordItem;
}
