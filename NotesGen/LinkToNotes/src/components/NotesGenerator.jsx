import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import { getNotes, getChunk } from "../api";
import NoteDisplay from "./NoteDisplay";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";

const MODEL_OPTIONS = [
  {
    type: "gemini",
    label: "Gemini 1.5 Flash (Google)",
    model: "gemini",
    modelName: "gemini-1.5-flash",
    baseUrl: "none",
    badge: "Fast",
  },
  {
    type: "gemma3",
    label: "Gemma 3 (Ollama)",
    model: "ollama",
    modelName: "gemma3:latest",
    baseUrl: "",
    badge: "Local",
  },
  {
    type: "llama3",
    label: "Llama 3.2 (Ollama)",
    model: "ollama",
    modelName: "llama3.2:1b-instruct-q4_K_M",
    baseUrl: "",
    badge: "Local",
  },
  {
    type: "llama3",
    label: "Llama 3 (Ollama)",
    model: "ollama",
    modelName: "llama3:latest",
    baseUrl: "",
    badge: "Local",
  }
];

const ModelDropdown = ({
  selectedModel,
  setSelectedModel,
  ollamaUrl,
  setOllamaUrl,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (modelOption) => {
    setSelectedModel(modelOption);
    setIsOpen(false);
  };

  const isOllamaSelected = selectedModel.model === "ollama";

  const ollamaInputStyle =
    theme === "dark"
      ? "mt-4 w-full rounded-lg px-4 py-3 text-white placeholder-gray-400 bg-gray-900 border-2 border-gray-700 focus:border-purple-600 focus:outline-none transition-all duration-200 text-sm"
      : "mt-4 w-full rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-300 focus:border-purple-600 focus:outline-none transition-all duration-200 text-sm";

  const selectorButtonStyle =
    theme === "dark"
      ? "flex items-center bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-600 transition-colors"
      : "flex items-center bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors";

  const dropdownMenuStyle =
    theme === "dark"
      ? "absolute top-full mt-2 w-72 bg-gray-700 rounded-xl shadow-2xl p-2 border border-gray-600"
      : "absolute top-full mt-2 w-72 bg-white rounded-xl shadow-2xl p-2 border border-gray-200";

  const inactiveItemStyle =
    theme === "dark"
      ? "text-gray-100 hover:bg-gray-600"
      : "text-gray-800 hover:bg-gray-100";

  const dropdownHeaderStyle =
    theme === "dark" ? "text-gray-400" : "text-gray-500";

  const modelNameStyle =
    theme === "dark" ? "text-gray-400" : "text-gray-500";

  return (
    <div className="relative z-20" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={selectorButtonStyle}>
        {selectedModel.label}
        <svg
          className={`w-4 h-4 ml-1 transform transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && (
        <div className={dropdownMenuStyle}>
          <p className={`text-xs ${dropdownHeaderStyle} px-2 py-1 mb-1`}>
            Select a model
          </p>
          {MODEL_OPTIONS.map((modelOption) => (
            <button
              key={modelOption.type}
              onClick={() => handleSelect(modelOption)}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                selectedModel.type === modelOption.type
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : inactiveItemStyle
              }`}
            >
              <div className="font-semibold">{modelOption.label}</div>
              <div className="flex items-center text-xs mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    modelOption.badge === "Fast"
                      ? "bg-blue-800 text-blue-300"
                      : "bg-purple-800 text-purple-300"
                  } mr-2`}
                >
                  {modelOption.badge}
                </span>
                <span className={modelNameStyle}>
                  {modelOption.modelName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOllamaSelected && (
        <input
          type="text"
          placeholder="Enter Ollama Base URL (e.g., http://localhost:11434)"
          value={ollamaUrl}
          onChange={(e) => setOllamaUrl(e.target.value)}
          className={ollamaInputStyle}
          required
        />
      )}
    </div>
  );
};

const NotesGenerator = () => {
  const [url, setUrl] = useState("");
  const [summaryType, setSummaryType] = useState("medium");
  const [notesName, setNotesName] = useState("");
  const [loading, setLoading] = useState(false);
  const [chunksCount, setChunksCount] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [displayQueue, setDisplayQueue] = useState([]);
  const [displayIndex, setDisplayIndex] = useState(0);
  const fetchingRef = useRef(false);
  const [notesId, setNotesId] = useState(-1);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const [ollamaUrl, setOllamaUrl] = useState("");

  const handleChunkDone = useCallback(() => {
    setDisplayIndex((prev) => prev + 1);
  }, []);

  const handleStart = async () => {
    try {
      if (selectedModel.model === "ollama" && !ollamaUrl) {
        alert("Please enter the Ollama Base URL.");
        return;
      }
      setLoading(true);
      setChunks([]);
      setDisplayQueue([]);
      setDisplayIndex(0);

      const modelDTO = {
        baseUrl: selectedModel.model === "ollama" ? ollamaUrl : "none",
        modelName: selectedModel.modelName,
        model: selectedModel.model,
      };

      const total = await getNotes(
        url,
        summaryType,
        notesName,
        user.id,
        modelDTO
      );
      fetchSequentialChunks(total.notesId, total.chunkSize);
      setNotesId(total.notesId);
      setChunksCount(total.chunkSize);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSequentialChunks = async (noteId, total) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (noteId === -1) {
      alert("Error");
      return;
    }
    for (let i = 0; i < total; i++) {
      const html = await getChunk(noteId, i);
      setChunks((prev) => [...prev, html]);
      setDisplayQueue((prev) => [...prev, html]);
    }
    fetchingRef.current = false;
  };

  const currentChunk = displayQueue[displayIndex] || null;

  const inputStyle =
    theme === "dark"
      ? "w-full rounded-lg px-4 py-3 text-white placeholder-gray-400 bg-gray-900 border-2 border-gray-700 focus:border-purple-600 focus:outline-none transition-all duration-200"
      : "w-full rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-300 focus:border-purple-600 focus:outline-none transition-all duration-200";

  return (
    <div
      className={`min-h-screen flex flex-col items-center py-10 transition-colors duration-300 ${
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      <div className="w-full max-w-4xl px-8">
        <div className="flex justify-start mb-6">
          <ModelDropdown
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            ollamaUrl={ollamaUrl}
            setOllamaUrl={setOllamaUrl}
            theme={theme}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:space-x-4 gap-4 sm:gap-0">
            <input
              type="text"
              placeholder="Name your notes (e.g., Spring DI Deep Dive)"
              value={notesName}
              onChange={(e) => setNotesName(e.target.value)}
              className={`${inputStyle} flex-grow`}
              required
            />
            <select
              value={summaryType}
              onChange={(e) => setSummaryType(e.target.value)}
              className={`w-full sm:w-40 ${inputStyle} appearance-none cursor-pointer ${
                theme === "light" && "text-gray-900"
              }`}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-4 gap-4 sm:gap-0">
            <input
              type="text"
              placeholder="Enter URL (e.g., https://docs.spring.io)"
              value={url}
              onChange={(e) => setUrl(e.target.value)} // ✅ fixed typo here
              className={`${inputStyle} flex-grow`}
              required
            />
            <button
              onClick={handleStart}
              disabled={
                loading ||
                !url ||
                !notesName ||
                (selectedModel.model === "ollama" && !ollamaUrl)
              }
              className={`w-full sm:w-48 py-3 rounded-lg font-semibold text-lg transition-all flex items-center justify-center ${
                loading
                  ? "opacity-60 cursor-not-allowed bg-green-500 text-black"
                  : "bg-green-500 text-black hover:bg-green-400"
              }`}
            >
              {loading ? (
                "Generating..."
              ) : (
                <>
                  <span className="mr-2">⚡</span>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 mt-8">
        {chunksCount > 0 && (
          <p
            className={`text-sm my-4 text-center ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Fetching {chunks.length}/{chunksCount} chunks...
          </p>
        )}

        {/* Render all finished chunks instantly */}
        {displayQueue.slice(0, displayIndex).map((html, i) => (
          <NoteDisplay
            key={`chunk-${notesId}-${i}`}
            htmlContent={html}
            instant={true}
            theme={theme}
          />
        ))}

        {/* Render current chunk typing */}
        {currentChunk && (
          <NoteDisplay
            key={`active-${notesId}-${displayIndex}`}
            htmlContent={currentChunk}
            onDone={handleChunkDone}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
};

export default NotesGenerator;
