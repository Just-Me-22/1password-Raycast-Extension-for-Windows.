import { exec, spawn } from "child_process";
import { promisify } from "util";
import { OnePasswordItem, OnePasswordVault, PasswordGeneratorOptions, OPCLIError } from "./types";

const execAsync = promisify(exec);

export async function isOPInstalled(): Promise<boolean> {
  try {
    await execAsync("op --version");
    return true;
  } catch {
    return false;
  }
}

export async function isSignedIn(): Promise<boolean> {
  try {
    await execAsync("op whoami");
    return true;
  } catch {
    return false;
  }
}

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

export async function getPassword(itemId: string, sessionToken?: string): Promise<string> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --fields password`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to get password: ${error.message}`);
  }
}

export async function getUsername(itemId: string, sessionToken?: string): Promise<string> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --fields username`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to get username: ${error.message}`);
  }
}

export async function getField(itemId: string, fieldLabel: string, sessionToken?: string): Promise<string> {
  try {
    const output = await executeOPCommand(`item get ${itemId} --fields "${fieldLabel}"`, sessionToken);
    return output.trim();
  } catch (error: any) {
    throw new Error(`Failed to get field "${fieldLabel}": ${error.message}`);
  }
}

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

export async function signIn(emailOrAccount?: string): Promise<boolean> {
  try {
    let command = "op signin";
    
    if (emailOrAccount) {
      if (emailOrAccount.includes("@")) {
        command = `op signin ${emailOrAccount}`;
      } else if (emailOrAccount.includes(".")) {
        command = `op signin --account ${emailOrAccount}`;
      } else {
        command = `op signin --account ${emailOrAccount}`;
      }
    }
    
    const { stdout, stderr } = await execAsync(command, {
      shell: "powershell.exe",
      maxBuffer: 1024 * 1024,
    });
    
    const sessionCommandMatch = stdout.match(/(\$env:OP_SESSION_\w+="[^"]+");/);
    
    if (sessionCommandMatch && sessionCommandMatch[1]) {
      const sessionCommand = sessionCommandMatch[1];
      const envVarMatch = sessionCommand.match(/\$env:(OP_SESSION_\w+)="([^"]+)"/);
      
      if (envVarMatch && envVarMatch[1] && envVarMatch[2]) {
        const envVarName = envVarMatch[1];
        const sessionToken = envVarMatch[2];
        
        process.env[envVarName] = sessionToken;
        
        try {
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

export async function checkDesktopAppIntegration(): Promise<boolean> {
  try {
    await execAsync("op --version");
    
    try {
      const result = await execAsync("op account list", {
        shell: "powershell.exe",
        maxBuffer: 1024 * 1024,
        timeout: 3000,
      });
      
      if (result.stdout && result.stdout.trim()) {
        return true;
      }
    } catch {
      try {
        const signinResult = await execAsync("op signin --raw", {
          shell: "powershell.exe",
          maxBuffer: 1024 * 1024,
          timeout: 5000,
        });
        
        if (signinResult.stdout && signinResult.stdout.trim().length > 20) {
          return true;
        }
      } catch {
        return false;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

export async function signInWithCredentials(email?: string, password?: string): Promise<boolean> {
  try {
    if (!email) {
      try {
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

        const rawToken = stdout.trim();
        if (rawToken && !rawToken.includes("$env:") && rawToken.length > 20) {
          try {
            const accountList = await execAsync("op account list --format json", {
              shell: "powershell.exe",
              maxBuffer: 1024 * 1024,
            });
            const accounts = JSON.parse(accountList.stdout);
            if (accounts && accounts.length > 0) {
              const account = accounts[0];
              const envVarName = `OP_SESSION_${account.user_uuid || account.shorthand || "default"}`;
              
              process.env[envVarName] = rawToken;
              
              try {
                await execAsync(
                  `powershell.exe -Command "[System.Environment]::SetEnvironmentVariable('${envVarName}', '${rawToken}', 'User')"`,
                  { shell: "cmd.exe" }
                );
              } catch {
              }
            }
          } catch {
          }
        } else {
          const sessionCommandMatch = stdout.match(/(\$env:OP_SESSION_\w+="[^"]+");/);
          
          if (sessionCommandMatch && sessionCommandMatch[1]) {
            const sessionCommand = sessionCommandMatch[1];
            const envVarMatch = sessionCommand.match(/\$env:(OP_SESSION_\w+)="([^"]+)"/);
            
            if (envVarMatch && envVarMatch[1] && envVarMatch[2]) {
              const envVarName = envVarMatch[1];
              const sessionToken = envVarMatch[2];
              
              process.env[envVarName] = sessionToken;
              
              try {
                const escapedCommand = sessionCommand.replace(/'/g, "''").replace(/"/g, '\\"');
                await execAsync(
                  `powershell.exe -Command "Invoke-Expression '${escapedCommand}'"`,
                  { shell: "cmd.exe" }
                );
              } catch {
                try {
                  await execAsync(
                    `powershell.exe -Command "[System.Environment]::SetEnvironmentVariable('${envVarName}', '${sessionToken}', 'User')"`,
                    { shell: "cmd.exe" }
                  );
                } catch {
                }
              }
            }
          }
        }
        
        const signedIn = await isSignedIn();
        if (signedIn) {
          return true;
        }
        
        if (stderr && (stderr.includes("not signed in") || stderr.includes("authentication"))) {
          throw new Error("Desktop app integration not working. Please ensure 1Password app is open, unlocked, and CLI integration is enabled in Settings → Developer.");
        }
      } catch (error: any) {
        const signedIn = await isSignedIn();
        if (signedIn) {
          return true;
        }
        
        if (error.message?.includes("not signed in") || error.message?.includes("authentication") || error.message?.includes("timeout")) {
          throw new Error("Desktop app integration not working. Please ensure:\n1. 1Password app is open and unlocked\n2. CLI integration is enabled (Settings → Developer → 'Integrate with 1Password CLI')\n3. Try signing in with email instead");
        }
        throw error;
      }
    }

    if (email) {
      let command = "op signin";
      
      if (email.includes("@")) {
        command = `op signin ${email}`;
      } else {
        command = `op signin --account ${email}`;
      }

      const { stdout, stderr } = await execAsync(command, {
        shell: "powershell.exe",
        maxBuffer: 1024 * 1024,
        timeout: 10000,
      });

      const sessionCommandMatch = stdout.match(/(\$env:OP_SESSION_\w+="[^"]+");/);
      
      if (sessionCommandMatch && sessionCommandMatch[1]) {
        const sessionCommand = sessionCommandMatch[1];
        const envVarMatch = sessionCommand.match(/\$env:(OP_SESSION_\w+)="([^"]+)"/);
        
        if (envVarMatch && envVarMatch[1] && envVarMatch[2]) {
          const envVarName = envVarMatch[1];
          const sessionToken = envVarMatch[2];
          
          process.env[envVarName] = sessionToken;
          
          try {
            const escapedCommand = sessionCommand.replace(/'/g, "''").replace(/"/g, '\\"');
            await execAsync(
              `powershell.exe -Command "Invoke-Expression '${escapedCommand}'"`,
              { shell: "cmd.exe" }
            );
          } catch {
            try {
              await execAsync(
                `powershell.exe -Command "${sessionCommand}"`,
                { shell: "cmd.exe" }
              );
            } catch {
              try {
                await execAsync(
                  `powershell.exe -Command "[System.Environment]::SetEnvironmentVariable('${envVarName}', '${sessionToken}', 'User')"`,
                  { shell: "cmd.exe" }
                );
              } catch {
              }
            }
          }
        }
        
        const signedIn = await isSignedIn();
        return signedIn;
      }

      const signedIn = await isSignedIn();
      if (signedIn) {
        return true;
      }

      if (stderr && (stderr.includes("authentication") || stderr.includes("QR") || stderr.includes("not signed in"))) {
        throw new Error("Desktop app integration not working. Please ensure 1Password app is open, unlocked, and CLI integration is enabled in Settings → Developer.");
      }
    }

    const signedIn = await isSignedIn();
    return signedIn;
  } catch (error: any) {
    try {
      const signedIn = await isSignedIn();
      if (signedIn) {
        return true;
      }
    } catch {
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

