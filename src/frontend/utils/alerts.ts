import SwalBuilder from "./swalBuilder";

export async function showConfirm({
  title,
  text,
}: {
  title: string;
  text: string;
}): Promise<boolean> {
  const result = await SwalBuilder.create()
    .title(title)
    .text(text)
    .icon("question")
    .confirm("Yes")
    .cancel("No")
    .fire();

  return result.isConfirmed;
}

export async function showError({
  title,
  text,
}: {
  title: string;
  text?: string;
}): Promise<void> {
  await SwalBuilder.create()
    .title(title)
    .text(text)
    .icon("error")
    .confirm()
    .fire();
}

export async function showSuccess({ title }: { title: string }): Promise<void> {
  await SwalBuilder.create()
    .title(title)
    .icon("success")
    .autoClose(1000)
    .fire();
}
export default {
  showConfirm,
  showError,
  showSuccess,
};
