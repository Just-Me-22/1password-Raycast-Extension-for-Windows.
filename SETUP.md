# Setup Instructions

## GitHub Repository Setup

Since GitHub CLI is not installed, you'll need to create the repository manually:

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `raycast-1password-extension`
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. After creating the repository, run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/raycast-1password-extension.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Icon Setup

Raycast extensions require an `icon.png` file (512x512 pixels recommended). 

You can:
1. Create your own icon (1Password-themed)
2. Use a 1Password logo (ensure you have permission)
3. Use a simple placeholder icon

To add an icon:
- Place a PNG file named `icon.png` in the root directory
- Recommended size: 512x512 pixels
- The icon will be displayed in Raycast's extension list

## Development Setup

1. Make sure you have:
   - Node.js 18+ installed
   - 1Password CLI installed and authenticated (`op signin`)
   - Raycast for Windows installed

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open Raycast and import the extension from the `dist` folder

## Testing

Run in development mode:
```bash
npm run dev
```

This will watch for changes and reload the extension automatically.

