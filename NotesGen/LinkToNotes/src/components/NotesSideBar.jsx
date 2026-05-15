import React from "react";
import { deleteNotes } from "../api";

const NotesSidebar = ({
  notes = [],
  selectedNote,
  onSelect,
  onDelete,
  theme,
  isSidebarOpen = true,
}) => {
  const isDark = theme === "dark";

  const noteBase = isDark
    ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
    : "bg-gray-100 hover:bg-gray-200 text-gray-800";

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent selecting the note when clicking delete
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteNotes(id);
      if (onDelete) onDelete(id);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("❌ Failed to delete note.");
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <div
      className={`w-64 flex-shrink-0 p-5 overflow-y-auto border-r shadow-md transition-colors duration-300 ${
        isDark
          ? "bg-gray-900 text-gray-100 border-gray-700"
          : "bg-white text-gray-900 border-gray-200"
      }`}
    >
      <h2
        className={`text-lg font-bold mb-5 border-b pb-2 tracking-wide ${
          isDark ? "border-gray-700" : "border-gray-300"
        }`}
      >
        📚 My Notes
      </h2>

      {notes && notes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            const isActive = selectedNote?.id === note.id;
            return (
              <div
                key={note.id}
                onClick={() => onSelect(note)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-black text-white shadow-md border border-blue-700"
                    : noteBase
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive ? "bg-blue-400" : "bg-blue-500"
                      }`}
                    ></div>
                    <span className="font-medium truncate">{note.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className={`ml-2 flex-shrink-0 p-1 rounded-md text-sm transition-all duration-200 hover:scale-110 ${
                      isActive
                        ? "text-red-300 hover:text-red-100 hover:bg-red-900/40"
                        : isDark
                        ? "text-gray-500 hover:text-red-400 hover:bg-red-900/30"
                        : "text-gray-400 hover:text-red-500 hover:bg-red-100"
                    }`}
                    title="Delete note"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p
          className={`text-sm mt-4 ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          No notes available yet.
        </p>
      )}
    </div>
  );
};

export default NotesSidebar;
