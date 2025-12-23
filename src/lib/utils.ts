import { Icon } from "@raycast/api";
import { OnePasswordItem, SearchResult } from "./types";

export function searchItems(items: OnePasswordItem[], query: string): SearchResult[] {
  if (!query.trim()) {
    return items.map((item) => ({ item }));
  }

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const item of items) {
    const matchedFields: string[] = [];
    let score = 0;

    // Title match (highest priority)
    if (item.title.toLowerCase().includes(lowerQuery)) {
      matchedFields.push("title");
      score += 10;
      if (item.title.toLowerCase().startsWith(lowerQuery)) {
        score += 5; // Bonus for prefix match
      }
    }

    // URL match
    if (item.urls) {
      for (const url of item.urls) {
        if (url.href.toLowerCase().includes(lowerQuery)) {
          matchedFields.push("url");
          score += 3;
        }
      }
    }

    // Field value match
    if (item.fields) {
      for (const field of item.fields) {
        if (field.value && field.value.toLowerCase().includes(lowerQuery)) {
          matchedFields.push(field.label);
          score += 2;
        }
        if (field.label.toLowerCase().includes(lowerQuery)) {
          matchedFields.push(field.label);
          score += 1;
        }
      }
    }

    // Notes match
    if (item.notesPlain && item.notesPlain.toLowerCase().includes(lowerQuery)) {
      matchedFields.push("notes");
      score += 1;
    }

    if (score > 0) {
      results.push({
        item,
        score,
        matchedFields: [...new Set(matchedFields)],
      });
    }
  }

  // Sort by score (highest first)
  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
}

export function getCategoryIcon(category: string): Icon {
  const iconMap: Record<string, Icon> = {
    Login: Icon.Lock,
    Password: Icon.Key,
    "Credit Card": Icon.CreditCard,
    "Secure Note": Icon.Document,
    Identity: Icon.Person,
    "Bank Account": Icon.BankNote,
    Database: Icon.HardDrive,
    DriverLicense: Icon.Document,
    EmailAccount: Icon.Envelope,
    OutdoorLicense: Icon.Tag,
    Passport: Icon.Document,
    RewardsProgram: Icon.Gift,
    SocialSecurityNumber: Icon.Document,
    SoftwareLicense: Icon.Circle,
    SSHKey: Icon.WrenchScrewdriver,
    WirelessRouter: Icon.Signal0,
    Server: Icon.ComputerChip,
    API: Icon.Plug,
  };

  return iconMap[category] || Icon.Tag;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function maskPassword(password: string): string {
  return "•".repeat(Math.min(password.length, 20));
}

export function getFieldByLabel(item: OnePasswordItem, label: string): string | undefined {
  return item.fields?.find((f) => f.label.toLowerCase() === label.toLowerCase())?.value;
}

export function getFieldByPurpose(item: OnePasswordItem, purpose: string): string | undefined {
  return item.fields?.find((f) => f.purpose?.toLowerCase() === purpose.toLowerCase())?.value;
}

export function getOTPField(item: OnePasswordItem): string | undefined {
  const otpField = item.fields?.find(
    (f) => f.type === "otp" || f.label.toLowerCase().includes("otp") || f.label.toLowerCase().includes("totp")
  );
  return otpField?.value;
}

