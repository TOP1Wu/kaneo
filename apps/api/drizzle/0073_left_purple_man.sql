CREATE TABLE "org_unit_member" (
	"id" text PRIMARY KEY NOT NULL,
	"org_unit_id" text NOT NULL,
	"user_id" text NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	CONSTRAINT "org_unit_member_unit_user_unique" UNIQUE("org_unit_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "org_unit" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_member" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"progress" text DEFAULT 'todo' NOT NULL,
	"started_at" timestamp,
	"done_at" timestamp,
	"note" text,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	CONSTRAINT "task_member_task_user_role_unique" UNIQUE("task_id","user_id","role_id"),
	CONSTRAINT "task_member_progress_check" CHECK ("task_member"."progress" in ('todo', 'doing', 'done'))
);
--> statement-breakpoint
CREATE TABLE "task_role" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_owner_role" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	CONSTRAINT "task_role_workspace_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
ALTER TABLE "org_unit_member" ADD CONSTRAINT "org_unit_member_org_unit_id_org_unit_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_unit"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "org_unit_member" ADD CONSTRAINT "org_unit_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_parent_id_org_unit_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."org_unit"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_member" ADD CONSTRAINT "task_member_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_member" ADD CONSTRAINT "task_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_member" ADD CONSTRAINT "task_member_role_id_task_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."task_role"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_member" ADD CONSTRAINT "task_member_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_role" ADD CONSTRAINT "task_role_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "org_unit_member_userId_idx" ON "org_unit_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_unit_workspaceId_idx" ON "org_unit" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "org_unit_parentId_idx" ON "org_unit" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "task_member_userId_progress_idx" ON "task_member" USING btree ("user_id","progress");--> statement-breakpoint
CREATE INDEX "task_member_taskId_idx" ON "task_member" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_member_roleId_idx" ON "task_member" USING btree ("role_id");--> statement-breakpoint
-- Data (hand-written): default task roles for every existing workspace.
-- Keep in sync with apps/api/src/task-role/default-roles.ts.
INSERT INTO "task_role" ("id", "workspace_id", "name", "slug", "position", "is_owner_role")
SELECT gen_random_uuid()::text, "workspace"."id", r."name", r."slug", r."position", r."is_owner_role"
FROM "workspace"
CROSS JOIN (VALUES
	('主要负责人', 'owner', 0, true),
	('产品', 'product', 1, false),
	('开发', 'dev', 2, false),
	('测试', 'qa', 3, false)
) AS r("name", "slug", "position", "is_owner_role")
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Data (hand-written): each assigned task gets its assignee as the primary owner.
-- Progress comes from the task's column; tasks without a column yet (installs
-- upgrading from before columns) fall back to the legacy 'done' status slug.
-- Timestamps reuse the task's own: started_at = created_at, done_at = updated_at.
INSERT INTO "task_member" ("id", "task_id", "user_id", "role_id", "progress", "started_at", "done_at")
SELECT
	gen_random_uuid()::text,
	"task"."id",
	"task"."assignee_id",
	"task_role"."id",
	CASE WHEN COALESCE("column"."is_final", "task"."status" = 'done') THEN 'done' ELSE 'doing' END,
	CASE WHEN COALESCE("column"."is_final", "task"."status" = 'done') THEN NULL ELSE "task"."created_at" END,
	CASE WHEN COALESCE("column"."is_final", "task"."status" = 'done') THEN "task"."updated_at" ELSE NULL END
FROM "task"
INNER JOIN "project" ON "project"."id" = "task"."project_id"
INNER JOIN "task_role" ON "task_role"."workspace_id" = "project"."workspace_id"
	AND "task_role"."slug" = 'owner'
	AND "task_role"."is_owner_role" = true
LEFT JOIN "column" ON "column"."id" = "task"."column_id"
WHERE "task"."assignee_id" IS NOT NULL
ON CONFLICT DO NOTHING;
