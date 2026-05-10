import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFolderMetadata } from "./useFolderMetadata";
import { makeQueryWrapper } from "./test-utils";
import { queryKeys } from "../lib/queries";
import * as api from "../lib/api";
import type { FolderMetadata } from "../types";

vi.mock("../lib/api");

const folders: FolderMetadata[] = [{ path: "Work", icon_type: "emoji", icon_value: "💼" }];

beforeEach(() => {
  vi.mocked(api.fetchFolderMetadata).mockResolvedValue(folders);
  vi.mocked(api.saveFolderIcon).mockResolvedValue(undefined);
});

describe("useFolderMetadata", () => {
  it("fetches folder metadata", async () => {
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useFolderMetadata(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.folders).toEqual(folders));
  });

  it("saves icon changes optimistically", async () => {
    let resolve!: () => void;
    vi.mocked(api.saveFolderIcon).mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.folderMetadata, folders);
    const { result } = renderHook(() => useFolderMetadata(), { wrapper: Wrapper });

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.setIcon("Projects", { icon_type: "lucide", icon_value: "star" });
    });

    await waitFor(() => {
      const cached = qc.getQueryData<FolderMetadata[]>(queryKeys.folderMetadata);
      expect(cached?.find((folder) => folder.path === "Projects")).toEqual({
        path: "Projects",
        icon_type: "lucide",
        icon_value: "star",
      });
    });

    resolve();
    await act(async () => {
      await promise;
    });
  });

  it("clears icon metadata optimistically", async () => {
    let resolve!: () => void;
    vi.mocked(api.saveFolderIcon).mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.folderMetadata, folders);
    const { result } = renderHook(() => useFolderMetadata(), { wrapper: Wrapper });

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.setIcon("Work", null);
    });

    await waitFor(() => {
      const cached = qc.getQueryData<FolderMetadata[]>(queryKeys.folderMetadata);
      expect(cached?.find((folder) => folder.path === "Work")).toBeUndefined();
    });

    expect(api.saveFolderIcon).toHaveBeenCalledWith("Work", null);
    resolve();
    await act(async () => {
      await promise;
    });
  });
});
