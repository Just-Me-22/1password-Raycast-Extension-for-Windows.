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
 * Signs in to 1Password CLI and automatically executes the session token command
 * Returns true if sign-in was successful, false if interactive sign-in is needed
 */
export async function signIn(emailOrAccount?: string): Promise<boolean> {
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
        // Try as account shorthand
        command = `op signin --account ${emailOrAccount}`;
      }
    }
    
    // Execute the signin command and capture output
    const { stdout, stderr } = await execAsync(command, {
      shell: "powershell.exe",
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
    
    // Parse the output to extract the PowerShell command
    // Format: $env:OP_SESSION_xxx="token"; # comment
    // We need to extract the full command line before the semicolon
    const sessionCommandMatch = stdout.match(/(\$env:OP_SESSION_\w+="[^"]+");/);
    
    if (sessionCommandMatch && sessionCommandMatch[1]) {
      const sessionCommand = sessionCommandMatch[1];
      
      // Extract the environment variable name and token for process.env
      const envVarMatch = sessionCommand.match(/\$env:(OP_SESSION_\w+)="([^"]+)"/);
      
      if (envVarMatch && envVarMatch[1] && envVarMatch[2]) {
        const envVarName = envVarMatch[1];
        const sessionToken = envVarMatch[2];
        
        // Set the environment variable in the current process
        process.env[envVarName] = sessionToken;
        
        // Execute the PowerShell command to set it in the PowerShell environment
        // This makes it available to subsequent op commands run from PowerShell
        try {
          // Execute the command using Invoke-Expression as suggested by 1Password
          await execAsync(
            `powershell.exe -Command "Invoke-Expression '${sessionCommand}'"`,
            { shell: "cmd.exe" }
          );
        } catch (execError) {
          // If that fails, try direct execution
          try {
            await execAsync(
              `powershell.exe -Command "${sessionCommand}"`,
              { shell: "cmd.exe" }
            );
          } catch {
            // If both fail, that's okay - we have it in process.env
            // The session might still work for this process
          }
        }
      }
      
      // Verify we're now signed in
      const signedIn = await isSignedIn();
      return signedIn;
    }
    
    // If no session token found, check if there's an error or if we need interactive auth
    if (stderr && stderr.includes("authentication")) {
      // Fall back to interactive sign-in
      return await signInInteractive(emailOrAccount);
    }
    
    // If we get here, sign-in might have succeeded but no token in output
    // Check if we're now signed in
    const signedIn = await isSignedIn();
    if (signedIn) {
      return true; // Signed in successfully
    }
    
    // Try interactive sign-in as fallback
    return await signInInteractive(emailOrAccount);
  } catch (error: any) {
    // If the error suggests interactive authentication is needed
    if (error.message?.includes("interactive") || error.message?.includes("QR") || error.code === "ENOENT") {
      // Fall back to opening terminal for interactive sign-in
      return await signInInteractive(emailOrAccount);
    }
    throw new Error(`Sign-in failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Opens a terminal window for interactive sign-in (fallback method)
 * Returns false to indicate user needs to complete sign-in manually
 */
async function signInInteractive(emailOrAccount?: string): Promise<boolean> {
  try {
    let command = "op signin";
    
    if (emailOrAccount) {
      if (emailOrAccount.includes("@")) {
        command = `op signin ${emailOrAccount}`;
      } else {
        command = `op signin --account ${emailOrAccount}`;
      }
    }
    
    // Open PowerShell and run the signin command
    // Use Start-Process to open a new window
    const psCommand = `Start-Process powershell -ArgumentList "-NoExit", "-Command", "${command}"`;
    await execAsync(psCommand, { shell: "powershell.exe" });
    
    // Wait a bit for the window to open
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    return false; // Return false - user needs to complete in terminal
  } catch (error: any) {
    throw new Error(`Failed to open terminal: ${error.message}`);
  }
}

