import { BookOpen, Mail, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { instructorProfile } from "../../lib/platform-data";

export function InstructorProfilePage() {
  const { user } = useAuth();
  const profile = instructorProfile;
  const initials = (user?.name ?? "Instructor")
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your teaching profile and expertise.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-start gap-6 p-6 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.title}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user?.email}
              </span>
              <span>{profile.headline}</span>
            </div>
            <p className="pt-2 text-sm">{profile.bio}</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Years teaching" value={`${profile.stats.yearsTeaching}`} />
        <StatCard label="Students mentored" value={`${profile.stats.studentsMentored}`} />
        <StatCard label="Reviews completed" value={`${profile.stats.reviewsCompleted}`} />
        <StatCard label="Avg. response" value={`${profile.stats.avgResponseHours}h`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> Currently teaching
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {profile.teaching.map((course) => (
              <li key={course.course} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{course.course}</p>
                  <p className="text-xs text-muted-foreground">{course.role}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {course.students} students
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Areas of expertise</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {profile.expertise.map((skill) => (
            <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

