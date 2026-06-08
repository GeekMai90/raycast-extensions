import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  apiKey: string;
  clientId: string;
  topicId?: string;
  tags?: string;
  timezone?: string;
  baseUrl?: string;
};

export function getPreferences(): Required<
  Pick<Preferences, "apiKey" | "clientId" | "timezone" | "baseUrl">
> &
  Omit<Preferences, "apiKey" | "clientId" | "timezone" | "baseUrl"> {
  const preferences = getPreferenceValues<Preferences>();

  return {
    ...preferences,
    timezone: preferences.timezone?.trim() || "Asia/Shanghai",
    baseUrl: (
      preferences.baseUrl?.trim() || "https://openapi.biji.com"
    ).replace(/\/$/, ""),
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
