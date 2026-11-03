import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import PageTitle from "@/components/page-title";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/dashboard",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();

  return (
    <>
      <PageTitle title={t("workspace:dashboard.title")} />
      <DashboardPage workspaceId={workspaceId} />
    </>
  );
}
