import React, { createContext, useState, useMemo, useEffect } from "react";

// Create the context
export const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

// Create the provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check local storage for a saved theme
    const savedTheme = localStorage.getItem("theme");
    // Default to 'light' if nothing is saved
    return savedTheme || "light";
  });

  // Save theme to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Function to toggle the theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
};