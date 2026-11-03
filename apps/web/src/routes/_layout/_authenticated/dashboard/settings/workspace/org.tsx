import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { OrgSettings } from "@/components/settings/org/org-settings";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/workspace/org",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();

  return (
    <>
      <PageTitle title={t("settings:org.title")} />
      <OrgSettings />
    </>
  );
}
