import { useQuery } from "@tanstack/react-query";
import { userQuery } from "../lib/queries";

export function useUser() {
  const { data } = useQuery(userQuery());
  return data ?? null;
}
