import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function InstructorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Instructor Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage courses, students, submissions, and grading.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructor Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Instructor dashboard placeholder. Instructor statistics will be
            added here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
