import "sweetalert2/themes/material-ui.css";
import Swal from "sweetalert2";

export async function showConfirm({
  title,
  text,
}: {
  title: string;
  text: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
    theme: "material-ui",
  });

  return result.isConfirmed;
}

export async function showError({
  title,
  text,
}: {
  title: string;
  text?: string;
}): Promise<void> {
  await Swal.fire({
    title: title,
    text: text,
    icon: "error",
    theme: "material-ui",
  });
}

export async function showSuccess({ title }: { title: string }): Promise<void> {
  await Swal.fire({
    title,
    icon: "success",
    showCloseButton: false,
    showConfirmButton: false,
    timer: 1000,
    theme: "material-ui",
  });
}

export default {
  showConfirm,
  showError,
  showSuccess,
};
