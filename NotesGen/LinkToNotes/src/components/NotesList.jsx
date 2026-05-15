import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { loginUser } from "../api";
import NotesSidebar from "./NotesSidebar.jsx";
import NotesDisplay from "./NoteDis.jsx";
import { ThemeContext } from "../context/ThemeContext.jsx";

const NotesList = () => {
  const { user, login } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notes, setNotes] = useState([]);

  // ✅ Sync notes whenever user changes
  useEffect(() => {
    if (user?.notesList) {
      setNotes(user.notesList);
    } else {
      setNotes([]); // ensure sidebar clears properly on logout
    }
  }, [user]);

  if (!user) {
    return <p className="text-center mt-10">⚠️ Please log in first.</p>;
  }

  const handleRefresh = async () => {
    try {
      setLoading(true);
      if (!user.username || !user.password) {
        alert("Missing saved credentials. Please log in again.");
        return;
      }

      const updatedUser = await loginUser(user.username, user.password);
      login(updatedUser); // update context
      setNotes(updatedUser.notesList || []);
      alert("✅ Notes refreshed!");
    } catch (err) {
      console.error("Refresh failed:", err);
      alert("❌ Failed to refresh. Please log in again.");
    } finally {
      setLoading(false);
    }
  };  const handleDeleteNote = (id) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  return (
    <div
      className={`flex flex-col h-[100vh] transition-colors duration-300 ${
        theme === "light"
          ? "bg-gray-50 text-gray-900"
          : "bg-gray-900 text-gray-100"
      }`}
    >
      {/* 🔝 Header */}
      <div
        className={`flex justify-between items-center px-6 py-3 shadow z-20 sticky top-0 ${
          theme === "light"
            ? "bg-white text-gray-800"
            : "bg-gray-800 text-white"
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`px-3 py-1 rounded-md transition ${
              theme === "light"
                ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
          >
            {isSidebarOpen ? "⬅️ Hide Sidebar" : "➡️ Show Sidebar"}
          </button>
          <h2 className="text-lg font-semibold">📓 Welcome, {user.username}</h2>
        </div>

        <button
          onClick={handleRefresh}
          className={`px-4 py-1 rounded-md font-semibold transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "🔁 Refresh"}
        </button>
      </div>

      {/* 🧱 Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && (
          <NotesSidebar
            notes={notes}
            selectedNote={selectedNote}
            onSelect={setSelectedNote}
            onDelete={handleDeleteNote}
            theme={theme}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          <NotesDisplay note={selectedNote} theme={theme} />
        </div>
      </div>
    </div>
  );
};

export default NotesList;

// import React, { useState, useContext, useEffect } from "react";
// import { AuthContext } from "../context/AuthContext.jsx";
// import { loginUser } from "../api";
// import NotesSidebar from "./NotesSidebar.jsx";
// import NotesDisplay from "./NoteDis.jsx";
// import { ThemeContext } from "../context/ThemeContext.jsx";

// const NotesList = () => {
//   const { user, login } = useContext(AuthContext);
//   const { theme } = useContext(ThemeContext);
//   const [selectedNote, setSelectedNote] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [notes, setNotes] = useState(user?.notesList || []);

//   // ✅ Update local notes when user changes (after refresh)
//   useEffect(() => {
//     if (user?.notesList) setNotes(user.notesList);
//   }, [user]);

//   if (!user)
//     return <p className="text-center mt-10">⚠️ Please log in first.</p>;

//   const handleRefresh = async () => {
//   try {
//     setLoading(true);
//     if (!user.username || !user.password) {
//       alert("Missing saved credentials. Please log in again.");
//       return;
//     }

//     const updatedUser = await loginUser(user.username, user.password);
//     login(updatedUser); // updates context
//     setNotes(updatedUser.notesList || []);

//     alert("✅ Notes refreshed!");

//     // ✅ Optional: full UI refresh (safe, no infinite loop)
//     setTimeout(() => {
//       window.location.reload();
//     }, 100);
//   } catch (err) {
//     console.error("Refresh failed:", err);
//     alert("❌ Failed to refresh. Please log in again.");
//   } finally {
//     setLoading(false);
//   }
// };


//   return (
//     <div
//       className={`flex flex-col h-[100vh] transition-colors duration-300 ${
//         theme === "light"
//           ? "bg-gray-50 text-gray-900"
//           : "bg-gray-900 text-gray-100"
//       }`}
//     >
//       {/* 🔝 Fixed Header */}
//       <div
//         className={`flex justify-between items-center px-6 py-3 shadow z-20 sticky top-0 ${
//           theme === "light"
//             ? "bg-white text-gray-800"
//             : "bg-gray-800 text-white"
//         }`}
//       >
//         <div className="flex items-center gap-4">
//           <button
//             onClick={() => setIsSidebarOpen((prev) => !prev)}
//             className={`px-3 py-1 rounded-md transition ${
//               theme === "light"
//                 ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
//                 : "bg-gray-700 hover:bg-gray-600 text-white"
//             }`}
//           >
//             {isSidebarOpen ? "⬅️ Hide Sidebar" : "➡️ Show Sidebar"}
//           </button>
//           <h2 className="text-lg font-semibold">📓 Welcome, {user.username}</h2>
//         </div>

//         <button
//           onClick={handleRefresh}
//           className={`px-4 py-1 rounded-md font-semibold transition ${
//             loading
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-blue-600 hover:bg-blue-700 text-white"
//           }`}
//           disabled={loading}
//         >
//           {loading ? "Refreshing..." : "🔁 Refresh"}
//         </button>
//       </div>

//       {/* 🧱 Main Layout */}
//       <div className="flex flex-1 overflow-hidden">
//         {isSidebarOpen && (
//           <NotesSidebar
//             notes={notes}
//             selectedNote={selectedNote}
//             onSelect={setSelectedNote}
//             theme={theme}
//             isSidebarOpen={isSidebarOpen}
//           />
//         )}

//         <div className="flex-1 overflow-y-auto">
//           <NotesDisplay note={selectedNote} theme={theme} />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default NotesList;
