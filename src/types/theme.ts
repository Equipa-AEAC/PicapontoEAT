/**
 * The theme the user asked for. `system` defers to the OS; the other two are
 * explicit choices that ignore it.
 */
export type ThemeMode = "light" | "dark" | "system";

/** What `ThemeMode` resolves to once the OS preference is taken into account. */
export type ResolvedTheme = "light" | "dark";
