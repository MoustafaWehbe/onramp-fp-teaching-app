import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function LessonDetails() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lesson Details</h1>
        <p className="text-muted-foreground">
          View lesson content and learning materials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson ID: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lesson details placeholder. Lesson content will be added here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
