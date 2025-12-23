/**
 * Type definitions for 1Password items and related structures
 */

export interface OnePasswordField {
  id: string;
  label: string;
  value: string;
  type: string;
  purpose?: string;
  section?: {
    id: string;
    label: string;
  };
}

export interface OnePasswordItem {
  id: string;
  title: string;
  vault: {
    id: string;
    name: string;
  };
  category: string;
  urls?: Array<{
    href: string;
    label?: string;
  }>;
  fields?: OnePasswordField[];
  notesPlain?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string;
}

export interface OnePasswordVault {
  id: string;
  name: string;
  type: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResult {
  item: OnePasswordItem;
  score?: number;
  matchedFields?: string[];
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export interface OPCLIError {
  message: string;
  code?: string;
  exitCode?: number;
}

