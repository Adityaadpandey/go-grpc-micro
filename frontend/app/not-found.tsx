import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-8xl font-bold text-muted-foreground/30">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for does not exist.
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link href="/dashboard">
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </Button>
    </div>
  );
}
