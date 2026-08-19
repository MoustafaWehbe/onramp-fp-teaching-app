import { useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  sendCourseAssistantMessage,
  sendGeneralAssistantMessage,
  sendInstructorAssistantMessage,
} from "../../lib/assistant-api";
import {
  courseAssistant,
  generalAssistant,
  instructorAssistant,
} from "./assistant-configs";
import { AssistantLauncher } from "./AssistantLauncher";
import type { AssistantMessage } from "./types";

export function GeneralAssistantLauncher() {
  const sendGeneralMessage = useCallback(
    (message: string, _history: AssistantMessage[], signal?: AbortSignal) =>
      sendGeneralAssistantMessage(message, signal),
    [],
  );

  return (
    <AssistantLauncher config={generalAssistant} onSend={sendGeneralMessage} />
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
  const sendInstructorMessage = useCallback(
    (message: string, history: AssistantMessage[], signal?: AbortSignal) =>
      sendInstructorAssistantMessage(courseId, message, history, signal),
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
      onSend={isInstructor ? sendInstructorMessage : sendCourseMessage}
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
  const sendInstructorMessage = useCallback(
    (message: string, history: AssistantMessage[], signal?: AbortSignal) => {
      if (!courseId) {
        return Promise.reject(new Error("A course is required."));
      }
      return sendInstructorAssistantMessage(courseId, message, history, signal);
    },
    [courseId],
  );

  if (!courseId || !courseTitle) return null;

  return (
    <AssistantLauncher
      config={instructorAssistant(courseId, courseTitle)}
      onSend={sendInstructorMessage}
    />
  );
}
