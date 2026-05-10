import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api";
import { folderMetadataQuery, queryKeys } from "../lib/queries";
import type { FolderIconType, FolderMetadata } from "../types";

export function useFolderMetadata() {
  const qc = useQueryClient();
  const query = useQuery(folderMetadataQuery());

  const mutation = useMutation({
    mutationFn: ({
      path,
      icon,
    }: {
      path: string;
      icon: { icon_type: FolderIconType; icon_value: string } | null;
    }) => api.saveFolderIcon(path, icon),
    onMutate: async ({ path, icon }) => {
      await qc.cancelQueries({ queryKey: queryKeys.folderMetadata });
      const previous = qc.getQueryData<FolderMetadata[]>(queryKeys.folderMetadata);
      qc.setQueryData<FolderMetadata[]>(queryKeys.folderMetadata, (prev) => {
        const rest = (prev ?? []).filter((folder) => folder.path !== path);
        if (!icon) return rest;
        return [...rest, { path, ...icon }].sort((a, b) => a.path.localeCompare(b.path));
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.folderMetadata, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.folderMetadata }),
  });

  return {
    folders: query.data ?? [],
    setIcon: (path: string, icon: { icon_type: FolderIconType; icon_value: string } | null) =>
      mutation.mutateAsync({ path, icon }),
  };
}
