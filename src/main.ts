import { createApp } from "vue";
import App from "./app/App.vue";
import router from "./app/router";
import { pinia } from "./app/providers/pinia";

import "./shared/styles/main.css";
import "./shared/utils/chart";

const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");
