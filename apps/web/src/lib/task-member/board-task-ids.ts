type BoardTasks = {
  columns: readonly { tasks: readonly { id: string }[] }[];
  plannedTasks: readonly { id: string }[];
  archivedTasks: readonly { id: string }[];
};

/** Every task a board or list can show, for one batched summary request. */
export function boardTaskIds(project: BoardTasks | null | undefined): string[] {
  if (!project) return [];
  return [
    ...project.columns.flatMap((column) => column.tasks.map((task) => task.id)),
    ...project.plannedTasks.map((task) => task.id),
    ...project.archivedTasks.map((task) => task.id),
  ];
}
