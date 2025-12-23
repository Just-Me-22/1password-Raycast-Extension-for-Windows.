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
  const [email, setEmail] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  // Auto-check status every 3 seconds if user is signing in
  useEffect(() => {
    if (autoChecking) {
      const interval = setInterval(async () => {
        const signedIn = await isSignedIn();
        setIsAuthenticated(signedIn);
        if (signedIn) {
          setAutoChecking(false);
          await showToast({
            style: Toast.Style.Success,
            title: "Successfully signed in!",
            message: "You're all set to use the extension",
          });
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [autoChecking]);

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
    if (!email.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Email required",
        message: "Please enter your email address",
      });
      return;
    }

    setIsSigningIn(true);
    try {
      // Open terminal with sign-in command
      await signIn(email.trim());
      
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal opened",
        message: "Complete sign-in in the terminal window",
      });
      
      setShowSignInForm(false);
      setAutoChecking(true); // Start auto-checking
      
      // Also show instructions
      await showToast({
        style: Toast.Style.Success,
        title: "Tip",
        message: "We'll automatically detect when you're signed in",
      });
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open terminal",
        message: error.message || "Please try again",
      });
      setIsSigningIn(false);
    }
  }

  if (isChecking) {
    return (
      <Detail
        markdown="# Checking Setup...\n\nPlease wait a moment."
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
              onAction={() => {
                setShowSignInForm(false);
                setIsSigningIn(false);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Sign In to 1Password"
          text="Enter your email address. A terminal window will open where you can complete sign-in."
        />
        <Form.TextField
          id="email"
          title="Email Address"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          autoFocus
          info="Your 1Password account email address"
        />
        {isSigningIn && (
          <Form.Description 
            title="Status" 
            text="Opening terminal... Complete the sign-in process in the terminal window. We'll automatically detect when you're done!" 
          />
        )}
      </Form>
    );
  }

  const markdown = `# Welcome to 1Password Extension! 🔐

${getStatusMarkdown(isInstalled, isAuthenticated)}

${getInstructionsMarkdown(isInstalled, isAuthenticated, autoChecking)}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isInstalled && (
            <Action
              title="Open Installation Guide"
              icon={Icon.Link}
              onAction={() => open("https://developer.1password.com/docs/cli/get-started")}
            />
          )}
          {isInstalled && !isAuthenticated && (
            <>
              <Action
                title="Sign In (Just Enter Email)"
                icon={Icon.Lock}
                shortcut={{ modifiers: ["ctrl"], key: "s" }}
                onAction={() => setShowSignInForm(true)}
              />
              {autoChecking && (
                <Action
                  title="Stop Auto-Checking"
                  icon={Icon.Stop}
                  onAction={() => setAutoChecking(false)}
                />
              )}
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["ctrl"], key: "r" }}
                onAction={checkStatus}
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
        </ActionPanel>
      }
    />
  );
}

function getStatusMarkdown(isInstalled: boolean | null, isAuthenticated: boolean | null): string {
  if (!isInstalled) {
    return `## ❌ 1Password CLI Not Installed

Don't worry! It only takes a minute to install.`;
  }

  if (!isAuthenticated) {
    return `## ✅ CLI Installed | ❌ Not Signed In

Ready to sign in? It's super easy!`;
  }

  return `## ✅ All Set!

You're ready to use the extension!`;
}

function getInstructionsMarkdown(
  isInstalled: boolean | null,
  isAuthenticated: boolean | null,
  autoChecking: boolean
): string {
  if (!isInstalled) {
    return `### Quick Setup (2 minutes)

1. **Click the button below** to open the installation guide
2. **Download** the Windows installer
3. **Run** the installer (it's quick!)
4. **Come back here** and we'll help you sign in

That's it! 🎉`;
  }

  if (!isAuthenticated) {
    if (autoChecking) {
      return `### Sign-In in Progress

1. **Terminal window opened** - Complete sign-in there
2. **We're checking automatically** - No need to refresh!
3. **When done**, you'll see a success message

**Tip:** If you have the 1Password app open, sign-in will be instant!`;
    }

    return `### Easy Sign-In (30 seconds)

1. **Click "Sign In"** button above (or press \`Ctrl+S\`)
2. **Enter your email** address
3. **Terminal opens automatically** - just follow the prompts
4. **We'll detect** when you're done automatically!

**That's it!** No complicated steps. 🚀`;
  }

  return `### You're Ready to Go!

Try these commands:

- **Search Items** - Find and copy passwords instantly
- **Generate Password** - Create secure passwords
- **Manage Vaults** - Browse your vaults

Enjoy! 🎉`;
}
