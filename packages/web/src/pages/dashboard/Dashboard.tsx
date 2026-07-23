import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { buttonVariants } from "../../components/ui/button";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { courses, recentActivity } from "../../lib/platform-data";

export function Dashboard() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue where you left off across your enrolled bootcamps.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {courses.map((course) => {
          const lessonCount = course.modules.reduce(
            (total, module) => total + module.lessons.length,
            0,
          );
          return (
            <Card key={course.id} className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {course.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    {course.modules.length} modules
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    {lessonCount} lessons
                  </span>
                </div>
                <Link
                  to={`/courses/${course.id}`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  Continue learning
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Recent Activity
        </h2>
        <Card className="border-border">
          <ul className="divide-y divide-border">
            {recentActivity.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {activity.milestoneTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {activity.when}
                  </p>
                </div>
                <StatusBadge status={activity.status} />
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
