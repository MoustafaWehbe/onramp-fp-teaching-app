import {
  AlertTriangle,
  FileText,
  MessagesSquare,
  RotateCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type {
  AssistantConfig,
  AssistantMessage,
  AssistantSource,
} from "./types";

export function SourceList({ sources }: { sources: AssistantSource[] }) {
  return (
    <section aria-label="Sources" className="w-full space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Sources
      </p>
      <ul className="space-y-1.5">
        {sources.map((source, index) => (
          <li
            key={`${source.type}:${source.id ?? source.title}:${index}`}
            className="flex min-w-0 items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
          >
            <FileText
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
            />
            <span className="min-w-0 break-words font-medium">
              {source.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      role="group"
      aria-label={`${isUser ? "User" : "Assistant"} message`}
      aria-live={isUser ? undefined : "polite"}
      className={cn(
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] break-words rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-secondary text-secondary-foreground",
        )}
      >
        {message.content}
      </div>
      {!isUser && message.sources && message.sources.length > 0 && (
        <SourceList sources={message.sources} />
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div
      role="status"
      className="flex w-fit items-center gap-1.5 rounded-lg rounded-bl-sm bg-secondary px-3.5 py-3"
    >
      <span className="sr-only">Assistant is responding</span>
      {[0, 1, 2].map((index) => (
        <span
          aria-hidden="true"
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
      />
      <div className="min-w-0 flex-1">
        <p className="break-words text-xs text-destructive">{message}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 h-7 gap-1.5"
          onClick={onRetry}
        >
          <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}

export function PromptChips({
  prompts,
  onSelect,
  disabled = false,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Suggested prompts"
      className="flex flex-wrap gap-2"
    >
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

export function EmptyConversation({
  config,
  onSelectPrompt,
  disabled,
}: {
  config: AssistantConfig;
  onSelectPrompt: (prompt: string) => void;
  disabled: boolean;
}) {
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Icon aria-hidden="true" className="h-6 w-6 text-primary" />
      </div>
      <div>
        <Badge className="text-[10px] tracking-wider">{config.badge}</Badge>
        <p className="mt-2 font-semibold">{config.name}</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {config.description}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessagesSquare aria-hidden="true" className="h-3.5 w-3.5" />
        No messages yet — try one of these
      </div>
      <PromptChips
        prompts={config.suggestedPrompts}
        onSelect={onSelectPrompt}
        disabled={disabled}
      />
    </div>
  );
}
