import Swal from "sweetalert2";

export async function showWarningDialog(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
    customClass: {
      confirmButton: "btn btn-success",
      cancelButton: "btn btn-danger",
    },
  });

  return result.isConfirmed;
}

export async function showErrorDialog(title: string, text?: string): Promise<void> {
  Swal.fire({
    title: title,
    text: text,
    icon: "error",
    customClass: {
      confirmButton: "btn btn-success",
    },
  });
}

export async function showSuccessDialog(title: string): Promise<void> {
  await Swal.fire({
    title,
    icon: "success",
    showCloseButton: false,
    customClass: {
      confirmButton: "btn btn-success",
      cancelButton: "btn btn-danger",
    },
  });
}


export default {
  showWarningDialog,
  showErrorDialog,
  showSuccessDialog,
};