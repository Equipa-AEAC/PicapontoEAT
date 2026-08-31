import { createApp } from "vue";
import App from "./app/App.vue";
import router from "./app/router";
import { pinia } from "./app/providers/pinia";
import { useThemeStore } from "./stores/theme";

import "./shared/styles/main.css";
import "./shared/utils/chart";

const app = createApp(App);

app.use(pinia);
app.use(router);

// Resolve the theme before mounting so the first paint is already correct.
useThemeStore(pinia).initTheme();

app.mount("#app");
