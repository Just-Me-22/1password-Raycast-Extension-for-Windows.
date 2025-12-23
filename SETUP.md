## Project Setup

This document describes how to set up the project locally and prepare it for use with Raycast on Windows.

### 1. Prerequisites

- Windows 10 or later  
- [Raycast for Windows](https://www.raycast.com/windows)  
- [1Password desktop application](https://1password.com/downloads/windows)  
- [1Password CLI](https://developer.1password.com/docs/cli/get-started)  
- Node.js 18 or later  
- Git

### 2. Clone and Install

1. Clone the repository:
   ```bash
   git clone https://github.com/Just-Me-22/1password-Raycast-Extension-for-Windows..git
   cd "1password-Raycast-Extension-for-Windows."
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Icon Setup

Raycast extensions require an `icon.png` file in the project root.

- File name: `icon.png`  
- Recommended size: 512x512 pixels  
- Format: PNG

Add your icon file before building the extension.

### 4. 1Password CLI and Desktop App Configuration

1. Install and open the 1Password desktop app.
2. Unlock your account.
3. Enable CLI integration:
   - Open the 1Password app.
   - Go to **Settings → Developer**.
   - Enable **Integrate with 1Password CLI**.
4. Verify that the CLI can communicate with 1Password by running these commands in PowerShell:
   ```bash
   op whoami
   op vault list --format json
   op item list --format json | Select-Object -First 5
   ```
   All three commands should succeed before using the Raycast extension.

### 5. Build the Extension

To build the extension for use in Raycast:

```bash
npm run build
```

The compiled extension will be output to the `dist` directory.

### 6. Import into Raycast

1. Open Raycast for Windows.
2. Open the Extensions view.
3. Choose to import an extension from a local directory.
4. Select the compiled extension from the `dist` folder.

### 7. Development Workflow

For iterative development, you can run:

```bash
npm run dev
```

This will watch for changes and rebuild the extension as you work.

