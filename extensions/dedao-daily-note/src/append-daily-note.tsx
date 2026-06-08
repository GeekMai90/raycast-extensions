import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { appendToTodayDailyNote } from "./dailyNote";

type FormValues = {
  content: string;
};

export default function Command() {
  async function handleSubmit(values: FormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "正在追加到今日笔记",
    });

    try {
      const result = await appendToTodayDailyNote(values.content);
      toast.style = Toast.Style.Success;
      toast.title = result.created ? "已创建并追加今日笔记" : "已追加到今日笔记";
      toast.message = result.entry;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "追加失败";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      enableDrafts
      navigationTitle="追加到今日笔记"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="追加" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="内容" placeholder="输入要记录的内容" autoFocus />
    </Form>
  );
}
