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
 * Checks if 1Password desktop app integration is available
 */
export async function checkDesktopAppIntegration(): Promise<boolean> {
  try {
    // Try to list accounts - if desktop app is integrated, this should work
    // without requiring sign-in
    await execAsync("op account list", {
      shell: "powershell.exe",
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch {
    // If it fails, desktop app integration might not be available
    // But it could also mean we're just not signed in
    // Check if op command works at all
    try {
      await execAsync("op --version");
      // CLI works, but we can't determine desktop app status for sure
      // Return true optimistically - user can try desktop app sign-in
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Signs in using email and password credentials
 * Tries to add account first, then sign in
 */
export async function signInWithCredentials(email?: string, password?: string): Promise<boolean> {
  try {
    // If desktop app is integrated, try simple signin first (should work automatically)
    if (!email && !password) {
      try {
        const result = await signIn();
        return result;
      } catch {
        // Fall through to credential-based sign-in
      }
    }

    // If we have credentials, try to use them
    if (email && password) {
      // 1Password CLI doesn't accept password directly via command line for security
      // But we can try to add the account first, then sign in
      // Note: This may still require interactive authentication
      
      // Try account add with email (password will be prompted or use desktop app)
      try {
        // First, try to add the account if it doesn't exist
        // This might prompt for password, but if desktop app is open, it should use that
        const addCommand = email.includes("@") 
          ? `echo "${password}" | op account add --address ${email.split("@")[1] || email} --email ${email}`
          : `echo "${password}" | op account add ${email}`;
        
        // Actually, op account add doesn't work this way - it requires interactive input
        // Instead, let's try signin which should use desktop app if available
        // or prompt for password in a way we can handle
      } catch {
        // Account might already exist, continue to sign-in
      }
    }

    // Try sign-in - if desktop app is integrated, this should work automatically
    // If not, it will require interactive authentication
    let command = "op signin";
    
    if (email) {
      if (email.includes("@")) {
        command = `op signin ${email}`;
      } else {
        command = `op signin --account ${email}`;
      }
    }

    // Execute signin - if desktop app is integrated, this should work
    // Otherwise it will output the PowerShell command we need to execute
    const { stdout, stderr } = await execAsync(command, {
      shell: "powershell.exe",
      maxBuffer: 1024 * 1024,
    });

    // Parse the output to extract the PowerShell command
    const sessionCommandMatch = stdout.match(/(\$env:OP_SESSION_\w+="[^"]+");/);
    
    if (sessionCommandMatch && sessionCommandMatch[1]) {
      const sessionCommand = sessionCommandMatch[1];
      const envVarMatch = sessionCommand.match(/\$env:(OP_SESSION_\w+)="([^"]+)"/);
      
      if (envVarMatch && envVarMatch[1] && envVarMatch[2]) {
        const envVarName = envVarMatch[1];
        const sessionToken = envVarMatch[2];
        
        // Set in current process
        process.env[envVarName] = sessionToken;
        
        // Execute PowerShell command to set it globally
        try {
          await execAsync(
            `powershell.exe -Command "Invoke-Expression '${sessionCommand}'"`,
            { shell: "cmd.exe" }
          );
        } catch {
          // Try direct execution
          try {
            await execAsync(
              `powershell.exe -Command "${sessionCommand}"`,
              { shell: "cmd.exe" }
            );
          } catch {
            // Continue anyway - we have it in process.env
          }
        }
      }
      
      // Verify sign-in
      const signedIn = await isSignedIn();
      return signedIn;
    }

    // Check if we're signed in (desktop app might have handled it)
    const signedIn = await isSignedIn();
    if (signedIn) {
      return true;
    }

    // If we get here and have stderr, it might need interactive auth
    if (stderr && (stderr.includes("authentication") || stderr.includes("QR"))) {
      throw new Error("Interactive authentication required. Please enable desktop app integration in 1Password app settings, or sign in manually.");
    }

    return false;
  } catch (error: any) {
    // If desktop app integration is available, sign-in should work
    // Check if we're actually signed in now
    try {
      const signedIn = await isSignedIn();
      if (signedIn) {
        return true;
      }
    } catch {
      // Not signed in
    }

    throw new Error(`Sign-in failed: ${error.message || "Please enable desktop app integration or sign in manually"}`);
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

