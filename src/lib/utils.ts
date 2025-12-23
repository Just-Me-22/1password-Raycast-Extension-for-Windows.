import { OnePasswordItem, SearchResult } from "./types";

/**
 * Searches items by title and other fields
 */
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

/**
 * Gets icon for item category
 */
export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    Login: "🔐",
    Password: "🔑",
    "Credit Card": "💳",
    "Secure Note": "📝",
    Identity: "👤",
    "Bank Account": "🏦",
    Database: "🗄️",
    DriverLicense: "🪪",
    EmailAccount: "📧",
    OutdoorLicense: "🎣",
    Passport: "📘",
    RewardsProgram: "🎁",
    SocialSecurityNumber: "🆔",
    SoftwareLicense: "💿",
    SSHKey: "🔧",
    WirelessRouter: "📡",
    Server: "🖥️",
    API: "🔌",
  };

  return iconMap[category] || "📦";
}

/**
 * Formats a date string for display
 */
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

/**
 * Masks a password for display
 */
export function maskPassword(password: string): string {
  return "•".repeat(Math.min(password.length, 20));
}

/**
 * Gets field by label from an item
 */
export function getFieldByLabel(item: OnePasswordItem, label: string): string | undefined {
  return item.fields?.find((f) => f.label.toLowerCase() === label.toLowerCase())?.value;
}

/**
 * Gets field by purpose (e.g., "username", "password")
 */
export function getFieldByPurpose(item: OnePasswordItem, purpose: string): string | undefined {
  return item.fields?.find((f) => f.purpose?.toLowerCase() === purpose.toLowerCase())?.value;
}

/**
 * Gets OTP field from an item (if available)
 */
export function getOTPField(item: OnePasswordItem): string | undefined {
  // Look for OTP in fields
  const otpField = item.fields?.find(
    (f) => f.type === "otp" || f.label.toLowerCase().includes("otp") || f.label.toLowerCase().includes("totp")
  );
  return otpField?.value;
}

