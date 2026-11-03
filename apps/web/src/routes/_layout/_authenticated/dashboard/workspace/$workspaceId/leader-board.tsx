import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LeaderBoardPage } from "@/components/leader-board/leader-board-page";
import PageTitle from "@/components/page-title";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/leader-board",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();

  return (
    <>
      <PageTitle title={t("workspace:leaderBoard.title")} />
      <LeaderBoardPage workspaceId={workspaceId} />
    </>
  );
}
