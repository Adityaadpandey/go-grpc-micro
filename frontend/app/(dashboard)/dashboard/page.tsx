import type { Metadata } from "next";
import { TopNav } from "@/components/layout/top-nav";
import { DashboardOverview } from "@/components/dashboard/overview";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col h-full">
      <TopNav
        title={`Welcome back, ${user?.name ?? "User"}`}
        description="Here's an overview of your platform"
      />
      <div className="flex-1 p-6">
        <DashboardOverview />
      </div>
    </div>
  );
}
