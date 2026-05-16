import { useSession } from "../lib/auth-client";

export function useUser() {
  const { data } = useSession();
  if (!data?.user) return null;
  return {
    sub: data.user.id,
    name: data.user.name,
    email: data.user.email,
    twoFactorEnabled: Boolean((data.user as { twoFactorEnabled?: boolean }).twoFactorEnabled),
  };
}
