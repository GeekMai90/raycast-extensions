# 得到每日笔记 Raycast 扩展

一个 Raycast 扩展，用来把带时间戳的内容快速追加到得到大脑（原 Get 笔记）的每日笔记里。

English README: [README.md](./README.md)

## 功能

- 在 Raycast Root Search 中快速记录。
- 当天每日笔记不存在时自动创建。
- 自动加当前时间戳。
- 查看当天每日笔记内容。
- 将剪贴板文本追加到当天每日笔记。
- 可选保存到指定得到大脑知识库。
- 本地缓存每日笔记 ID；如果远端笔记被删除，会自动恢复并重新创建。
- 对得到大脑 OpenAPI 做了基础节流和限流重试。

## 命令

| 命令                   | 说明                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `快速添加到每日笔记`   | 从 Raycast 输入框快速追加内容。建议设置 alias，例如 `dl`。 |
| `追加到今日笔记`       | 打开表单输入内容。                                         |
| `追加剪贴板到今日笔记` | 把剪贴板文本追加到今日笔记。                               |
| `查看今日笔记`         | 读取并显示今日笔记。                                       |

## 快速记录

Raycast 的 alias 是用户本地配置，扩展不能强制预设。推荐这样设置：

1. 在 Raycast 中搜索 `快速添加到每日笔记`。
2. 选中命令。
3. 按 `Cmd + K`。
4. 选择 `Configure Command`。
5. 把 alias 设置成 `dl`。

之后就可以这样使用：

```text
dl -> 空格/Tab -> 输入内容 -> 回车
```

回车后 Raycast 窗口会立刻关闭，扩展在后台写入得到大脑，成功后显示底部 HUD 提示。

## 笔记格式

每日笔记标题：

```text
2026-06-08 每日笔记
```

追加内容格式：

```text
09:31 记录一个新的想法
```

当前版本不使用 Markdown 无序列表，只追加普通文本。

## 设置项

| 设置项         | 必填 | 说明                                                                            |
| -------------- | ---- | ------------------------------------------------------------------------------- |
| `API Key`      | 是   | 得到大脑 OpenAPI 的 `Authorization` header。                                    |
| `Client ID`    | 是   | 得到大脑 OpenAPI 的 `X-Client-ID` header。                                      |
| `知识库 ID`    | 否   | 可选 `topic_id`。新建每日笔记时会保存到该知识库；已存在的每日笔记不会自动迁移。 |
| `标签`         | 否   | 创建每日笔记时添加的标签。                                                      |
| `时区`         | 否   | 用于生成每日笔记标题和时间戳，默认 `Asia/Shanghai`。                            |
| `API Base URL` | 否   | 默认 `https://openapi.biji.com`。                                               |

## 如何找到知识库 ID

调用得到大脑的知识库列表接口：

```bash
curl 'https://openapi.biji.com/open/api/v1/resource/knowledge/list?page=1' \
  -H 'Authorization: YOUR_API_KEY' \
  -H 'X-Client-ID: YOUR_CLIENT_ID'
```

返回的 `topics[]` 中会包含：

```json
{
  "topic_id": "abc123",
  "name": "我的知识库"
}
```

把 `topic_id` 填到 Raycast 设置里的 `知识库 ID` 即可。

注意：订阅知识库是只读的，不能写入每日笔记。

## 本地开发

```bash
npm install
npm run dev
```

验证：

```bash
npm run build
npm run lint
```

## API 说明

得到大脑 OpenAPI 目前没有原子 append 接口，所以扩展采用：

```text
读取笔记详情 -> 本地拼接新内容 -> 更新整篇笔记
```

为了降低连续触发时的覆盖风险，扩展使用了本地写入锁，并对 API 请求做了基础节流和 429 限流重试。

## 开源协议

MIT
