let darkMode;

function loadTheme() {;
    darkMode = parseInt(localStorage.getItem("dark-mode"));
    setTheme(darkMode);
}

function setTheme(dark) {
    const body = document.querySelector("body");
    darkMode = dark;

    if (dark) {
        body.classList.add("dark-mode");
    }
    else {
        body.classList.remove("dark-mode");
    }

    localStorage.setItem("dark-mode", dark.toString());
}

document.getElementById("theme-changer").addEventListener("click", () => {
    setTheme(darkMode ? 0 : 1);
});

loadTheme();