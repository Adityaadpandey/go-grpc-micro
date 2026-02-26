import type { Metadata } from "next";
import { TopNav } from "@/components/layout/top-nav";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopNav
        title="Accounts"
        description="Manage all registered accounts"
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            All accounts in the system with order history
          </p>
          <CreateAccountDialog />
        </div>
        <AccountsTable />
      </div>
    </div>
  );
}
