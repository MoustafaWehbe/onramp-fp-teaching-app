import { Award, Mail, Trophy } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { studentProfile } from "../../lib/platform-data";

export function StudentProfilePage() {
  const { user } = useAuth();
  const profile = studentProfile;
  const progress = Math.round(
    (profile.stats.milestonesCompleted / profile.stats.milestonesTotal) * 100,
  );
  const initials = (user?.name ?? "Student")
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your learning portfolio at a glance.
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
              <p className="text-sm text-muted-foreground">{profile.headline}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user?.email}
              </span>
              <span>{profile.cohort}</span>
            </div>
            <p className="pt-2 text-sm">{profile.bio}</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Average score" value={`${profile.stats.averageScore}`} suffix="/100" />
        <StatCard
          label="Milestones"
          value={`${profile.stats.milestonesCompleted}/${profile.stats.milestonesTotal}`}
          suffix={`· ${progress}%`}
        />
        <StatCard label="Certificates" value={`${profile.stats.certificates}`} />
        <StatCard label="Skills" value={`${profile.skills.length}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" /> Scores summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {profile.scores.map((score) => (
              <li key={score.milestone} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{score.milestone}</p>
                  <p className="text-xs text-muted-foreground">{score.course}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{score.score}/100</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" /> Certificates earned
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {profile.certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="rounded-md border border-border p-4"
            >
              <div>
                <p className="text-sm font-semibold">{certificate.title}</p>
                <p className="text-xs text-muted-foreground">Issued {certificate.issued}</p>
                <p className="mt-1 text-xs text-muted-foreground">ID: {certificate.credentialId}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Skills</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">
          {value}
          {suffix && <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

