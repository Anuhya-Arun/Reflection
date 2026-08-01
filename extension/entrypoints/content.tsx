import { createRoot } from "react-dom/client";

import ContentApp from "./ContentApp.tsx";

export default defineContentScript({
  matches: ["*://docs.google.com/*"],

  main() {
    if (document.getElementById("reflection-root")) return;

    const container = document.createElement("div");

    container.id = "reflection-root";

    document.body.appendChild(container);

    createRoot(container).render(<ContentApp />);
  },
});