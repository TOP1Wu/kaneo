import { getWorkspaceInvitationEmailCopy } from "./get-workspace-invitation-email-copy";

export function getInvitationEmailSubject(
  locale: string | null,
  inviterName: string,
  workspaceName: string,
  instanceName = "齐活",
) {
  const values: Record<string, string> = {
    inviterName,
    workspaceName,
    instanceName,
  };

  return getWorkspaceInvitationEmailCopy(locale).subject.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => values[key] ?? "",
  );
}
