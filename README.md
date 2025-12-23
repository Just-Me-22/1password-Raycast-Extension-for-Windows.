# 1Password Extension for Raycast (Windows)

A full-featured 1Password extension for Raycast on Windows that allows you to search, copy, and manage your 1Password items directly from Raycast.

## Features

- 🔍 **Search Items** - Quickly search and browse all your 1Password items
- 🔐 **Copy Credentials** - Copy passwords, usernames, and OTP codes with a single keystroke
- 🎲 **Generate Passwords** - Create secure passwords with customizable options
- 📦 **Manage Vaults** - View and manage your 1Password vaults
- ✏️ **View & Edit** - View item details and edit items directly from Raycast

## Prerequisites

- [Raycast for Windows](https://www.raycast.com/windows) (beta)
- [1Password CLI](https://developer.1password.com/docs/cli) installed and authenticated
- Node.js 18+ (for development)

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Raycast and import the extension

## Setup

1. Install the 1Password CLI:
   - Download from [1Password Developer Portal](https://developer.1password.com/docs/cli/get-started)
   - Follow the installation instructions for Windows

2. Sign in to 1Password CLI:
   ```bash
   op signin
   ```

3. The extension will automatically detect your 1Password CLI installation and use it to access your items.

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
Generate secure passwords with customizable length and character sets.

### Manage Vaults
View all your 1Password vaults and browse items within each vault.

## License

MIT

