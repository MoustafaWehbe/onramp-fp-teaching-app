import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function InstructorCourses() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Instructor Courses
        </h1>
        <p className="text-muted-foreground">
          Create and manage teaching app courses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Instructor courses placeholder. Course management tools will be
            added here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
