import { createApp } from "vue";
import { App } from "./components";
import vuetify from "./plugins/vuetify";

createApp(App).use(vuetify).mount("#app");
