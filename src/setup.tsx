import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  open,
  Clipboard,
} from "@raycast/api";
import { isOPInstalled, isSignedIn } from "./lib/op-cli";

export default function Setup() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setIsChecking(true);
    try {
      const installed = await isOPInstalled();
      setIsInstalled(installed);

      if (installed) {
        const signedIn = await isSignedIn();
        setIsAuthenticated(signedIn);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsInstalled(false);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleOpenTerminal() {
    try {
      // Open PowerShell/Command Prompt for Windows
      await open("cmd.exe", "C:\\Windows\\System32");
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal opened",
        message: "Run 'op signin' in the terminal",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open terminal",
        message: "Please open a terminal manually and run 'op signin'",
      });
    }
  }

  if (isChecking) {
    return (
      <Detail
        markdown="# Checking Setup Status...\n\nPlease wait while we verify your 1Password CLI installation."
        isLoading={true}
      />
    );
  }

  const markdown = `# 1Password Extension Setup

## Status Check

${getStatusMarkdown(isInstalled, isAuthenticated)}

${getInstructionsMarkdown(isInstalled, isAuthenticated)}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isInstalled && (
            <Action
              title="Open 1Password CLI Installation Guide"
              icon={Icon.Link}
              onAction={() => open("https://developer.1password.com/docs/cli/get-started")}
            />
          )}
          {isInstalled && !isAuthenticated && (
            <>
              <Action
                title="Open Terminal to Sign In"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={handleOpenTerminal}
              />
              <Action
                title="Copy Sign In Command"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy("op signin");
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Command copied",
                    message: "Paste 'op signin' in your terminal",
                  });
                }}
              />
            </>
          )}
          {isInstalled && isAuthenticated && (
            <Action
              title="Refresh Status"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={checkStatus}
            />
          )}
          <Action
            title="Check Status Again"
            icon={Icon.ArrowClockwise}
            onAction={checkStatus}
          />
        </ActionPanel>
      }
    />
  );
}

function getStatusMarkdown(isInstalled: boolean | null, isAuthenticated: boolean | null): string {
  if (!isInstalled) {
    return `❌ **1Password CLI is not installed**

You need to install the 1Password CLI before using this extension.`;
  }

  if (!isAuthenticated) {
    return `✅ **1Password CLI is installed**\n❌ **Not signed in**

You need to sign in to your 1Password account.`;
  }

  return `✅ **1Password CLI is installed**\n✅ **Signed in**

You're all set! You can now use all the extension commands.`;
}

function getInstructionsMarkdown(isInstalled: boolean | null, isAuthenticated: boolean | null): string {
  if (!isInstalled) {
    return `## Installation Steps

1. **Download 1Password CLI**
   - Visit: https://developer.1password.com/docs/cli/get-started
   - Download the Windows installer
   - Run the installer and follow the setup instructions

2. **Verify Installation**
   - Open a terminal (PowerShell or Command Prompt)
   - Run: \`op --version\`
   - You should see a version number

3. **Sign In**
   - Run: \`op signin\`
   - Follow the prompts to authenticate

4. **Return Here**
   - Press \`Cmd+R\` or click "Check Status Again" to verify setup`;
  }

  if (!isAuthenticated) {
    return `## Sign In Steps

1. **Open a Terminal**
   - Press \`Cmd+T\` or open PowerShell/Command Prompt manually

2. **Sign In to 1Password**
   - Run: \`op signin\`
   - Follow the authentication prompts
   - You may need to scan a QR code or enter your account details

3. **Verify Sign In**
   - Run: \`op whoami\` to confirm you're signed in
   - You should see your account email

4. **Return Here**
   - Press \`Cmd+R\` or click "Check Status Again" to refresh`;
  }

  return `## You're Ready!

All setup is complete. You can now use:

- **Search Items** - Search and browse your 1Password items
- **Generate Password** - Create secure passwords
- **Manage Vaults** - View and manage your vaults

Enjoy using the extension! 🎉`;
}

