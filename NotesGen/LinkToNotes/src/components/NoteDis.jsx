import React, { useState, useRef, useContext } from "react";
import NoteDisplay from "./NoteDisplay";
import DOMPurify from "dompurify";
import { saveNotes } from "../api";
import { ThemeContext } from "../context/ThemeContext.jsx";

const NotesDisplay = ({ note }) => {
  const { theme } = useContext(ThemeContext);
  const [isEditing, setIsEditing] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const editableRef = useRef(null);

  if (!note)
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center h-full transition-colors duration-300 ${
          theme === "light" ? "text-gray-500" : "text-gray-400"
        }`}
      >
        <div className="text-4xl mb-3">💬</div>
        <p>Select a note from the sidebar to view its content</p>
      </div>
    );

  // 🧠 Combine all chunks into one editable HTML string separated by <hr>
  const combineChunks = () =>
    note.dataList.map((chunk) => chunk.htmlCode).join("<hr data-split />");

  const handleEditToggle = async () => {
    if (isEditing) {
      // Save mode
      const rawHtml = editableRef.current.innerHTML;
      const safeHtml = DOMPurify.sanitize(rawHtml);

      // Split content back into chunks using our <hr> marker
      const parts = safeHtml.split(/<hr[^>]*data-split[^>]*>/i);

      try {
        // Save each corresponding chunk
        for (let i = 0; i < note.dataList.length; i++) {
          const chunk = note.dataList[i];
          const html = parts[i] || "";
          await saveNotes({ id: chunk.id, htmlCode: html });
        }
        alert("✅ All sections saved successfully!");
      } catch (error) {
        console.error("Error saving note:", error);
        alert("❌ Failed to save one or more sections.");
      }
    } else {
      // Enter edit mode → load all content
      setHtmlContent(combineChunks());
    }

    setIsEditing((prev) => !prev);
  };

  const execCommand = (command, value = null) =>
    document.execCommand(command, false, value);

  const handleAddImage = () => {
    const url = prompt("Enter image URL:");
    if (url) execCommand("insertImage", url);
  };

  return (
    <div
      className={`flex-1 overflow-y-auto h-full transition-colors duration-300 ${
        theme === "light" ? "bg-gray-50" : "bg-gray-800"
      }`}
    >
      <div className="max-w-5xl mx-auto p-6">
        {/* Sticky Header */}
        <div
          className={`sticky top-0 z-10 flex justify-between items-center py-3 px-4 mb-6 border-b backdrop-blur-md bg-opacity-70 ${
            theme === "light"
              ? "bg-white/80 border-gray-200"
              : "bg-gray-800/80 border-gray-700"
          }`}
        >
          <h2
            className={`text-2xl font-bold ${
              theme === "light" ? "text-gray-800" : "text-gray-100"
            }`}
          >
            {note.name}
          </h2>
          <button
            onClick={handleEditToggle}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              isEditing
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isEditing ? "💾 Save" : "✏️ Edit"}
          </button>
        </div>

        {/* Toolbar (visible only in editing mode) */}
        {isEditing && (
          <div
            className={`sticky top-[60px] z-10 flex gap-2 p-2 mb-4 rounded-md ${
              theme === "light" ? "bg-gray-100" : "bg-gray-800"
            }`}
          >
            <button
              onClick={() => execCommand("bold")}
              className="px-3 py-1 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600"
            >
              B
            </button>
            <button
              onClick={() => execCommand("italic")}
              className="px-3 py-1 rounded italic bg-purple-500 text-white hover:bg-purple-600"
            >
              I
            </button>
            <button
              onClick={handleAddImage}
              className="px-3 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
            >
              🖼️ Image
            </button>
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <>
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              className={`border shadow-inner p-4 rounded-md focus:outline-none ${
                theme === "light"
                  ? "prose bg-white border-blue-400"
                  : "prose-invert bg-gray-800 border-blue-600"
              }`}
              style={{ minHeight: "70vh", cursor: "text" }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            <p
              className={`text-sm mt-4 ${
                theme === "light" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              💡 <b>Edit Mode:</b> You’re editing the full note. Each section
              will save individually when you click Save.
            </p>
          </>
        ) : (
          <div className="space-y-4 bg-gray-50">
            {note.dataList.map((chunk, index) => (
              <div key={chunk.id}>
                <NoteDisplay
                  htmlContent={chunk.htmlCode}
                  instant
                  theme={theme}
                />
                {/* Subtle divider between chunks (optional) */}
                {index < note.dataList.length - 1 && (
                  <hr
                    className={`my-8 ${
                      theme === "light" ? "border-gray-200" : "border-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesDisplay;
