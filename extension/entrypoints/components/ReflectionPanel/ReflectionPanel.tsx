import "./ReflectionPanel.css";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onToggle: () => void;
};

function ReflectionPanel({ open, onToggle }: Props) {
  const [opportunity, setOpportunity] = useState("");
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
  const saved = localStorage.getItem("reflection-opportunity");

  if (saved) {
    setOpportunity(saved);
  }
}, []);

  useEffect(() => {
  localStorage.setItem(
    "reflection-opportunity",
    opportunity
  );
}, [opportunity]);

  useEffect(() => {

    const updateSelection = () => {

        const text = window.getSelection()?.toString() || "";

        setSelectedText(text);

    };

    document.addEventListener("mouseup", updateSelection);

    document.addEventListener("keyup", updateSelection);

    return () => {

        document.removeEventListener("mouseup", updateSelection);

        document.removeEventListener("keyup", updateSelection);

    };

}, []);

  if (!open) {
    return (
      <button
        className="reflection-launcher"
        onClick={onToggle}
      >
        ✨
      </button>
    );
  }

  return (
    <div className="reflection-panel">

      <div className="panel-header">

        <h2>Reflection</h2>

        <button
          className="panel-toggle"
          onClick={onToggle}
        >
          ✨
        </button>

      </div>

      <p>
        Review your application through the recruiter's eyes.
      </p>

      {selectedText && (

          <div className="selection-card">

              <h4>Selected Text</h4>

              <p>{selectedText}</p>

          </div>

      )}

      <textarea
        value={opportunity}
        onChange={(e) => setOpportunity(e.target.value)}
        placeholder="Paste the opportunity description..."
      />

      <button className="review-button">
        Review Application
      </button>

    </div>
  );
}

export default ReflectionPanel;