import { useEffect, useState } from "react";

export const themeOptions = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
  "caramellatte",
  "abyss",
  "silk",
] as const;

export type DaisyTheme = (typeof themeOptions)[number];
export type Theme = "system" | DaisyTheme;

function isTheme(value: string | null): value is Theme {
  return (
    value === "system" ||
    themeOptions.includes(value as (typeof themeOptions)[number])
  );
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("piblaster-theme");
    return isTheme(saved) ? saved : "system";
  });

  useEffect(() => applyTheme(theme), [theme]);

  const setTheme = (value: Theme) => {
    localStorage.setItem("piblaster-theme", value);
    applyTheme(value);
    setThemeState(value);
  };
  return { theme, setTheme };
}
