export enum AIErrorCode {
  NOT_CONFIGURED = "AI_NOT_CONFIGURED",
  PROVIDER_ERROR = "AI_PROVIDER_ERROR",
  INVALID_RESPONSE = "AI_INVALID_RESPONSE",
}

const ERROR_MESSAGES: Record<AIErrorCode, string> = {
  [AIErrorCode.NOT_CONFIGURED]: "AI service is not configured.",
  [AIErrorCode.PROVIDER_ERROR]: "AI provider request failed.",
  [AIErrorCode.INVALID_RESPONSE]: "AI provider returned an invalid response.",
};

export class AIError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, options?: ErrorOptions) {
    super(ERROR_MESSAGES[code], options);
    this.name = "AIError";
    this.code = code;
  }
}
