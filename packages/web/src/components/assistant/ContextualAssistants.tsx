import { useAuth } from "../../hooks/useAuth";
import {
  courseAssistant,
  generalAssistant,
  instructorAssistant,
} from "./assistant-configs";
import { AssistantLauncher } from "./AssistantLauncher";
import {
  mockCourseAssistant,
  sendGeneralAssistant,
  mockInstructorAssistant,
} from "./mock-send";

export function GeneralAssistantLauncher() {
  return (
    <AssistantLauncher
      config={generalAssistant}
      onSend={sendGeneralAssistant}
    />
  );
}

export function CourseContextAssistant({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const { user } = useAuth();
  if (!user) return null;

  const isInstructor = user.role === "instructor";
  const config = isInstructor
    ? instructorAssistant(courseId, courseTitle)
    : courseAssistant(courseId, courseTitle);

  return (
    <AssistantLauncher
      config={config}
      onSend={isInstructor ? mockInstructorAssistant : mockCourseAssistant}
    />
  );
}

export function InstructorContextAssistant({
  courseId,
  courseTitle,
}: {
  courseId?: string;
  courseTitle?: string;
}) {
  return (
    <AssistantLauncher
      config={instructorAssistant(courseId, courseTitle)}
      onSend={mockInstructorAssistant}
    />
  );
}
