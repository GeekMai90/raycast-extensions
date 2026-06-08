# Dedao Daily Note for Raycast

A Raycast extension for appending timestamped entries to a daily note in 得到大脑, formerly Get 笔记.

中文文档：[README.zh-CN.md](./README.zh-CN.md)

## Features

- Quick capture from Raycast Root Search with an argument command.
- Automatically creates today's daily note when needed.
- Appends entries with the current timestamp.
- Reads and previews today's daily note.
- Appends clipboard text to today's daily note.
- Optional knowledge base `topic_id` support.
- Local note ID cache with recovery when the remote note was deleted.
- Basic request throttling and retry handling for 得到大脑 OpenAPI rate limits.

## Commands

| Command                | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `快速添加到每日笔记`   | Quick append from Raycast Root Search. Set an alias such as `dl` for the best experience. |
| `追加到今日笔记`       | Opens a form for adding an entry.                                                         |
| `追加剪贴板到今日笔记` | Appends clipboard text.                                                                   |
| `查看今日笔记`         | Loads and displays today's note.                                                          |

## Quick Capture

Raycast aliases are configured by the user, not by the extension manifest. Recommended setup:

1. Search for `快速添加到每日笔记` in Raycast.
2. Select the command.
3. Press `Cmd + K`.
4. Choose `Configure Command`.
5. Set the alias to `dl`.

Then use:

```text
dl -> Space/Tab -> type your entry -> Enter
```

The command closes Raycast immediately, writes in the background, and shows a HUD when the entry is saved.

## Note Format

Daily note title:

```text
2026-06-08 每日笔记
```

Entry format:

```text
09:31 Write down a new idea
```

The extension intentionally uses plain text entries instead of Markdown bullet lists.

## Preferences

| Preference     | Required | Description                                                                                                              |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `API Key`      | Yes      | 得到大脑 OpenAPI `Authorization` header.                                                                                 |
| `Client ID`    | Yes      | 得到大脑 OpenAPI `X-Client-ID` header.                                                                                   |
| `知识库 ID`    | No       | Optional `topic_id`. New daily notes are created inside this knowledge base. Existing notes are not moved automatically. |
| `标签`         | No       | Tags added when a daily note is created.                                                                                 |
| `时区`         | No       | Timezone used for note titles and timestamps. Defaults to `Asia/Shanghai`.                                               |
| `API Base URL` | No       | Defaults to `https://openapi.biji.com`.                                                                                  |

## Finding a Knowledge Base ID

Use the 得到大脑 knowledge list API:

```bash
curl 'https://openapi.biji.com/open/api/v1/resource/knowledge/list?page=1' \
  -H 'Authorization: YOUR_API_KEY' \
  -H 'X-Client-ID: YOUR_CLIENT_ID'
```

Find the `topic_id` from the returned `topics[]` list and paste it into the extension preferences.

Subscribed knowledge bases are read-only and cannot be used for writing daily notes.

## Development

```bash
npm install
npm run dev
```

Validate:

```bash
npm run build
npm run lint
```

## API Notes

得到大脑 OpenAPI currently does not expose an atomic append endpoint. This extension reads the existing note body, appends the new entry locally, and updates the full note content.

To reduce accidental overwrites, the extension uses a local write lock. It also throttles API calls and retries transient rate-limit responses.

## License

MIT
