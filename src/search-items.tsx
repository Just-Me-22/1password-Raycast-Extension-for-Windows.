import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues, Detail, useNavigation, Clipboard, open, Form } from "@raycast/api";
import { listItems, isOPInstalled, isSignedIn, getPassword, getUsername, getField, editLoginItem } from "./lib/op-cli";
import { searchItems, getCategoryIcon, formatDate, getFieldByLabel as getFieldUtil, getOTPField, getFieldByPurpose } from "./lib/utils";
import { getCachedItems, setCachedItems } from "./lib/cache";
import { OnePasswordItem } from "./lib/types";

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
                    shortcut={{ modifiers: ["ctrl"], key: "p" }}
                    onAction={() => handleCopyPassword(item)}
                  />
                  <Action
                    title="Copy Username"
                    icon={Icon.Person}
                    shortcut={{ modifiers: ["ctrl"], key: "u" }}
                    onAction={() => handleCopyUsername(item)}
                  />
                  <Action
                    title="Copy OTP"
                    icon={Icon.Key}
                    shortcut={{ modifiers: ["ctrl"], key: "o" }}
                    onAction={() => handleCopyOTP(item)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                    onAction={() => push(<ItemDetailView item={item} />)}
                  />
                  <Action
                    title="Edit Item (Login only)"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["ctrl"], key: "e" }}
                    onAction={() => push(<EditItemForm item={item} onUpdated={loadItems} />)}
                  />
                  <Action
                    title="Open in Browser"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["ctrl"], key: "o" }}
                    onAction={() => {
                      const url = item.urls && item.urls.length > 0 ? item.urls[0].href : undefined;
                      if (url) {
                        open(url);
                      } else {
                        showToast({ style: Toast.Style.Failure, title: "No URL on item" });
                      }
                    }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["ctrl"], key: "r" }}
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
      markdown={`# ${item.title}\n\n**Vault:** ${item.vault.name}\n**Category:** ${item.category}\n**Last Updated:** ${formatDate(item.updatedAt)}\n\n## Fields\n\n${item.fields?.map((f: { label: string; type: string; value: string }) => `**${f.label}:** ${f.type === "concealed" ? "••••••••" : f.value}`).join("\n\n") || "No fields"}\n\n${item.notesPlain ? `## Notes\n\n${item.notesPlain}` : ""}`}
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

function EditItemForm({ item, onUpdated }: { item: OnePasswordItem; onUpdated: () => void }) {
  const { pop } = useNavigation();

  const initialUsername =
    getFieldByPurpose(item, "username") ||
    getFieldUtil(item, "username") ||
    getFieldUtil(item, "user name") ||
    "";

  const initialPassword =
    getFieldByPurpose(item, "password") ||
    getFieldUtil(item, "password") ||
    "";

  const initialUrl = item.urls && item.urls.length > 0 ? item.urls[0].href : "";

  async function handleSubmit(values: {
    title: string;
    username?: string;
    password?: string;
    url?: string;
    notes?: string;
  }) {
    if (item.category.toLowerCase() !== "login") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Editing supported for Login items only",
      });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving changes..." });

      await editLoginItem({
        id: item.id,
        title: values.title,
        username: values.username,
        password: values.password,
        url: values.url,
        notes: values.notes,
        vaultId: item.vault.id,
      });

      await showToast({ style: Toast.Style.Success, title: "Item updated" });
      onUpdated();
      pop();
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update item",
        message: error.message || "Check 1Password CLI configuration.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={item.title} />
      <Form.TextField id="username" title="Username" defaultValue={initialUsername} />
      <Form.PasswordField id="password" title="Password" defaultValue={initialPassword} />
      <Form.TextField id="url" title="URL" defaultValue={initialUrl} />
      <Form.TextArea id="notes" title="Notes" defaultValue={item.notesPlain || ""} />
    </Form>
  );
}

