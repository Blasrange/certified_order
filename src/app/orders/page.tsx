"use client";

import * as React from "react";
import AppShell from "@/components/layout/AppShell";
import OrdersPanel from "@/components/panels/orders";

export default function OrdersPage() {
  const [subView, setSubView] = React.useState<'list' | 'detail'>('list');
  const [processName, setProcessName] = React.useState("");

  return (
    <AppShell 
      ordersSubView={subView} 
      selectedProcessName={processName}
      onOrdersViewChange={(v) => setSubView(v)}
    >
      <OrdersPanel 
        externalView={subView}
        onViewChange={(view, name) => {
          setSubView(view);
          if (name) setProcessName(name);
        }}
      />
    </AppShell>
  );
}
