import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { createApp, defineComponent } from "vue";
import {
  StreamDropdown,
  SectionWithButtons,
  LoadingOverlay,
  DetailsModal,
  AddToWatchLaterButton,
} from "./components";

import { data } from "./app/data";
import { mounted } from "./app/mounted";
import { computed } from "./app/computed";
import { methods } from "./app/methods";

const App = defineComponent({
  ...data,
  ...mounted,
  computed,
  methods,
});

const app = createApp(App);

app.component("stream-dropdown", StreamDropdown);
app.component("section-with-buttons", SectionWithButtons);
app.component("loading-overlay", LoadingOverlay);
app.component("details-modal", DetailsModal);
app.component("add-to-watch-later-button", AddToWatchLaterButton);

app.mount("#app");
