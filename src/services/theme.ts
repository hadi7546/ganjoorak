export function initializeTheme() {
  var settingsKey = "ganjoorak:settings";
  var defaultTheme = "dark";
  var defaultFont = "vazirmatn";
  var allowedThemes = ["dark", "light", "paper"];
  var allowedFonts = [
    "vazirmatn",
    "samim",
    "tanha",
    "shabnam",
    "gandom",
    "parastoo",
    "sahel",
    "vazircode",
    "nahid",
  ];

  try {
    var rawSettings = localStorage.getItem(settingsKey);
    var parsedSettings = rawSettings ? JSON.parse(rawSettings) : null;

    var storedTheme = parsedSettings && parsedSettings.theme ? parsedSettings.theme : null;
    var fallbackTheme = defaultTheme;

    if (window.matchMedia) {
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      fallbackTheme = prefersDark ? "dark" : defaultTheme;
    }

    var resolvedTheme = allowedThemes.indexOf(storedTheme) >= 0 ? storedTheme : fallbackTheme;
    var storedFont =
      parsedSettings && parsedSettings.fontFamily && allowedFonts.indexOf(parsedSettings.fontFamily) >= 0
        ? parsedSettings.fontFamily
        : defaultFont;

    var root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.setAttribute("data-font", storedFont);
    localStorage.setItem("theme", resolvedTheme);
  } catch (error) {
    var root = document.documentElement;
    root.setAttribute("data-theme", defaultTheme);
    root.setAttribute("data-font", defaultFont);
  }
}

export const themeInitializerScript = `(${initializeTheme})();`;
