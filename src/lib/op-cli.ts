import { exec, spawn } from "child_process";
import { promisify } from "util";
import { OnePasswordItem, OnePasswordVault, PasswordGeneratorOptions, OPCLIError } from "./types";

const execAsync = promisify(exec);

/**
 * Checks if 1Password CLI is installed and accessible
 */
export async function isOPInstalled(): Promise<boolean> {
  try {
    await execAsync("op --version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if user is signed in to 1Password CLI
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    await execAsync("op whoami");
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes an op command and returns the result
 */
async function executeOPCommand(command: string, sessionToken?: string): Promise<string> {
  try {
    const env = sessionToken ? { ...process.env, OP_SESSION: sessionToken } : process.env;
    const { stdout, stderr } = await execAsync(`op ${command}`, { env });
    
    if (stderr && !stderr.includes("warning")) {
      throw new Error(stderr);
    }
    
    return stdout.trim();
  } catch (error: any) {
    const cliError: OPCLIError = {
      message: error.message || "1Password CLI error",
      exitCode: error.code,
    };
    throw cliError;
  }
}

/**
 * Lists all items from all vaults
 */
export async function listItems(sessionToken?: string): Promise<OnePasswordItem[]> {
  try {
    const output = await executeOPCommand("item list --format json", sessionToken);
    return JSON.parse(output) as OnePasswordItem[];
  } catch (error: any) {
    if (error.message?.includes("not signed in") || error.message?.includes("authentication")) {
      throw new Error("Please sign in to 1Password CLI: op signin");
    }
    throw error;
  }
}

/**
 * Lists items from a specific vault
 */
export async function listItemsInVault(vaultId: string, sessionToken?: string): Promise<OnePasswordItem[]> {
  try {
    const output = await executeOPCommand(`item list --vault ${vaultId} --format json`, sessionToken);
    return JSON.parse(output) as OnePasswordItem[];
  } catch (error: any) {
    if (error.message?.includes("not signed in") || error.message?.includes("authentication")) {
      throw new Error("Please sign in to 1Password CLI: op signin");
    }
    throw error;
  }
}

/**
 * Gets detailed information about a specific item
 */
export async function getItem(itemId: string, sessionToken?: string): Promise<OnePasswordItem> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --format json`, sessionToken);
    return JSON.parse(output) as OnePasswordItem;
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      throw new Error(`Item not found: ${itemId}`);
    }
    throw error;
  }
}

/**
 * Gets the password field from an item
 */
export async function getPassword(itemId: string, sessionToken?: string): Promise<string> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --fields password`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to get password: ${error.message}`);
  }
}

/**
 * Gets the username field from an item
 */
export async function getUsername(itemId: string, sessionToken?: string): Promise<string> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --fields username`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to get username: ${error.message}`);
  }
}

/**
 * Gets a specific field from an item
 */
export async function getField(itemId: string, fieldLabel: string, sessionToken?: string): Promise<string> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --fields "${fieldLabel}"`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to get field "${fieldLabel}": ${error.message}`);
  }
}

/**
 * Lists all available vaults
 */
export async function listVaults(sessionToken?: string): Promise<OnePasswordVault[]> {
  try {
    const output = await executeOPCommand("vault list --format json", sessionToken);
    return JSON.parse(output) as OnePasswordVault[];
  } catch (error: any) {
    if (error.message?.includes("not signed in") || error.message?.includes("authentication")) {
      throw new Error("Please sign in to 1Password CLI: op signin");
    }
    throw error;
  }
}

/**
 * Generates a secure password with the specified options
 */
export async function generatePassword(options: PasswordGeneratorOptions, sessionToken?: string): Promise<string> {
  try {
    const flags: string[] = [];
    
    if (options.length) {
      flags.push(`--length ${options.length}`);
    }
    if (!options.uppercase) flags.push("--no-uppercase");
    if (!options.lowercase) flags.push("--no-lowercase");
    if (!options.numbers) flags.push("--no-digits");
    if (!options.symbols) flags.push("--no-symbols");
    if (options.excludeAmbiguous) flags.push("--exclude-symbols");
    
    const output = await executeOPCommand(`generate password ${flags.join(" ")}`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to generate password: ${error.message}`);
  }
}

/**
 * Signs in to 1Password CLI
 * Opens a terminal window for interactive authentication
 */
/**
 * Signs in to 1Password CLI
 * Opens a terminal window for interactive authentication
 */
export async function signIn(emailOrAccount?: string): Promise<void> {
  try {
    // Build the signin command
    let command = "op signin";
    
    if (emailOrAccount) {
      // If it looks like an email, use it directly
      // If it looks like a domain, use --account flag
      if (emailOrAccount.includes("@")) {
        // Email address - 1Password CLI can use this directly
        command = `op signin ${emailOrAccount}`;
      } else if (emailOrAccount.includes(".")) {
        // Likely a domain/account URL
        command = `op signin --account ${emailOrAccount}`;
      } else {
        // Try as account
        command = `op signin --account ${emailOrAccount}`;
      }
    }
    
    // Open a new terminal window and run the sign-in command
    // For Windows, use cmd.exe with /k to keep window open after command
    const terminal = spawn("cmd.exe", ["/k", command], {
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    
    terminal.unref();
    
    // Give it a moment to open
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error: any) {
    throw new Error(`Failed to open terminal: ${error.message}`);
  }
}

