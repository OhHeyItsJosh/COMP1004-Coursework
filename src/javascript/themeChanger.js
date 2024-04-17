let darkMode;

function loadTheme() {
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

const themeChanger = document.getElementById("theme-changer");
const changeTheme = () => {
    setTheme(darkMode ? 0 : 1);
};

themeChanger.addEventListener("click", changeTheme);
themeChanger.addEventListener("keydown", (event) => {
    if (event.key == "Enter")
        changeTheme();
})

loadTheme();