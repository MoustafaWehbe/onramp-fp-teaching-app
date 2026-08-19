import { useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { sendCourseAssistantMessage } from "../../lib/assistant-api";
import {
  courseAssistant,
  generalAssistant,
  instructorAssistant,
} from "./assistant-configs";
import { AssistantLauncher } from "./AssistantLauncher";
import { sendGeneralAssistant, mockInstructorAssistant } from "./mock-send";
import type { AssistantMessage } from "./types";

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
  const sendCourseMessage = useCallback(
    (message: string, history: AssistantMessage[], signal?: AbortSignal) =>
      sendCourseAssistantMessage(courseId, message, history, signal),
    [courseId],
  );
  if (!user) return null;

  const isInstructor = user.role === "instructor";
  const config = isInstructor
    ? instructorAssistant(courseId, courseTitle)
    : courseAssistant(courseId, courseTitle);

  return (
    <AssistantLauncher
      config={config}
      onSend={isInstructor ? mockInstructorAssistant : sendCourseMessage}
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
