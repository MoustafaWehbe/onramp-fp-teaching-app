import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronRight, Flag } from "lucide-react";
import { Card } from "../../components/ui/card";
import { buttonVariants } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { cn } from "../../lib/utils";
import { courses } from "../../lib/platform-data";

export function CoursePage() {
  const { courseId } = useParams();
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    [course.modules[0].id]: true,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {course.description}
        </p>
      </div>
      <div className="relative space-y-3">
        {course.modules.map((module) => {
          const isOpen = Boolean(openModules[module.id]);
          return (
            <Card key={module.id} className="overflow-hidden border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenModules((current) => ({
                    ...current,
                    [module.id]: !isOpen,
                  }))
                }
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {module.number}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Module {module.number}
                    </p>
                    <p className="font-semibold">{module.title}</p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div
                className={cn(
                  "border-t border-border bg-secondary/30",
                  !isOpen && "hidden",
                )}
              >
                <div className="px-5 py-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lessons
                  </p>
                  <ul className="space-y-1.5">
                    {module.lessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className="flex items-center gap-2.5 py-1.5 text-sm"
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{lesson.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-border px-5 py-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Milestones
                  </p>
                  <ul className="space-y-2">
                    {module.milestones.map((milestone) => (
                      <li
                        key={milestone.id}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5 text-sm">
                          <Flag className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate">{milestone.title}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={milestone.status} />
                          <Link
                            to={`/milestones/${milestone.id}/submit`}
                            className={buttonVariants({
                              size: "sm",
                              variant: "outline",
                            })}
                          >
                            Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
