export function getDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

export function getDailyNoteTitle(date: Date, timezone: string): string {
  const parts = getDateParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day} 每日笔记`;
}

export function getTimestamp(date: Date, timezone: string): string {
  const parts = getDateParts(date, timezone);
  return `${parts.hour}:${parts.minute}`;
}
