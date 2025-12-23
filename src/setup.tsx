import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  open,
  Form,
} from "@raycast/api";
import { isOPInstalled, isSignedIn, signInWithCredentials, checkDesktopAppIntegration } from "./lib/op-cli";

export default function Setup() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasDesktopApp, setHasDesktopApp] = useState<boolean | null>(null);
  const [signInMethod, setSignInMethod] = useState<"desktop" | "credentials" | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setIsChecking(true);
    try {
      const installed = await isOPInstalled();
      setIsInstalled(installed);

      if (installed) {
        // Check for desktop app integration
        const desktopAppAvailable = await checkDesktopAppIntegration();
        setHasDesktopApp(desktopAppAvailable);

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

  async function handleDesktopAppSignIn() {
    setIsSigningIn(true);
    setSignInMethod("desktop");
    
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Connecting to 1Password app...",
        message: "Please wait",
      });
      
      // Try sign-in - desktop app integration should handle it automatically
      const success = await signInWithCredentials();
      
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Successfully signed in!",
          message: "Desktop app integration worked perfectly",
        });
        
        setIsSigningIn(false);
        await checkStatus();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Desktop app integration not working",
          message: "Please ensure 1Password app is open, unlocked, and CLI integration is enabled",
        });
        setIsSigningIn(false);
      }
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign-in failed",
        message: error.message || "Please check desktop app integration settings",
      });
      setIsSigningIn(false);
    }
  }

  async function handleCredentialSignIn() {
    if (!email.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Email required",
        message: "Please enter your email address",
      });
      return;
    }

    setIsSigningIn(true);
    setSignInMethod("credentials");
    
    try {
      // Try sign-in with email - if desktop app is integrated, it should work
      // If not, it will guide the user
      const success = await signInWithCredentials(email.trim());
      
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Successfully signed in!",
          message: "You're all set to use the extension",
        });
        
        setShowSignInForm(false);
        setIsSigningIn(false);
        setEmail("");
        await checkStatus();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Sign-in needs desktop app",
          message: "Please enable CLI integration in 1Password app settings",
        });
        setIsSigningIn(false);
      }
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign-in failed",
        message: error.message || "Please enable desktop app integration for automatic sign-in",
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
              onAction={handleCredentialSignIn}
            />
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["ctrl"], key: "escape" }}
              onAction={() => {
                setShowSignInForm(false);
                setIsSigningIn(false);
                setEmail("");
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Sign In to 1Password"
          text="Enter your email. If you have the 1Password desktop app open with CLI integration enabled, sign-in will be automatic!"
        />
        <Form.TextField
          id="email"
          title="Email Address"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          autoFocus
          info="Your 1Password account email. Desktop app integration makes this automatic!"
        />
        {isSigningIn && (
          <Form.Description 
            title="Status" 
            text="Signing in... If desktop app is open, this will be instant!" 
          />
        )}
        <Form.Description
          title="💡 Tip"
          text="For the easiest experience, open the 1Password app and enable CLI integration in Settings → Developer. Then sign-in becomes automatic!"
        />
      </Form>
    );
  }

  const markdown = `# Welcome to 1Password Extension! 🔐

${getStatusMarkdown(isInstalled, isAuthenticated, hasDesktopApp)}

${getInstructionsMarkdown(isInstalled, isAuthenticated, hasDesktopApp, isSigningIn, signInMethod)}
`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isSigningIn}
      actions={
        <ActionPanel>
          {!isInstalled && (
            <Action
              title="Open Installation Guide"
              icon={Icon.Link}
              onAction={() => open("https://developer.1password.com/docs/cli/get-started")}
            />
          )}
          {isInstalled && !isAuthenticated && !isSigningIn && (
            <>
              <Action
                title="Sign In with Desktop App (Easiest!)"
                icon={Icon.Star}
                shortcut={{ modifiers: ["ctrl"], key: "d" }}
                onAction={handleDesktopAppSignIn}
              />
              <Action
                title="Sign In with Email"
                icon={Icon.Lock}
                shortcut={{ modifiers: ["ctrl"], key: "s" }}
                onAction={() => setShowSignInForm(true)}
              />
              <Action
                title="Open Desktop App Integration Guide"
                icon={Icon.Gear}
                onAction={() => {
                  open("https://developer.1password.com/docs/cli/app-integration");
                }}
              />
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

function getStatusMarkdown(
  isInstalled: boolean | null,
  isAuthenticated: boolean | null,
  hasDesktopApp: boolean | null
): string {
  if (!isInstalled) {
    return `## ❌ 1Password CLI Not Installed

Don't worry! It only takes a minute to install.`;
  }

  if (!isAuthenticated) {
    let desktopAppNote = "";
    if (hasDesktopApp) {
      desktopAppNote = "\n\n⭐ **Great news!** Desktop app integration is available. Sign-in can be automatic!";
    }
    
    return `## ✅ CLI Installed | ❌ Not Signed In

Ready to sign in? Choose the easiest method!${desktopAppNote}`;
  }

  return `## ✅ All Set!

You're ready to use the extension!`;
}

function getInstructionsMarkdown(
  isInstalled: boolean | null,
  isAuthenticated: boolean | null,
  hasDesktopApp: boolean | null,
  isSigningIn: boolean,
  signInMethod: "desktop" | "credentials" | null
): string {
  if (!isInstalled) {
    return `### Quick Setup (2 minutes)

1. **Click the button below** to open the installation guide
2. **Download** the Windows installer  
3. **Run** the installer
4. **Come back here** to sign in

That's it! 🎉`;
  }

  if (!isAuthenticated) {
    if (isSigningIn) {
      if (signInMethod === "desktop") {
        return `### Signing In with Desktop App...

**Please wait** while we connect to your 1Password app.

If the app is open and unlocked, this should be instant! ⚡`;
      }
      return `### Signing In...

**Please wait** while we authenticate.

If you have the desktop app open with CLI integration enabled, this will be automatic! ⚡`;
    }

    if (hasDesktopApp) {
      return `### Two Easy Ways to Sign In

#### ⭐ Option 1: Desktop App (Recommended - Instant!)
1. **Make sure 1Password app is open** and unlocked
2. **Enable CLI integration** (if not already):
   - Open 1Password app
   - Settings → Developer → "Integrate with 1Password CLI" ✅
3. **Click "Sign In with Desktop App"** above (or press \`Ctrl+D\`)
4. **Done!** No password needed - uses Windows Hello! 🎉

#### Option 2: Email Sign-In
1. **Click "Sign In with Email"** above (or press \`Ctrl+S\`)
2. **Enter your email**
3. **If desktop app is integrated**, sign-in is automatic!
4. **If not**, you'll be guided to enable integration

**Which is better?**
- Desktop app = **Fastest, most secure** (Windows Hello, no password typing)
- Email = Works but requires desktop app integration for automation`;
    }

    return `### Easy Sign-In

#### Recommended: Desktop App Integration
1. **Install 1Password desktop app** (if not already)
2. **Open the app** and unlock it
3. **Enable CLI integration**:
   - Settings → Developer → "Integrate with 1Password CLI" ✅
4. **Click "Sign In with Desktop App"** above
5. **Done!** Instant and secure! ⚡

#### Alternative: Email Sign-In
1. **Click "Sign In with Email"** above
2. **Enter your email**
3. **Follow the prompts** to complete sign-in

**💡 Pro Tip:** Desktop app integration makes everything automatic and uses Windows Hello for security!`;
  }

  return `### You're Ready to Go!

Try these commands:

- **Search Items** - Find and copy passwords instantly
- **Generate Password** - Create secure passwords  
- **Manage Vaults** - Browse your vaults

Enjoy! 🎉`;
}
