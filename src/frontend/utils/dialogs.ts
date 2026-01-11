import Swal from "sweetalert2";

export async function confirm(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
  });

  return result.isConfirmed;
}
