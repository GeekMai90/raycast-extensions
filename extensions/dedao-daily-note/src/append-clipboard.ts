import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { appendToTodayDailyNote } from "./dailyNote";

export default async function Command() {
  const text = await Clipboard.readText();

  if (!text?.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "剪贴板没有可追加的文本",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "正在追加剪贴板到今日笔记",
  });

  try {
    const result = await appendToTodayDailyNote(text);
    toast.style = Toast.Style.Success;
    toast.title = result.created ? "已创建并追加今日笔记" : "已追加到今日笔记";
    toast.message = result.entry;
    await showHUD("已追加到今日笔记", { clearRootSearch: true });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "追加失败";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
