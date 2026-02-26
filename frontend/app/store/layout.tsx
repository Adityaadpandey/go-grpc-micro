import type { Metadata } from "next";
import { ApolloWrapper } from "@/components/providers/apollo-provider";
import { StoreNav } from "@/components/store/store-nav";

export const metadata: Metadata = { title: "Store – MicroMart" };

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApolloWrapper>
      <div className="min-h-screen bg-background">
        <StoreNav />
        <main>{children}</main>
      </div>
    </ApolloWrapper>
  );
}
