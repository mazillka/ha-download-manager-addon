function showSpinner() {
    const spinner = document.querySelector("#global-loader");
    if (!spinner) {
        return;
    }
    spinner.style.display = "flex";
}

function hideSpinner() {
    const spinner = document.querySelector("#global-loader");
    if (!spinner) {
        return;
    }
    spinner.style.display = "none";
}
