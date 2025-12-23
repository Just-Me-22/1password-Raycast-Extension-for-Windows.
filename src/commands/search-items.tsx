import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Detail,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { listItems, isOPInstalled, isSignedIn, getPassword, getUsername, getField, getOTPField } from "../lib/op-cli";
import { searchItems, getCategoryIcon, formatDate, getFieldByLabel as getFieldUtil } from "../lib/utils";
import { getCachedItems, setCachedItems } from "../lib/cache";
import { OnePasswordItem } from "../lib/types";

export default function SearchItems() {
  const [items, setItems] = useState<OnePasswordItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<OnePasswordItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (searchText) {
      const results = searchItems(items, searchText);
      setFilteredItems(results.map((r) => r.item));
    } else {
      setFilteredItems(items);
    }
  }, [searchText, items]);

  async function loadItems() {
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
      const cached = getCachedItems();
      if (cached) {
        setItems(cached);
        setIsLoading(false);
      }

      // Load fresh data
      const allItems = await listItems();
      setItems(allItems);
      setCachedItems(allItems);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load items");
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Failed to load 1Password items",
      });
    }
  }

  async function handleCopyPassword(item: OnePasswordItem) {
    try {
      const password = await getPassword(item.id);
      await Clipboard.copy(password);
      await showToast({
        style: Toast.Style.Success,
        title: "Password copied",
        message: `Password for ${item.title} copied to clipboard`,
      });
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Failed to copy password",
      });
    }
  }

  async function handleCopyUsername(item: OnePasswordItem) {
    try {
      const username = await getUsername(item.id);
      await Clipboard.copy(username);
      await showToast({
        style: Toast.Style.Success,
        title: "Username copied",
        message: `Username for ${item.title} copied to clipboard`,
      });
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Failed to copy username",
      });
    }
  }

  async function handleCopyOTP(item: OnePasswordItem) {
    try {
      const otp = getOTPField(item);
      if (!otp) {
        // Try to get OTP via CLI - look for common OTP field names
        try {
          const otpValue = await getField(item.id, "one-time password");
          if (otpValue) {
            await Clipboard.copy(otpValue);
            await showToast({
              style: Toast.Style.Success,
              title: "OTP copied",
              message: `OTP for ${item.title} copied to clipboard`,
            });
            return;
          }
        } catch {
          // Field not found, continue
        }
        
        await showToast({
          style: Toast.Style.Failure,
          title: "No OTP",
          message: "This item does not have an OTP field",
        });
      } else {
        await Clipboard.copy(otp);
        await showToast({
          style: Toast.Style.Success,
          title: "OTP copied",
          message: `OTP for ${item.title} copied to clipboard`,
        });
      }
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Failed to copy OTP",
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
                loadItems();
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
      searchBarPlaceholder="Search 1Password items..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No items found" description="Try a different search term" />
      ) : (
        filteredItems.map((item) => (
          <List.Item
            key={item.id}
            icon={getCategoryIcon(item.category)}
            title={item.title}
            subtitle={item.vault.name}
            accessories={[
              { text: item.category },
              { text: formatDate(item.updatedAt), icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Password"
                    icon={Icon.Lock}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                    onAction={() => handleCopyPassword(item)}
                  />
                  <Action
                    title="Copy Username"
                    icon={Icon.Person}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    onAction={() => handleCopyUsername(item)}
                  />
                  <Action
                    title="Copy OTP"
                    icon={Icon.Key}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => handleCopyOTP(item)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={() => push(<ItemDetailView item={item} />)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadItems}
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

function ItemDetailView({ item }: { item: OnePasswordItem }) {
  return (
    <Detail
      markdown={`# ${item.title}\n\n**Vault:** ${item.vault.name}\n**Category:** ${item.category}\n**Last Updated:** ${formatDate(item.updatedAt)}\n\n## Fields\n\n${item.fields?.map((f) => `**${f.label}:** ${f.type === "concealed" ? "••••••••" : f.value}`).join("\n\n") || "No fields"}\n\n${item.notesPlain ? `## Notes\n\n${item.notesPlain}` : ""}`}
      actions={
        <ActionPanel>
          <Action
            title="Copy Password"
            icon={Icon.Lock}
            onAction={async () => {
              const password = await getPassword(item.id);
              await Clipboard.copy(password);
              await showToast({ style: Toast.Style.Success, title: "Password copied" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

