import React, { useContext } from "react";
import { getUser, logoutUser } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext"; // Import ThemeContext
import { AuthContext } from "../context/AuthContext"; // Import AuthContext

const Navbar = () => {
  const { user: authUser, logout } = useContext(AuthContext); // Get user from AuthContext
  const { theme, toggleTheme } = useContext(ThemeContext); // Get theme state and toggler
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Use logout from AuthContext
    navigate("/login");
  };

  // Use authUser from context instead of getUser() for reactivity
  const user = authUser || getUser(); // Fallback just in case

  return (
    <nav
      className={`flex flex-wrap justify-between items-center px-6 py-6 shadow-md transition-colors duration-300 ${
        theme === "light"
          ? "bg-blue-600 text-white"
          : "bg-gray-800 text-gray-100 border-b border-gray-700"
      }`}
    >
      <h1
        className="font-bold text-xl cursor-pointer"
        onClick={() => navigate("/notes")}
      >
        📚 AutoNotes
      </h1>

      {/* Navigation buttons */}
      <div className="flex gap-2 my-2 sm:my-0">
        <button
          onClick={() => navigate("/mynotes")}
          className={`px-5 py-3 rounded-md text-sm font-medium transition ${
            theme === "light"
              ? "bg-white text-blue-600 hover:bg-gray-100"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          View ALL My Notes
        </button>
        <button
          onClick={() => navigate("/notes")}
          className={`px-5 py-3 rounded-md text-sm font-medium transition ${
            theme === "light"
              ? "bg-white text-blue-600 hover:bg-gray-100"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          Generate Notes
        </button>
      </div>

      {/* Auth and Theme Toggle */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span>Hello, {user.username}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-3 rounded-md text-sm text-white"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className={`px-4 py-3 rounded-md text-sm font-medium transition ${
              theme === "light"
                ? "bg-white text-blue-600 hover:bg-gray-100"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            Login
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`px-3 py-3 rounded-lg font-semibold transition-all ${
            theme === "light"
              ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
              : "bg-gray-700 text-yellow-300 hover:bg-gray-600"
          }`}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
