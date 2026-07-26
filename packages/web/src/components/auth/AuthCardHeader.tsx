import { CardHeader, CardTitle } from "../ui/card";

export function AuthCardHeader({ description }: { description: string }) {
  return (
    <CardHeader className="space-y-2 text-center">
      <CardTitle className="text-2xl font-bold tracking-tight">
        Bootcamp<span className="text-primary">.</span>
      </CardTitle>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardHeader>
  );
}
