import { createApp } from "vue";
import App from "./app/App.vue";
import router from "./app/router";
import { pinia } from "./app/providers/pinia";
import i18n, { initLocale } from "./i18n";
import { useThemeStore } from "./stores/theme";

import "./shared/styles/main.css";
import "./shared/utils/chart";

const app = createApp(App);

app.use(pinia);
app.use(i18n);
app.use(router);

// Resolve the theme and the language before mounting, so the first paint is
// already in the right skin and the right language rather than correcting itself.
useThemeStore(pinia).initTheme();
initLocale();

app.mount("#app");
