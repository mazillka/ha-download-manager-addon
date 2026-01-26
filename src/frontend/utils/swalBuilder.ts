import "sweetalert2/themes/material-ui.css";
import Swal, { SweetAlertIcon, SweetAlertOptions } from "sweetalert2";

export default class SwalBuilder {
  private options: SweetAlertOptions = {
    theme: "material-ui",
  };

  static create() {
    return new SwalBuilder();
  }

  title(title: string) {
    this.options.title = title;
    return this;
  }

  text(text?: string) {
    this.options.text = text;
    return this;
  }

  icon(icon: SweetAlertIcon) {
    this.options.icon = icon;
    return this;
  }

  confirm(text = "Yes") {
    this.options.showConfirmButton = true;
    this.options.confirmButtonText = text;
    return this;
  }

  cancel(text = "No") {
    this.options.showCancelButton = true;
    this.options.cancelButtonText = text;
    return this;
  }

  autoClose(timer = 1000) {
    this.options.showConfirmButton = false;
    this.options.showCloseButton = false;
    this.options.timer = timer;
    return this;
  }

  async fire() {
    return await Swal.fire(this.options);
  }
}
