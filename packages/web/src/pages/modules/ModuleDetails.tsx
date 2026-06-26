import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function ModuleDetails() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Module Details</h1>
        <p className="text-muted-foreground">
          View module lessons and learning content.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module ID: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Module details placeholder. Lessons will be displayed here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
