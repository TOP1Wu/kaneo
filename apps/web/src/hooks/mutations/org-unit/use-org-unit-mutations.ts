import { useMutation, useQueryClient } from "@tanstack/react-query";
import createOrgUnit, {
  type CreateOrgUnitRequest,
} from "@/fetchers/org-unit/create-org-unit";
import deleteOrgUnit from "@/fetchers/org-unit/delete-org-unit";
import replaceOrgUnitMembers, {
  type OrgUnitMemberInput,
} from "@/fetchers/org-unit/replace-org-unit-members";
import updateOrgUnit, {
  type UpdateOrgUnitBody,
} from "@/fetchers/org-unit/update-org-unit";

// Org writes publish no realtime event, so the writer refreshes everything the
// structure feeds: the tree, everyone's scope, and the board and dashboard.
function useInvalidateOrg(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["org-units", workspaceId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["org-scope", workspaceId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["leader-board", workspaceId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["dashboard", workspaceId],
    });
  };
}

export function useCreateOrgUnit(workspaceId: string) {
  const invalidate = useInvalidateOrg(workspaceId);
  return useMutation({
    mutationFn: (request: Omit<CreateOrgUnitRequest, "workspaceId">) =>
      createOrgUnit({ ...request, workspaceId }),
    onSuccess: invalidate,
  });
}

export function useUpdateOrgUnit(workspaceId: string) {
  const invalidate = useInvalidateOrg(workspaceId);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOrgUnitBody }) =>
      updateOrgUnit(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteOrgUnit(workspaceId: string) {
  const invalidate = useInvalidateOrg(workspaceId);
  return useMutation({
    mutationFn: (id: string) => deleteOrgUnit(id),
    onSuccess: invalidate,
  });
}

export function useReplaceOrgUnitMembers(workspaceId: string) {
  const invalidate = useInvalidateOrg(workspaceId);
  return useMutation({
    mutationFn: ({
      id,
      members,
    }: {
      id: string;
      members: OrgUnitMemberInput[];
    }) => replaceOrgUnitMembers(id, members),
    onSuccess: invalidate,
  });
}
