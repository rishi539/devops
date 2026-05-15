import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { registerUser } from "../api";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  const handleRegister = async () => {
    try {
      await registerUser(username, password);
      setMessage("✅ Registration successful! Redirecting...");
      setTimeout(() => navigate("/login"), 1500);
    } catch(e){
      console.log(String(e));
      if(!String(e).startsWith("Error"))
        navigate("/login")
      setMessage("❌ Registration failed. Try again.");
    }
  };

  return (
    <div
      className={`flex items-center justify-center h-screen transition-colors duration-300 ${
        theme === "light"
          ? "bg-gradient-to-br from-green-100 to-emerald-200"
          : "bg-gradient-to-br from-gray-900 to-gray-800"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className={`p-10 rounded-2xl shadow-2xl w-[22rem] backdrop-blur-md border ${
          theme === "light"
            ? "bg-white/80 border-gray-200"
            : "bg-gray-800/60 border-gray-700"
        }`}
      >
        <motion.h2
          className="text-3xl font-bold mb-6 text-center"
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          📝 Create Account
        </motion.h2>

        <input
          type="text"
          placeholder="👤 Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`w-full p-3 mb-4 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
            theme === "light"
              ? "bg-white border-gray-300 text-gray-900 focus:ring-green-400"
              : "bg-gray-700 border-gray-600 text-white focus:ring-green-500"
          }`}
        />

        <input
          type="password"
          placeholder="🔒 Choose a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 mb-6 rounded-lg border outline-none transition-all duration-300 focus:ring-2 ${
            theme === "light"
              ? "bg-white border-gray-300 text-gray-900 focus:ring-green-400"
              : "bg-gray-700 border-gray-600 text-white focus:ring-green-500"
          }`}
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRegister}
          className="w-full bg-green-600 text-white py-2 rounded-lg shadow-md hover:bg-green-700 transition"
        >
          Register
        </motion.button>

        {message && (
          <motion.p
            className="text-center mt-4 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {message}
          </motion.p>
        )}

        <p className="text-center mt-5 text-sm">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
