import React, { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { loginUser } from "../api";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();


  const handleLogin = async () => {
    try {
      const user = await loginUser(username, password);
      login(user);
      navigate("/notes");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div
      className={`flex items-center justify-center h-screen transition-colors duration-300 ${
        theme === "light" ? "bg-gradient-to-br from-blue-100 to-indigo-200" : "bg-gradient-to-br from-gray-900 to-gray-800"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className={`p-10 rounded-2xl shadow-2xl w-[22rem] backdrop-blur-md border ${
          theme === "light"
            ? "bg-white/80 border-gray-200"
            : "bg-gray-800/60 border-gray-700"
        }`}
      >
        <motion.h2
          className="text-3xl font-bold mb-6 text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          🔐 Welcome Back
        </motion.h2>

        {error && (
          <motion.p
            className="text-red-500 text-sm mb-3 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        <input
          type="text"
          placeholder="👤 Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`w-full p-3 mb-4 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
            theme === "light"
              ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-400"
              : "bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
          }`}
        />

        <input
          type="password"
          placeholder="🔒 Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 mb-6 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
            theme === "light"
              ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-400"
              : "bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
          }`}
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          Login
        </motion.button>

        <p className="text-center mt-5 text-sm">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            Sign up
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
