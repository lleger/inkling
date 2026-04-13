import type { Note, NoteMeta, User } from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchUser(): Promise<User> {
  const data = await request<{ sub: string; email: string }>("/api/user");
  return data;
}

export async function fetchNotes(query?: string): Promise<NoteMeta[]> {
  const url = query ? `/api/notes?q=${encodeURIComponent(query)}` : "/api/notes";
  const data = await request<{ notes: NoteMeta[] }>(url);
  return data.notes;
}

export async function fetchNote(id: string): Promise<Note> {
  const data = await request<{ note: Note }>(`/api/notes/${id}`);
  return data.note;
}

export async function createNote(): Promise<Note> {
  const data = await request<{ note: Note }>("/api/notes", { method: "POST", body: "{}" });
  return data.note;
}

export async function updateNote(
  id: string,
  updates: { title?: string; content?: string },
): Promise<Note> {
  const data = await request<{ note: Note }>(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return data.note;
}

export async function deleteNote(id: string): Promise<void> {
  await request(`/api/notes/${id}`, { method: "DELETE" });
}

export async function fetchSettings(): Promise<Record<string, unknown>> {
  const data = await request<{ settings: Record<string, unknown> }>("/api/settings");
  return data.settings;
}

export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
