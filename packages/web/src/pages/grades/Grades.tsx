import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function Grades() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Grades</h1>
        <p className="text-muted-foreground">
          View your course grades and feedback.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grades Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Grades page placeholder. Student grades will be displayed here
            later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
