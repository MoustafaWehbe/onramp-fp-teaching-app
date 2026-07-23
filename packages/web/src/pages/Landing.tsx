import { Link } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center border-b border-border bg-card px-6">
        <span className="font-bold tracking-tight">
          Bootcamp<span className="text-primary">.</span>
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-2xl space-y-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            A focused learning platform for bootcamps
          </h1>
          <p className="text-muted-foreground">
            Structured curricula, milestone-based submissions, and instructor
            reviews — without the noise.
          </p>
          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Link
              to="/login"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              <GraduationCap className="h-4 w-4" />
              Log in to learn
            </Link>
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "gap-2",
              )}
            >
              <Users className="h-4 w-4" />
              Create an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

