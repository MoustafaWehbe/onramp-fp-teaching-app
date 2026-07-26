import { Card } from "../../components/ui/card";
import { courses } from "../../lib/platform-data";

export function InstructorCoursesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Courses you teach and own.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.id} className="border-border p-5">
            <h3 className="font-semibold">{course.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {course.description}
            </p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                {course.modules.length} modules
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

