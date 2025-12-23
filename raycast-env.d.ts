/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `setup` command */
  export type Setup = ExtensionPreferences & {}
  /** Preferences accessible in the `search-items` command */
  export type SearchItems = ExtensionPreferences & {}
  /** Preferences accessible in the `generate-password` command */
  export type GeneratePassword = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-vaults` command */
  export type ManageVaults = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `setup` command */
  export type Setup = {}
  /** Arguments passed to the `search-items` command */
  export type SearchItems = {}
  /** Arguments passed to the `generate-password` command */
  export type GeneratePassword = {}
  /** Arguments passed to the `manage-vaults` command */
  export type ManageVaults = {}
}

