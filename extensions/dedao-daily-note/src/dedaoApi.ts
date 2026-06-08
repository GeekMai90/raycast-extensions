export type NoteSummary = {
  note_id: string;
  title?: string;
  content?: string;
  note_type?: string;
  created_at?: string;
  updated_at?: string;
};

export type NoteDetail = NoteSummary & {
  tags?: Array<{ id?: string; name?: string } | string>;
};

type ApiResponse<T> = {
  success?: boolean;
  code?: number;
  message?: string;
  msg?: string;
  error?: {
    code?: number;
    message?: string;
    reason?: string;
  };
  data?: T;
};

type ListNotesData = {
  notes?: NoteSummary[];
  has_more?: boolean;
  cursor?: string | number;
};

type SaveNoteData = {
  note_id?: string | number;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

type NoteDetailData = {
  note?: NoteDetail;
};

export type DedaoApiOptions = {
  apiKey: string;
  clientId: string;
  baseUrl: string;
};

export class DedaoApiError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly reason?: string;

  constructor(
    message: string,
    options: { status?: number; code?: number; reason?: string } = {},
  ) {
    super(message);
    this.name = "DedaoApiError";
    this.status = options.status;
    this.code = options.code;
    this.reason = options.reason;
  }
}

const MIN_REQUEST_INTERVAL_MS = 1_200;
const MAX_RETRY_ATTEMPTS = 4;

let lastRequestAt = 0;

export class DedaoApi {
  private readonly apiKey: string;
  private readonly clientId: string;
  private readonly baseUrl: string;

  constructor(options: DedaoApiOptions) {
    this.apiKey = options.apiKey;
    this.clientId = options.clientId;
    this.baseUrl = options.baseUrl;
  }

  async listNotes(cursor?: string | number): Promise<ListNotesData> {
    const params = new URLSearchParams();
    if (cursor !== undefined && cursor !== "") {
      params.set("cursor", String(cursor));
    }

    return this.request<ListNotesData>(
      `/open/api/v1/resource/note/list${params.size ? `?${params}` : ""}`,
    );
  }

  async getNoteDetail(noteId: string): Promise<NoteDetail> {
    const data = await this.request<NoteDetailData>(
      `/open/api/v1/resource/note/detail?id=${encodeURIComponent(noteId)}`,
    );

    if (!data.note) {
      throw new DedaoApiError("笔记不存在", { status: 404 });
    }

    return data.note;
  }

  async savePlainTextNote(input: {
    title: string;
    content: string;
    tags?: string[];
    topicId?: string;
  }): Promise<SaveNoteData> {
    const data = await this.request<SaveNoteData>(
      "/open/api/v1/resource/note/save",
      {
        method: "POST",
        body: JSON.stringify({
          note_type: "plain_text",
          title: input.title,
          content: input.content,
          tags: input.tags?.length ? input.tags : undefined,
          topic_id: input.topicId?.trim() || undefined,
        }),
      },
    );

    if (!data.note_id) {
      throw new Error("API did not return note_id after creating note.");
    }

    return data;
  }

  async updateNoteContent(
    noteId: string,
    title: string,
    content: string,
  ): Promise<void> {
    await this.request("/open/api/v1/resource/note/update", {
      method: "POST",
      body: JSON.stringify({
        note_id: noteId,
        title,
        content,
      }),
    });
  }

  private async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
      await throttleRequests();

      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: this.apiKey,
          "X-Client-ID": this.clientId,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });

      const text = await response.text();
      const parsed = parseJson<ApiResponse<T>>(text);

      if (!response.ok) {
        const error = createApiError(response.status, parsed, text);

        if (response.status === 429 && attempt < MAX_RETRY_ATTEMPTS - 1) {
          lastError = error;
          await delay(getRetryDelay(attempt));
          continue;
        }

        throw error;
      }

      if (parsed && parsed.success === false) {
        throw createApiError(undefined, parsed, "");
      }

      return (parsed?.data ?? parsed) as T;
    }

    throw (
      lastError ??
      new Error(
        "得到大脑 API 请求频率超限，已自动重试但仍失败。请等几秒后再试。",
      )
    );
  }
}

async function throttleRequests() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await delay(MIN_REQUEST_INTERVAL_MS - elapsed);
  }

  lastRequestAt = Date.now();
}

function getRetryDelay(attempt: number): number {
  return 1_800 * (attempt + 1);
}

function createApiError<T>(
  status: number | undefined,
  parsed: ApiResponse<T> | undefined,
  rawText: string,
): DedaoApiError {
  if (status === 429) {
    const reason = parsed?.error?.reason ? `：${parsed.error.reason}` : "";
    return new DedaoApiError(
      `得到大脑 API 请求频率超限${reason}。已自动重试，请稍后再试。`,
      {
        status,
        code: parsed?.code ?? parsed?.error?.code,
        reason: parsed?.error?.reason,
      },
    );
  }

  const message =
    parsed?.message ||
    parsed?.msg ||
    parsed?.error?.message ||
    (status
      ? `得到大脑 API request failed: HTTP ${status} ${rawText}`
      : rawText) ||
    `得到大脑 API request failed with code ${parsed?.code ?? parsed?.error?.code ?? "unknown"}.`;

  return new DedaoApiError(message, {
    status,
    code: parsed?.code ?? parsed?.error?.code,
    reason: parsed?.error?.reason,
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson<T>(text: string): T | undefined {
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`得到大脑 API returned invalid JSON: ${text}`);
  }
}
