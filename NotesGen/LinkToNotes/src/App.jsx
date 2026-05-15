import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import NotesGenerator from "./components/NotesGenerator";
import NotesList from "./components/NotesList";
import Navbar from "./components/Navbar";
import { AuthContext } from "./context/AuthContext";
import { ThemeContext } from "./context/ThemeContext"; // Import ThemeContext

const App = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext); // Get the current theme

  return (
    // Apply the base theme classes to this main wrapper div
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "light"
          ? "bg-gray-50 text-gray-900" // Light mode base
          : "bg-gray-900 text-gray-100" // Dark mode base
      }`}
    >
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/notes" : "/login"} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/notes"
          element={user ? <NotesGenerator /> : <Navigate to="/login" />}
        />
        <Route
          path="/mynotes"
          element={user ? <NotesList /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
};

export default App;