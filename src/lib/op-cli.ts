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
 * Checks if 1Password desktop app integration is available and working
 * Desktop app integration allows CLI to use the app's session automatically
 */
export async function checkDesktopAppIntegration(): Promise<boolean> {
  try {
    // First check if CLI is installed
    await execAsync("op --version");
    
    // Try to check if we can communicate with desktop app
    // If desktop app is integrated, op account list should work without sign-in
    try {
      await execAsync("op account list", {
        shell: "powershell.exe",
        maxBuffer: 1024 * 1024,
        timeout: 3000,
      });
      // If this works, desktop app integration is likely working
      return true;
    } catch {
      // Account list failed, but that's okay - we might just not be signed in
      // Desktop app integration might still be available
      // Return true optimistically - the sign-in attempt will determine if it works
      return true;
    }
  } catch {
    // CLI not installed
    return false;
  }
}

/**
 * Signs in using desktop app integration or email
 * If desktop app is integrated, sign-in should be automatic
 */
export async function signInWithCredentials(email?: string, password?: string): Promise<boolean> {
  try {
    // If no email provided, try desktop app integration sign-in first
    if (!email) {
      // When desktop app is integrated, op signin should work automatically
      // Try both regular signin and --raw flag to get the session token
      try {
        // First try with --raw flag to get just the token
        let stdout = "";
        let stderr = "";
        
        try {
          const result = await execAsync("op signin --raw", {
            shell: "powershell.exe",
            maxBuffer: 1024 * 1024,
            timeout: 15000,
          });
          stdout = result.stdout;
          stderr = result.stderr || "";
        } catch (rawError: any) {
          // --raw might not work, try regular signin
          try {
            const result = await execAsync("op signin", {
              shell: "powershell.exe",
              maxBuffer: 1024 * 1024,
              timeout: 15000,
            });
            stdout = result.stdout;
            stderr = result.stderr || "";
          } catch (signinError: any) {
            stdout = signinError.stdout || "";
            stderr = signinError.stderr || signinError.message || "";
          }
        }

        // Check if we got a raw token (from --raw flag)
        const rawToken = stdout.trim();
        if (rawToken && !rawToken.includes("$env:") && rawToken.length > 20) {
          // We got a raw token, need to find the account to set the right env var
          try {
            const accountList = await execAsync("op account list --format json", {
              shell: "powershell.exe",
              maxBuffer: 1024 * 1024,
            });
            const accounts = JSON.parse(accountList.stdout);
            if (accounts && accounts.length > 0) {
              const account = accounts[0];
              const envVarName = `OP_SESSION_${account.user_uuid || account.shorthand || "default"}`;
              
              // Set in current process
              process.env[envVarName] = rawToken;
              
              // Set it globally
              try {
                await execAsync(
                  `powershell.exe -Command "[System.Environment]::SetEnvironmentVariable('${envVarName}', '${rawToken}', 'User')"`,
                  { shell: "cmd.exe" }
                );
              } catch {
                // Continue anyway
              }
            }
          } catch {
            // Couldn't get account info, but we have the token
          }
        } else {
          // Check if we got a session token command (standard format)
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
                // Use Invoke-Expression to execute the command
                const escapedCommand = sessionCommand.replace(/'/g, "''").replace(/"/g, '\\"');
                await execAsync(
                  `powershell.exe -Command "Invoke-Expression '${escapedCommand}'"`,
                  { shell: "cmd.exe" }
                );
              } catch {
                // Try setting via Environment variable directly
                try {
                  await execAsync(
                    `powershell.exe -Command "[System.Environment]::SetEnvironmentVariable('${envVarName}', '${sessionToken}', 'User')"`,
                    { shell: "cmd.exe" }
                  );
                } catch {
                  // Continue anyway - we have it in process.env
                }
              }
            }
          }
        }
        
        // Verify sign-in worked
        const signedIn = await isSignedIn();
        if (signedIn) {
          return true;
        }
        
        // If we got stderr but no session token, desktop app integration might not be working
        if (stderr && (stderr.includes("not signed in") || stderr.includes("authentication"))) {
          throw new Error("Desktop app integration not working. Please ensure 1Password app is open, unlocked, and CLI integration is enabled in Settings → Developer.");
        }
      } catch (error: any) {
        // Check if we're actually signed in despite the error
        const signedIn = await isSignedIn();
        if (signedIn) {
          return true;
        }
        
        // If error suggests desktop app isn't working, throw helpful error
        if (error.message?.includes("not signed in") || error.message?.includes("authentication") || error.message?.includes("timeout")) {
          throw new Error("Desktop app integration not working. Please ensure:\n1. 1Password app is open and unlocked\n2. CLI integration is enabled (Settings → Developer → 'Integrate with 1Password CLI')\n3. Try signing in with email instead");
        }
        throw error;
      }
    }

    // If email provided, try sign-in with email
    if (email) {
      let command = "op signin";
      
      if (email.includes("@")) {
        command = `op signin ${email}`;
      } else {
        command = `op signin --account ${email}`;
      }

      // Execute signin - if desktop app is integrated, this should work automatically
      const { stdout, stderr } = await execAsync(command, {
        shell: "powershell.exe",
        maxBuffer: 1024 * 1024,
        timeout: 10000,
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
            // Method 1: Use Invoke-Expression with proper escaping
            const escapedCommand = sessionCommand.replace(/'/g, "''").replace(/"/g, '\\"');
            await execAsync(
              `powershell.exe -Command "Invoke-Expression '${escapedCommand}'"`,
              { shell: "cmd.exe" }
            );
          } catch {
            // Method 2: Try direct execution
            try {
              await execAsync(
                `powershell.exe -Command "${sessionCommand}"`,
                { shell: "cmd.exe" }
              );
            } catch {
              // Method 3: Set it via [System.Environment]::SetEnvironmentVariable
              try {
                const varName = envVarName;
                const varValue = sessionToken;
                await execAsync(
                  `powershell.exe -Command "[System.Environment]::SetEnvironmentVariable('${varName}', '${varValue}', 'User')"`,
                  { shell: "cmd.exe" }
                );
              } catch {
                // Continue anyway - we have it in process.env
              }
            }
          }
        }
        
        // Verify sign-in
        const signedIn = await isSignedIn();
        return signedIn;
      }

      // Check if we're signed in (desktop app might have handled it silently)
      const signedIn = await isSignedIn();
      if (signedIn) {
        return true;
      }

      // If we get stderr about authentication, desktop app integration isn't working
      if (stderr && (stderr.includes("authentication") || stderr.includes("QR") || stderr.includes("not signed in"))) {
        throw new Error("Desktop app integration not working. Please ensure 1Password app is open, unlocked, and CLI integration is enabled in Settings → Developer.");
      }
    }

    // Final check - are we signed in?
    const signedIn = await isSignedIn();
    return signedIn;
  } catch (error: any) {
    // Check one more time if we're signed in (might have worked despite error)
    try {
      const signedIn = await isSignedIn();
      if (signedIn) {
        return true;
      }
    } catch {
      // Not signed in
    }

    throw error;
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

