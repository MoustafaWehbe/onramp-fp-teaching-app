import { useAuth } from "../../hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="min-w-0 break-words text-right">{user?.name}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="min-w-0 break-all text-right">{user?.email}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="min-w-0 break-words text-right capitalize">
              {user?.role}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
