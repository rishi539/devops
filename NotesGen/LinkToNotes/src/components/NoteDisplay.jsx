import React, { useEffect, useState, useRef } from "react";
import DOMPurify from "dompurify";

const cleanModelHtml = (html) => {
  if (!html) return "";

  let cleaned = html.trim();

  // Decode HTML entities
  const textarea = document.createElement("textarea");
  textarea.innerHTML = cleaned;
  cleaned = textarea.value;

  // Remove garbage outside HTML tags
  const firstTag = cleaned.indexOf("<");
  const lastTag = cleaned.lastIndexOf(">");
  if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
    cleaned = cleaned.slice(firstTag, lastTag + 1);
  }

  // Sanitize HTML
  cleaned = DOMPurify.sanitize(cleaned);

  return cleaned;
};

const NoteDisplay = ({ htmlContent, instant = false, onDone, theme }) => {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (!htmlContent) return;

    const safeHtml = cleanModelHtml(htmlContent);

    // Clear any previous interval before starting a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (instant) {
      setDisplayed(safeHtml);
      return;
    }

    let i = 0;
    setDisplayed(""); // reset visible text

    timerRef.current = setInterval(() => {
      setDisplayed(safeHtml.slice(0, i));
      i += 1;

      if (i > safeHtml.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        if (onDone) onDone();
      }
    }, 25);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // ❗ Do NOT include `onDone` in deps to avoid re-runs
  }, [htmlContent, instant]);

  return (
    <div
      className={`transition-all duration-500 max-w-4xl mx-auto leading-relaxed p-4 mb-10 ${
        theme === "dark" ? "prose-invert" : "prose"
      }`}
    >
      <div
        className="max-w-4xl mx-auto leading-relaxed bg-gray-50"
        dangerouslySetInnerHTML={{ __html: displayed }}
      />
    </div>
  );
};

export default React.memo(NoteDisplay);
