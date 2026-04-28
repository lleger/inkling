import type { Note, NoteMeta, User, DeletedNoteMeta, NoteVersionMeta, NoteVersion, Settings, OgPreview } from "../types";

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

export async function createNote(options?: { title?: string; content?: string }): Promise<Note> {
  const data = await request<{ note: Note }>("/api/notes", {
    method: "POST",
    body: JSON.stringify(options || {}),
  });
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

export async function pinNote(id: string, pinned: boolean): Promise<void> {
  await request(`/api/notes/${id}/pin`, {
    method: "PUT",
    body: JSON.stringify({ pinned }),
  });
}

export async function restoreNote(id: string): Promise<void> {
  await request(`/api/notes/${id}/restore`, { method: "POST" });
}

export async function fetchTrash(): Promise<DeletedNoteMeta[]> {
  const data = await request<{ notes: DeletedNoteMeta[] }>("/api/notes/trash/list");
  return data.notes;
}

export async function permanentlyDeleteNote(id: string): Promise<void> {
  await request(`/api/notes/${id}/permanent`, { method: "DELETE" });
}

export async function moveNoteToFolder(id: string, folder: string | null): Promise<void> {
  await request(`/api/notes/${id}/folder`, {
    method: "PUT",
    body: JSON.stringify({ folder }),
  });
}

export async function fetchVersions(noteId: string): Promise<NoteVersionMeta[]> {
  const data = await request<{ versions: NoteVersionMeta[] }>(`/api/notes/${noteId}/versions`);
  return data.versions;
}

export async function fetchVersion(noteId: string, versionId: string): Promise<NoteVersion> {
  const data = await request<{ version: NoteVersion }>(`/api/notes/${noteId}/versions/${versionId}`);
  return data.version;
}

export async function restoreVersion(noteId: string, versionId: string): Promise<Note> {
  const data = await request<{ note: Note }>(`/api/notes/${noteId}/versions/${versionId}/restore`, { method: "POST" });
  return data.note;
}

export async function fetchSettings(): Promise<Partial<Settings>> {
  const data = await request<{ settings: Partial<Settings> }>("/api/settings");
  return data.settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function fetchOgPreview(url: string, opts?: { refresh?: boolean }): Promise<OgPreview> {
  const qs = new URLSearchParams({ url });
  if (opts?.refresh) qs.set("refresh", "1");
  return request<OgPreview>(`/api/og?${qs.toString()}`);
}
