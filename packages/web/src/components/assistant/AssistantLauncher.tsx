import { useId, useState } from "react";
import { Button } from "../ui/button";
import { AssistantPanel } from "./AssistantPanel";
import { isAssistantOpen, setAssistantOpen } from "./conversation-store";
import type { AssistantConfig, AssistantMessage, AssistantSend } from "./types";

export type AssistantLauncherProps = {
  config: AssistantConfig;
  onSend: AssistantSend;
  initialMessages?: AssistantMessage[];
};

function AssistantLauncherInstance({
  config,
  onSend,
  initialMessages,
}: AssistantLauncherProps) {
  const panelId = useId();
  const [open, setOpenState] = useState(() => isAssistantOpen(config.id));
  const Icon = config.icon;

  function setOpen(nextOpen: boolean) {
    setAssistantOpen(config.id, nextOpen);
    setOpenState(nextOpen);
  }

  return (
    <>
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 h-12 gap-2 rounded-full px-4 shadow-lg sm:right-5 sm:px-5 md:bottom-5"
          aria-controls={panelId}
          aria-expanded="false"
          aria-haspopup="dialog"
          aria-label={`Open ${config.name}`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          <span className="hidden text-sm sm:inline">{config.name}</span>
        </Button>
      )}
      {open && (
        <AssistantPanel
          id={panelId}
          config={config}
          onClose={() => setOpen(false)}
          onSend={onSend}
          initialMessages={initialMessages}
        />
      )}
    </>
  );
}

export function AssistantLauncher(props: AssistantLauncherProps) {
  return <AssistantLauncherInstance key={props.config.id} {...props} />;
}
