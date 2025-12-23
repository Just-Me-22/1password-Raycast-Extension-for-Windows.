import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, open } from "@raycast/api";
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

  if (isChecking) {
    return <Detail markdown="# Checking Setup...\n\nPlease wait." isLoading={true} />;
  }

  let markdown = "";
  const actions: React.ReactElement[] = [];

  if (!isInstalled) {
    markdown = `# 1Password CLI Not Installed

Installation is quick and easy.

## Quick Setup

1. Open PowerShell and run: \`winget install AgileBits.1Password.CLI\`
2. Or download from [developer.1password.com](https://developer.1password.com/docs/cli/get-started/)
3. Return here and refresh

Once installed, make sure 1Password desktop app is open with CLI integration enabled.`;
    
    actions.push(
      <Action
        key="guide"
        title="Open Installation Guide"
        icon={Icon.Link}
        onAction={() => open("https://developer.1password.com/docs/cli/get-started")}
      />
    );
  } else if (!isAuthenticated) {
    markdown = `# CLI Installed | Not Signed In

You need to sign in to 1Password CLI using the desktop app.

## Setup Steps

1. **Open 1Password desktop app** and unlock it
2. **Enable CLI integration**:
   - Open 1Password app
   - Go to Settings → Developer
   - Enable "Integrate with 1Password CLI"
3. **Sign in** - Open PowerShell and run:
   \`\`\`
   op signin
   \`\`\`
4. **Return here** and click Refresh

The desktop app integration makes everything automatic and secure (uses Windows Hello).`;
    
    actions.push(
      <Action
        key="guide"
        title="Open CLI Integration Guide"
        icon={Icon.Gear}
        onAction={() => open("https://developer.1password.com/docs/cli/app-integration")}
      />
    );
  } else {
    markdown = `# All Set! ✓

You're ready to use the 1Password extension.

## Available Commands

- **Search Items** - Find and copy passwords
- **Generate Password** - Create secure passwords
- **Manage Vaults** - Browse your vaults`;
  }

  actions.push(
    <Action
      key="refresh"
      title="Refresh Status"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["ctrl"], key: "r" }}
      onAction={checkStatus}
    />
  );

  return <Detail markdown={markdown} actions={<ActionPanel>{actions}</ActionPanel>} />;
}
