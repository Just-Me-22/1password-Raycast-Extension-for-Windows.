import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { generatePassword, isOPInstalled, isSignedIn } from "../lib/op-cli";
import { PasswordGeneratorOptions } from "../lib/types";

export default function GeneratePassword() {
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [length, setLength] = useState<number>(20);
  const [uppercase, setUppercase] = useState<boolean>(true);
  const [lowercase, setLowercase] = useState<boolean>(true);
  const [numbers, setNumbers] = useState<boolean>(true);
  const [symbols, setSymbols] = useState<boolean>(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      // Check if CLI is installed
      const installed = await isOPInstalled();
      if (!installed) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "1Password CLI is not installed",
        });
        setIsGenerating(false);
        return;
      }

      // Check if signed in
      const signedIn = await isSignedIn();
      if (!signedIn) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Please sign in to 1Password CLI",
        });
        setIsGenerating(false);
        return;
      }

      // Validate at least one character set is selected
      if (!uppercase && !lowercase && !numbers && !symbols) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Please select at least one character set",
        });
        setIsGenerating(false);
        return;
      }

      const options: PasswordGeneratorOptions = {
        length,
        uppercase,
        lowercase,
        numbers,
        symbols,
        excludeAmbiguous,
      };

      const password = await generatePassword(options);
      setGeneratedPassword(password);
      setIsGenerating(false);
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message || "Failed to generate password",
      });
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (generatedPassword) {
      await Clipboard.copy(generatedPassword);
      await showToast({
        style: Toast.Style.Success,
        title: "Password copied",
        message: "Password copied to clipboard",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Generate Password"
            icon={Icon.Key}
            onAction={handleGenerate}
          />
          {generatedPassword && (
            <Action
              title="Copy Password"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={handleCopy}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Password Generator"
        text="Generate a secure password using 1Password CLI"
      />
      
      {generatedPassword && (
        <Form.Description
          title="Generated Password"
          text={generatedPassword}
        />
      )}

      <Form.Separator />

      <Form.TextField
        id="length"
        title="Length"
        value={length.toString()}
        onChange={(value) => {
          const num = parseInt(value, 10);
          if (!isNaN(num) && num >= 8 && num <= 128) {
            setLength(num);
          }
        }}
        info="Password length (8-128 characters)"
      />

      <Form.Checkbox
        id="uppercase"
        title="Include Uppercase Letters"
        label="A-Z"
        value={uppercase}
        onChange={setUppercase}
      />

      <Form.Checkbox
        id="lowercase"
        title="Include Lowercase Letters"
        label="a-z"
        value={lowercase}
        onChange={setLowercase}
      />

      <Form.Checkbox
        id="numbers"
        title="Include Numbers"
        label="0-9"
        value={numbers}
        onChange={setNumbers}
      />

      <Form.Checkbox
        id="symbols"
        title="Include Symbols"
        label="!@#$%^&*"
        value={symbols}
        onChange={setSymbols}
      />

      <Form.Checkbox
        id="excludeAmbiguous"
        title="Exclude Ambiguous Characters"
        label="Exclude similar looking characters (0, O, l, 1, etc.)"
        value={excludeAmbiguous}
        onChange={setExcludeAmbiguous}
      />

      {isGenerating && (
        <Form.Description title="Status" text="Generating password..." />
      )}
    </Form>
  );
}

