import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Detail,
} from "@raycast/api";
import { listVaults, listItemsInVault, isOPInstalled, isSignedIn } from "./lib/op-cli";
import { getCachedVaults, setCachedVaults } from "./lib/cache";
import { OnePasswordVault, OnePasswordItem } from "./lib/types";
import { getCategoryIcon } from "./lib/utils";

export default function ManageVaults() {
  const [vaults, setVaults] = useState<OnePasswordVault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVaults();
  }, []);

  async function loadVaults() {
    setIsLoading(true);
    setError(null);

    try {
      // Check if CLI is installed
      const installed = await isOPInstalled();
      if (!installed) {
        setError("1Password CLI is not installed. Please install it from https://developer.1password.com/docs/cli");
        setIsLoading(false);
        return;
      }

      // Check if signed in
      const signedIn = await isSignedIn();
      if (!signedIn) {
        setError("Please sign in to 1Password CLI. Run 'op signin' in your terminal.");
        setIsLoading(false);
        return;
      }

      // Try to load from cache first
      const cached = getCachedVaults();
      if (cached) {
        setVaults(cached);
        setIsLoading(false);
      }

      // Load fresh data
      const allVaults = await listVaults();
      setVaults(allVaults);
      setCachedVaults(allVaults);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load vaults");
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Failed to load vaults",
      });
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\n## Solutions\n\n1. Install 1Password CLI from [developer.1password.com](https://developer.1password.com/docs/cli)\n2. Sign in using: \`op signin\`\n3. Make sure 1Password app is running`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setError(null);
                loadVaults();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search vaults..."
    >
      {vaults.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Folder} title="No vaults found" />
      ) : (
        vaults.map((vault) => (
          <List.Item
            key={vault.id}
            icon={Icon.Folder}
            title={vault.name}
            subtitle={vault.type}
            accessories={[
              vault.itemCount !== undefined ? { text: `${vault.itemCount} items` } : {},
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Browse Items"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={() => {
                      // Navigate to items in this vault
                      showToast({
                        style: Toast.Style.Success,
                        title: "Opening vault",
                        message: `Browsing items in ${vault.name}`,
                      });
                      // In a full implementation, this would navigate to a filtered search view
                    }}
                  />
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => {
                      // Show vault details
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadVaults}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

