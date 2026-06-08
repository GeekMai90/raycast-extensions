import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { appendToTodayDailyNote } from "./dailyNote";

export default async function Command(props: LaunchProps<{ arguments: Arguments.InstantCapture }>) {
  const content = props.arguments.content;
  await closeMainWindow({ clearRootSearch: true });

  try {
    const result = await appendToTodayDailyNote(content);
    await showHUD(result.created ? "已创建并追加今日笔记" : "已追加到今日笔记");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "追加失败",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
