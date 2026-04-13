import { useState, useEffect } from "react";
import type { User } from "../types";
import { fetchUser } from "../lib/api";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser().then(setUser).catch(console.error);
  }, []);

  return user;
}
