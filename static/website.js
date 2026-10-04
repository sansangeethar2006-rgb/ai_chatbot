// =========================
// SHARED WEBSITE THEME
// =========================

function applyTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";

    document.body.classList.toggle(
        "light-theme",
        savedTheme === "light"
    );

    const themeButtons = document.querySelectorAll(
        ".website-theme-toggle, #themeToggle"
    );

    themeButtons.forEach(button => {
        button.textContent =
            savedTheme === "light" ? "☀️" : "🌙";
    });
}


function toggleTheme() {
    const currentTheme =
        localStorage.getItem("theme") || "dark";

    const newTheme =
        currentTheme === "light" ? "dark" : "light";

    localStorage.setItem("theme", newTheme);

    applyTheme();
}


document.addEventListener("DOMContentLoaded", () => {

    applyTheme();

    const themeButtons = document.querySelectorAll(
        ".website-theme-toggle, #themeToggle"
    );

    themeButtons.forEach(button => {
        button.addEventListener("click", toggleTheme);
    });

});