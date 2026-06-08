import { LocalStorage } from "@raycast/api";
import { DedaoApi, DedaoApiError, NoteDetail, NoteSummary } from "./dedaoApi";
import { getDailyNoteTitle, getTimestamp } from "./date";
import { getConfiguredTags, getPreferences } from "./preferences";
import { withDailyNoteLock } from "./lock";

const MAX_SEARCH_PAGES = 1;

type DailyNoteResult = {
  note: NoteDetail;
  title: string;
  created: boolean;
};

export async function getTodayDailyNote(): Promise<DailyNoteResult> {
  const context = getDailyContext();
  const existing = await findExistingDailyNote(context, {
    failOnCachedLookupError: false,
  });
  if (existing) {
    return existing;
  }

  return {
    note: {
      note_id: "",
      title: context.title,
      content: `# ${context.title}\n\n`,
    },
    title: context.title,
    created: false,
  };
}

export async function appendToTodayDailyNote(
  rawContent: string,
): Promise<DailyNoteResult & { entry: string }> {
  const content = rawContent.trim();
  if (!content) {
    throw new Error("请输入要追加的内容。");
  }

  return withDailyNoteLock(async () => {
    const context = getDailyContext();
    return appendWithRetry(context, content);
  });
}

function getDailyContext() {
  const preferences = getPreferences();
  const api = new DedaoApi({
    apiKey: preferences.apiKey,
    clientId: preferences.clientId,
    baseUrl: preferences.baseUrl,
  });
  const title = getDailyNoteTitle(new Date(), preferences.timezone);

  return {
    api,
    title,
    timezone: preferences.timezone,
    tags: getConfiguredTags(preferences.tags),
    topicId: preferences.topicId?.trim(),
  };
}

async function appendWithRetry(
  context: ReturnType<typeof getDailyContext>,
  content: string,
  retried = false,
): Promise<DailyNoteResult & { entry: string }> {
  const ensured = await ensureDailyNote(context);
  const entry = formatLogEntry(content, context.timezone);
  const nextContent = appendEntry(
    ensured.note.content ?? "",
    entry,
    ensured.title,
  );

  try {
    await context.api.updateNoteContent(
      String(ensured.note.note_id),
      ensured.title,
      nextContent,
    );
  } catch (error) {
    if (!retried && isMissingNoteError(error)) {
      await LocalStorage.removeItem(cacheKey(context.title));
      return appendWithRetry(context, content, true);
    }

    throw error;
  }

  return {
    ...ensured,
    note: {
      ...ensured.note,
      content: nextContent,
    },
    entry,
  };
}

async function ensureDailyNote(
  context: ReturnType<typeof getDailyContext>,
): Promise<DailyNoteResult> {
  const existing = await findExistingDailyNote(context, {
    failOnCachedLookupError: true,
  });
  if (existing) {
    return existing;
  }

  const created = await context.api.savePlainTextNote({
    title: context.title,
    content: `# ${context.title}\n\n`,
    tags: context.tags,
    topicId: context.topicId,
  });
  const noteId = String(created.note_id);

  await LocalStorage.setItem(cacheKey(context.title), noteId);
  const note: NoteDetail = {
    note_id: noteId,
    title: context.title,
    content: `# ${context.title}\n\n`,
  };

  return { note, title: context.title, created: true };
}

async function findExistingDailyNote(
  context: ReturnType<typeof getDailyContext>,
  options: { failOnCachedLookupError: boolean },
): Promise<DailyNoteResult | undefined> {
  const cachedNoteId = await LocalStorage.getItem<string>(
    cacheKey(context.title),
  );

  if (cachedNoteId) {
    try {
      const note = await context.api.getNoteDetail(cachedNoteId);
      if (note.title === context.title) {
        return { note, title: context.title, created: false };
      }
    } catch (error) {
      if (isMissingNoteError(error)) {
        await LocalStorage.removeItem(cacheKey(context.title));
      } else if (options.failOnCachedLookupError) {
        throw error;
      }
    }
  }

  const existing = await findDailyNote(context.api, context.title);
  if (existing) {
    await LocalStorage.setItem(
      cacheKey(context.title),
      String(existing.note_id),
    );
    try {
      const note = await context.api.getNoteDetail(String(existing.note_id));
      return { note, title: context.title, created: false };
    } catch (error) {
      if (isMissingNoteError(error)) {
        await LocalStorage.removeItem(cacheKey(context.title));
        return undefined;
      }

      throw error;
    }
  }

  return undefined;
}

async function findDailyNote(
  api: DedaoApi,
  title: string,
): Promise<NoteSummary | undefined> {
  let cursor: string | number | undefined;

  for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
    const data = await api.listNotes(cursor);
    const match = data.notes?.find((note) => note.title === title);
    if (match) {
      return match;
    }

    if (!data.has_more || data.cursor === undefined || data.cursor === cursor) {
      return undefined;
    }

    cursor = data.cursor;
  }

  return undefined;
}

function formatLogEntry(content: string, timezone: string): string {
  const timestamp = getTimestamp(new Date(), timezone);
  const normalized = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n  ");

  return `${timestamp} ${normalized}`;
}

function appendEntry(
  currentContent: string,
  entry: string,
  title: string,
): string {
  const base = currentContent.trimEnd() || `# ${title}`;
  return `${base}\n\n${entry}\n`;
}

function cacheKey(title: string): string {
  return `daily-note-id:${title}`;
}

function isMissingNoteError(error: unknown): boolean {
  if (!(error instanceof DedaoApiError || error instanceof Error)) {
    return false;
  }

  const message = error.message;
  const status = error instanceof DedaoApiError ? error.status : undefined;

  return (
    status === 404 ||
    message.includes("没有笔记") ||
    message.includes("笔记不存在") ||
    message.includes("不存在") ||
    message.includes("not found")
  );
}
