import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { createLoginItem, isOPInstalled, isSignedIn, listVaults } from "./lib/op-cli";
import { OnePasswordVault } from "./lib/types";

export default function NewLoginItem() {
  const [vaults, setVaults] = useState<OnePasswordVault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadVaults() {
      try {
        const installed = await isOPInstalled();
        if (!installed) {
          await showToast({
            style: Toast.Style.Failure,
            title: "1Password CLI is not installed",
            message: "Install it from https://developer.1password.com/docs/cli",
          });
          return;
        }

        const signedIn = await isSignedIn();
        if (!signedIn) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Not signed in",
            message: "Run 'op signin' in PowerShell, then try again.",
          });
          return;
        }

        const allVaults = await listVaults();
        setVaults(allVaults);
        if (allVaults.length > 0) {
          setSelectedVaultId(allVaults[0].id);
        }
      } catch (error: any) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load vaults",
          message: error.message || "Check 1Password CLI configuration.",
        });
      }
    }

    loadVaults();
  }, []);

  async function handleSubmit(values: {
    title: string;
    username?: string;
    password?: string;
    url?: string;
    notes?: string;
  }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating item..." });

      await createLoginItem({
        title: values.title,
        vaultId: selectedVaultId,
        username: values.username,
        password: values.password,
        url: values.url,
        notes: values.notes,
      });

      await showToast({ style: Toast.Style.Success, title: "Item created" });
    } catch (error: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create item",
        message: error.message || "Check 1Password CLI configuration.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Login Item" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Example.com" autoFocus />

      <Form.Dropdown id="vault" title="Vault" value={selectedVaultId} onChange={setSelectedVaultId}>
        {vaults.map((vault) => (
          <Form.Dropdown.Item key={vault.id} value={vault.id} title={vault.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="username" title="Username" placeholder="user@example.com" />
      <Form.PasswordField id="password" title="Password" placeholder="Password" />
      <Form.TextField id="url" title="URL" placeholder="https://example.com" />
      <Form.TextArea id="notes" title="Notes" placeholder="Optional notes" />
    </Form>
  );
}


