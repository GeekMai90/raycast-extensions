import { getPreferenceValues } from "@raycast/api";

type ResolvedPreferences = Required<Pick<Preferences, "apiKey" | "clientId" | "timezone" | "baseUrl">> &
  Omit<Preferences, "apiKey" | "clientId" | "timezone" | "baseUrl">;

export function getPreferences(): ResolvedPreferences {
  const preferences = getPreferenceValues<Preferences>();

  return {
    ...preferences,
    timezone: preferences.timezone?.trim() || "Asia/Shanghai",
    baseUrl: (preferences.baseUrl?.trim() || "https://openapi.biji.com").replace(/\/$/, ""),
  };
}

export function getConfiguredTags(tags?: string): string[] {
  return (
    tags
      ?.split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}
