import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { ProjectDistributionChart } from "./project-distribution-chart";
import { RoleCompletionChart } from "./role-completion-chart";
import { StatCards } from "./stat-cards";
import { StuckList } from "./stuck-list";
import { WorkloadChart } from "./workload-chart";

type DashboardViewProps = {
  data: Dashboard;
  onOpenTask: (task: { taskId: string; projectId: string }) => void;
};

/** Renders the API's numbers as given; the API already de-duplicates people. */
export function DashboardView({ data, onOpenTask }: DashboardViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <StatCards totals={data.totals} />
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkloadChart workload={data.workload} />
        <RoleCompletionChart roles={data.roleCompletion} />
      </div>
      <ProjectDistributionChart byProject={data.byProject} />
      <StuckList
        rows={data.stuckList}
        onOpen={(row) =>
          onOpenTask({ taskId: row.taskId, projectId: row.projectId })
        }
      />
    </div>
  );
}
