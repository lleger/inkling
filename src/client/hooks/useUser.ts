import { useSession } from "../lib/auth-client";

export function useUser() {
  const { data } = useSession();
  if (!data?.user) return null;
  return {
    sub: data.user.id,
    email: data.user.email,
  };
}
