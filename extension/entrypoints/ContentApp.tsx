import { useState } from "react";

import ReflectionPanel from "./components/ReflectionPanel/ReflectionPanel";

function ContentApp() {
  const [open, setOpen] = useState(false);

  return (
    <ReflectionPanel
      open={open}
      onToggle={() => setOpen(!open)}
    />
  );
}

export default ContentApp;