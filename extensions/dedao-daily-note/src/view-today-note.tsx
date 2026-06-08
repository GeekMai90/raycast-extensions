import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getTodayDailyNote } from "./dailyNote";

type ViewState = {
  isLoading: boolean;
  title: string;
  markdown: string;
  error?: string;
};

export default function Command() {
  const [state, setState] = useState<ViewState>({
    isLoading: true,
    title: "今日笔记",
    markdown: "",
  });

  async function load() {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: undefined,
    }));

    try {
      const result = await getTodayDailyNote();
      setState({
        isLoading: false,
        title: result.title,
        markdown: result.note.content?.trim() || `# ${result.title}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({
        isLoading: false,
        title: "加载失败",
        markdown: `# 加载失败\n\n${message}`,
        error: message,
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "加载今日笔记失败",
        message,
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Detail
      isLoading={state.isLoading}
      navigationTitle={state.title}
      markdown={state.markdown}
      actions={
        <ActionPanel>
          <Action title="刷新" icon={Icon.ArrowClockwise} onAction={load} />
          <Action.CopyToClipboard title="复制正文" content={state.markdown} />
          {state.error ? (
            <Action
              title="打开扩展设置"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
