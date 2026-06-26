import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function CourseDetails() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Course Details</h1>
        <p className="text-muted-foreground">
          View course information, modules, and lessons.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course ID: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Course details placeholder. Modules and lessons will be added here
            later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
