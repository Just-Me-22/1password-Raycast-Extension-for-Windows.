# 1Password Extension for Raycast (Windows)

A 1Password extension for Raycast on Windows that allows you to search, copy, and manage your 1Password items directly from Raycast.

## Features

- **Search Items** – Quickly search and browse your 1Password items
- **Copy Credentials** – Copy passwords, usernames, and OTP codes with a single action
- **Generate Passwords** – Create secure passwords with configurable options
- **Manage Vaults** – View and manage your 1Password vaults
- **View Details** – Inspect item details from within Raycast

## Prerequisites

- [Raycast for Windows](https://www.raycast.com/windows)
- [1Password CLI](https://developer.1password.com/docs/cli) installed
- 1Password desktop application installed
- Node.js 18 or later (for development)

## Installation

1. Clone this repository.
2. Install dependencies: `npm install`.
3. Add an `icon.png` file (512x512 pixels) to the project root (see [SETUP.md](SETUP.md)).
4. Build the extension: `npm run build`.
5. Open Raycast and import the extension from the generated `dist` directory.

For more detailed setup instructions, see [SETUP.md](SETUP.md).

## 1Password CLI and Desktop App

The extension uses the 1Password CLI for all operations. Before using the extension, ensure that:

1. The 1Password desktop app is installed, running, and unlocked.
2. CLI integration is enabled in the desktop app under **Settings → Developer → Integrate with 1Password CLI**.
3. The following commands work in a PowerShell window:
   ```bash
   op whoami
   op vault list --format json
   op item list --format json | Select-Object -First 5
   ```

If any of these commands fail, resolve the CLI or desktop app configuration before using the extension.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Commands

### Search Items
Search and browse your 1Password items. Filter by vault or category, and quickly copy credentials.

### Generate Password
Generate secure passwords with configurable length and character sets.

### Manage Vaults
List your 1Password vaults and inspect vault details.

## License

MIT

