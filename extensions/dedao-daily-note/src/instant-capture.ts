import { closeMainWindow, LaunchProps, PopToRootType, showHUD } from "@raycast/api";
import { appendToTodayDailyNote } from "./dailyNote";

export default async function Command(props: LaunchProps<{ arguments: Arguments.InstantCapture }>) {
  const content = props.arguments.content;
  const clearRootSearchOptions = { clearRootSearch: true, popToRootType: PopToRootType.Immediate };
  await closeMainWindow(clearRootSearchOptions);

  try {
    const result = await appendToTodayDailyNote(content);
    await showHUD(result.created ? "已创建并追加今日笔记" : "已追加到今日笔记", clearRootSearchOptions);
  } catch (error) {
    console.error("Instant capture failed", error);
    await showHUD("追加失败，请检查设置或稍后再试", clearRootSearchOptions);
  }
}
