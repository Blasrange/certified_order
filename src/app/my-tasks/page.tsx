"use client";

import AppShell from "@/components/layout/AppShell";
import TasksPanel from "@/components/panels/tasks";

export default function TasksPage() {
  return (
    <AppShell>
      <TasksPanel />
    </AppShell>
  );
}
