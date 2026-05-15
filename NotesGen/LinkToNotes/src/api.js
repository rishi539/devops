const BASE_URL = "http://localhost:8080";

export const registerUser = async (username, password) => {
  const res = await fetch(`${BASE_URL}/api/user/register?username=${username}&password=${password}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Registration failed");
  return await res.text();
};

export const loginUser = async (username, password) => {
  const res = await fetch(`${BASE_URL}/api/user/login?username=${username}&password=${password}`,{
    method: "POST",
  });
  if (!res.ok) throw new Error("Login failed");
  return await res.json();
};

export const deleteNotes= async (id) => {
  const res= await fetch(`${BASE_URL}/notes/deleteNotes/${id}`,{
    method:"DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete note");
  return true; // backend returns void, so no JSON to parse
}

export const getNotes = async (url, summaryType, name, id, modelDTO) => {
  const res = await fetch(`${BASE_URL}/notes/getNotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, summaryType, name, id, modelDTO }),
  });
  if (!res.ok) throw new Error("Failed to get notes");
  return await res.json();
};

export const saveNotes = async (data) => {
  const res = await fetch(`${BASE_URL}/notes/saveNotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save notes");
  return await res.text(); // backend returns void, so use text()
};




export const getChunk = async (id, index) => {
  const res = await fetch(`${BASE_URL}/notes/generateChunk/${id}/${index}`);
  if (!res.ok) throw new Error(`Chunk ${index} failed`);
  const html = await res.text();
  return html.replace(/<\/?body>/g, "").trim();
};
