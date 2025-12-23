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
  Form,
} from "@raycast/api";
import { isOPInstalled, isSignedIn, signIn } from "./lib/op-cli";

export default function Setup() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [account, setAccount] = useState("");
  const [shorthand, setShorthand] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

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

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await signIn(account || undefined, shorthand || undefined);
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal opened",
        message: "Complete authentication in the terminal window, then refresh status",
      });
      setShowSignInForm(false);
      // Don't auto-check, let user refresh manually after signing in
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open terminal",
        message: error.message || "Please try signing in manually",
      });
    } finally {
      setIsSigningIn(false);
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

  if (showSignInForm && isInstalled && !isAuthenticated) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Sign In"
              icon={Icon.Lock}
              shortcut={{ modifiers: ["ctrl"], key: "s" }}
              onAction={handleSignIn}
            />
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["ctrl"], key: "escape" }}
              onAction={() => setShowSignInForm(false)}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Sign In to 1Password"
          text="Enter your 1Password account details to sign in. A terminal window will open for authentication."
        />
        <Form.TextField
          id="account"
          title="Account URL or Email"
          placeholder="myaccount.1password.com or email@example.com"
          value={account}
          onChange={setAccount}
          info="Your 1Password account URL (e.g., myaccount.1password.com) or email address"
        />
        <Form.TextField
          id="shorthand"
          title="Shorthand (Optional)"
          placeholder="myaccount"
          value={shorthand}
          onChange={setShorthand}
          info="A short name for this account (optional)"
        />
        {isSigningIn && (
          <Form.Description title="Status" text="Signing in... Please complete authentication in the terminal." />
        )}
      </Form>
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
                title="Sign In to 1Password"
                icon={Icon.Lock}
                shortcut={{ modifiers: ["ctrl"], key: "s" }}
                onAction={() => setShowSignInForm(true)}
              />
              <Action
                title="Open Terminal to Sign In Manually"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["ctrl"], key: "t" }}
                onAction={async () => {
                  try {
                    await open("cmd.exe");
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Terminal opened",
                      message: "Run 'op signin' in the terminal",
                    });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not open terminal",
                      message: "Please open a terminal manually",
                    });
                  }
                }}
              />
              <Action
                title="Copy Sign In Command"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
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
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
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
   - Press \`Ctrl+S\` or click "Sign In to 1Password" button above
   - Or run: \`op signin\` in terminal

4. **Return Here**
   - Press \`Ctrl+R\` or click "Check Status Again" to verify setup`;
  }

  if (!isAuthenticated) {
    return `## Sign In Steps

1. **Automated Sign In (Recommended)**
   - Press \`Ctrl+S\` or click "Sign In to 1Password" button above
   - Enter your account URL or email
   - A terminal window will open for authentication
   - Follow the prompts (scan QR code or enter password)

2. **Manual Sign In**
   - Press \`Ctrl+T\` to open terminal
   - Run: \`op signin\`
   - Follow the authentication prompts

3. **Verify Sign In**
   - Run: \`op whoami\` to confirm you're signed in
   - You should see your account email

4. **Return Here**
   - Press \`Ctrl+R\` or click "Check Status Again" to refresh`;
  }

  return `## You're Ready!

All setup is complete. You can now use:

- **Search Items** - Search and browse your 1Password items
- **Generate Password** - Create secure passwords
- **Manage Vaults** - View and manage your vaults

Enjoy using the extension! 🎉`;
}
