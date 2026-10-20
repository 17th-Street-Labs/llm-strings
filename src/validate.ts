import { parse } from "./parse.js";
import { normalize } from "./normalize.js";
import {
  PARAM_SPECS,
  PROVIDER_PARAMS,
  bedrockSupportsCaching,
  detectBedrockModelFamily,
  modelMatchesFamily,
  isJevModel,
  type ParamSpec,
  type Provider,
} from "./provider-core.js";

export interface ValidationIssue {
  param: string;
  value: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidateOptions {
  /** Report unknown providers/params as errors instead of allowing model-specific params through. */
  strict?: boolean;
}

/**
 * Build a reverse map from provider-specific param names back to canonical names.
 */
function buildReverseParamMap(provider: Provider): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [canonical, specific] of Object.entries(
    PROVIDER_PARAMS[provider],
  )) {
    map[specific] = canonical;
  }
  return map;
}

/**
 * Look up a sub-provider's ParamSpec for a gateway-normalized param name.
 * Maps: gateway param → canonical → sub-provider-specific → spec.
 */
function lookupSubProviderSpec(
  gatewayParamName: string,
  gatewayReverseMap: Record<string, string>,
  subProvider: Provider,
) {
  const canonical = gatewayReverseMap[gatewayParamName] ?? gatewayParamName;
  const subProviderKey = PROVIDER_PARAMS[subProvider]?.[canonical];
  if (!subProviderKey) return { spec: undefined, canonical };
  return { spec: PARAM_SPECS[subProvider]?.[subProviderKey], canonical };
}

/**
 * Build the set of gateway param names that correspond to params the sub-provider supports.
 */
function buildSubProviderKnownParams(
  gateway: Provider,
  subProvider: Provider,
): Set<string> {
  const known = new Set<string>();
  const subProviderCanonicals = new Set(
    Object.keys(PROVIDER_PARAMS[subProvider]),
  );
  for (const [canonical, gatewaySpecific] of Object.entries(
    PROVIDER_PARAMS[gateway],
  )) {
    if (subProviderCanonicals.has(canonical)) {
      known.add(gatewaySpecific);
    }
  }
  return known;
}

/**
 * Validate an LLM connection string.
 *
 * Parses and normalizes the string, then checks params against provider specs.
 * For gateway providers (OpenRouter, Vercel), detects the sub-provider from the
 * model prefix and validates against the sub-provider's rules when known.
 * Returns a list of issues found. An empty array means all params look valid.
 */
export function validate(
  connectionString: string,
  options: ValidateOptions = {},
): ValidationIssue[] {
  const parsed = parse(connectionString);
  const { config, provider, subProvider } = normalize(parsed);
  const issues: ValidationIssue[] = [];

  if (!provider) {
    issues.push({
      param: "host",
      value: config.host,
      message: `Unknown provider for host "${config.host}". Validation skipped.`,
      severity: options.strict ? "error" : "warning",
    });
    return issues;
  }

  // When routing through a gateway to a known sub-provider, validate against
  // the sub-provider's specs. Fall back to the gateway's loose specs otherwise.
  const effectiveProvider = subProvider ?? provider;
  const specs = PARAM_SPECS[effectiveProvider];
  if (provider === "openrouter" && isJevModel(config.model)) {
    for (const [key, value] of Object.entries(config.params)) {
      if (
        [
          "temperature",
          "top_p",
          "max_tokens",
          "max_completion_tokens",
          "reasoning_effort",
          "stream",
        ].includes(key)
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message: `Jev uses the Decisions API and does not support chat generation parameter "${key}".`,
        });
      }
    }
  }

  const gatewayReverseMap = subProvider
    ? buildReverseParamMap(provider)
    : undefined;

  const knownParams = subProvider
    ? buildSubProviderKnownParams(provider, subProvider)
    : new Set(Object.values(PROVIDER_PARAMS[provider]));

  // GLM variants have separate contracts; these rules target the flagship ID.
  const isGlm53 =
    effectiveProvider === "zai" &&
    config.model.split("/").pop()?.split(":")[0] === "glm-5.3";
  const isKimiK3 =
    effectiveProvider === "moonshotai" &&
    modelMatchesFamily(config.model, "kimi-k3");

  for (const [key, value] of Object.entries(config.params)) {
    const subProviderSpecResult =
      subProvider && gatewayReverseMap
        ? lookupSubProviderSpec(key, gatewayReverseMap, subProvider)
        : undefined;
    const gatewayOwnSpec =
      subProvider && !subProviderSpecResult?.spec
        ? PARAM_SPECS[provider]?.[key]
        : undefined;

    if (
      effectiveProvider === "openai" &&
      ["gpt-6-astra", "gpt-6.1-sol"].some((family) =>
        modelMatchesFamily(config.model, family),
      ) &&
      key === "reasoning_effort" &&
      !["low", "medium", "high", "xhigh", "max"].includes(value)
    ) {
      issues.push({
        param: key,
        value,
        message: `"${key}" must be one of [low, medium, high, xhigh, max] for ${config.model}, got "${value}".`,
        severity: "error",
      });
      continue;
    }

    if (
      (effectiveProvider === "google" ||
        effectiveProvider === "google-vertex") &&
      modelMatchesFamily(config.model, "gemini-4-argon") &&
      (key === "thinkingLevel" || key === "reasoning_effort") &&
      !["low", "medium", "high"].includes(value)
    ) {
      issues.push({
        param: key,
        value,
        severity: "error",
        message: "Gemini 4 Argon thinking level must be low, medium, or high.",
      });
      continue;
    }

    if (isGlm53 || isKimiK3) {
      let invalidThinking = false;
      if (key === "thinking") {
        try {
          const setting = JSON.parse(value);
          invalidThinking =
            !setting ||
            typeof setting !== "object" ||
            setting.type !== "enabled";
        } catch {
          invalidThinking = true;
        }
      }
      if (
        invalidThinking ||
        (key === "reasoning_effort" && !["low", "high", "max"].includes(value))
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message: `${isGlm53 ? "GLM-5.3" : "Kimi K3"} always thinks; use enabled thinking and low, high, or max effort.`,
        });
        continue;
      }
    }

    if (isKimiK3) {
      const fixed: Record<string, number> = {
        temperature: 1,
        top_p: 0.95,
        n: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
      };
      if (
        (Object.prototype.hasOwnProperty.call(fixed, key) &&
          Number(value) !== fixed[key]) ||
        (key === "max_completion_tokens" && Number(value) > 1048576)
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message: `Unsupported "${key}" for Kimi K3; use low/high/max effort, fixed sampling defaults, and at most 1048576 completion tokens.`,
        });
        continue;
      }
    }

    if (
      effectiveProvider === "anthropic" &&
      ["claude-haiku-5-5", "claude-haiku-5.5"].some((family) =>
        modelMatchesFamily(config.model, family),
      )
    ) {
      let invalidThinking = false;
      if (key === "thinking") {
        try {
          const setting = JSON.parse(value);
          invalidThinking =
            !setting ||
            typeof setting !== "object" ||
            (setting.type !== "adaptive" && setting.type !== "disabled") ||
            "budget_tokens" in setting ||
            "budgetTokens" in setting ||
            (setting.type === "disabled" &&
              ["xhigh", "max"].includes(
                config.params.effort ?? config.params.reasoning_effort,
              ));
        } catch {
          invalidThinking = true;
        }
      }
      if (
        invalidThinking ||
        (key === "temperature" && Number(value) !== 1) ||
        (key === "top_p" && Number(value) !== 0.99) ||
        key === "top_k"
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message:
            "Claude Haiku 5.5 accepts adaptive thinking, or disabled thinking up to high effort; omit sampling parameters (only temperature=1 or top_p=0.99 are accepted).",
        });
        continue;
      }
    }

    if (
      effectiveProvider === "google" &&
      modelMatchesFamily(config.model, "gemini-3.8-flash") &&
      (key === "thinkingLevel" || key === "reasoning_effort") &&
      value === "minimal"
    ) {
      issues.push({
        param: key,
        value,
        message: `"${key}" does not support "minimal" for Gemini 3.8 Flash; use low, medium, or high.`,
        severity: "error",
      });
      continue;
    }

    if (
      effectiveProvider === "xai" &&
      modelMatchesFamily(config.model, "grok-4.7")
    ) {
      if (
        key === "reasoning_effort" &&
        !["low", "medium", "high", "xhigh"].includes(value)
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message:
            "Grok 4.7 reasoning effort must be low, medium, high, or xhigh.",
        });
        continue;
      }
      if (key === "logprobs" || key === "top_logprobs") {
        issues.push({
          param: key,
          value,
          severity: options.strict ? "error" : "warning",
          message: `Grok 4.7 ignores "${key}".`,
        });
        continue;
      }
    }

    if (
      effectiveProvider === "anthropic" &&
      ["claude-fable-5-1", "claude-opus-5-5"].some((family) =>
        modelMatchesFamily(config.model, family),
      ) &&
      key === "thinking"
    ) {
      let thinking: unknown;
      try {
        thinking = JSON.parse(value);
      } catch {
        thinking = undefined;
      }
      if (
        !thinking ||
        typeof thinking !== "object" ||
        !("type" in thinking) ||
        thinking.type !== "adaptive"
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message:
            'This Claude model requires adaptive thinking; use thinking={"type":"adaptive"} or omit it.',
        });
        continue;
      }
    }

    if (
      effectiveProvider === "anthropic" &&
      ["claude-sonnet-5-5", "claude-sonnet-5.5"].some((family) =>
        modelMatchesFamily(config.model, family),
      )
    ) {
      if (key === "thinking" || key === "tool_choice") {
        let setting: unknown;
        try {
          setting = JSON.parse(value);
        } catch {
          setting = undefined;
        }
        const type =
          setting && typeof setting === "object" && "type" in setting
            ? setting.type
            : undefined;
        if (
          (key === "thinking" &&
            ((type !== "adaptive" && type !== "between_tools") ||
              (type === "between_tools" &&
                (Object.keys(setting as object).length !== 1 ||
                  ["xhigh", "max"].includes(
                    config.params.effort ?? config.params.reasoning_effort,
                  ))))) ||
          (key === "tool_choice" && type !== "auto" && type !== "none")
        ) {
          issues.push({
            param: key,
            value,
            severity: "error",
            message:
              key === "thinking"
                ? "Claude Sonnet 5.5 accepts adaptive thinking, or between_tools at low, medium, or high effort."
                : 'Claude Sonnet 5.5 accepts tool_choice types "auto" and "none".',
          });
          continue;
        }
      }
      if (
        (key === "temperature" && value !== "1") ||
        (key === "top_p" && value !== "1") ||
        key === "top_k"
      ) {
        issues.push({
          param: key,
          value,
          severity: "error",
          message: `Claude Sonnet 5.5 does not accept a non-default "${key}".`,
        });
        continue;
      }
    }

    // Bedrock model-family-specific checks
    if (provider === "bedrock") {
      const family = detectBedrockModelFamily(config.model);

      // topK is only supported by Claude, Cohere, and Mistral on Bedrock
      if (
        key === "topK" &&
        family &&
        family !== "anthropic" &&
        family !== "cohere" &&
        family !== "mistral"
      ) {
        issues.push({
          param: key,
          value,
          message: `"topK" is not supported by ${family} models on Bedrock.`,
          severity: "error",
        });
        continue;
      }

      // cache_control is only supported by Claude and Nova on Bedrock
      if (key === "cache_control" && !bedrockSupportsCaching(config.model)) {
        issues.push({
          param: key,
          value,
          message: `Prompt caching is only supported for Anthropic Claude and Amazon Nova models on Bedrock, not ${family ?? "unknown"} models.`,
          severity: "error",
        });
        continue;
      }
    }

    // Check if param is known for this provider (or sub-provider).
    // Unknown params are allowed by default so model-specific inputs can pass
    // through without requiring a library release. Strict mode keeps typo checks.
    if (!knownParams.has(key) && !specs[key] && !gatewayOwnSpec) {
      if (options.strict) {
        issues.push({
          param: key,
          value,
          message: `Unknown param "${key}" for ${effectiveProvider}.`,
          severity: "error",
        });
      }
      continue;
    }

    // Look up the spec — for gateways with a sub-provider, map through
    // canonical names to find the sub-provider's spec
    const spec: ParamSpec | undefined =
      subProviderSpecResult?.spec ?? gatewayOwnSpec ?? specs[key];
    if (!spec) continue;

    // Anthropic (and Bedrock Claude, and Anthropic via gateway) mutual exclusion for temperature/top_p
    if (
      (effectiveProvider === "anthropic" ||
        (provider === "bedrock" &&
          detectBedrockModelFamily(config.model) === "anthropic")) &&
      (key === "temperature" || key === "top_p" || key === "topP")
    ) {
      const otherKey =
        key === "temperature"
          ? provider === "bedrock"
            ? "topP"
            : "top_p"
          : "temperature";
      // Only report error once (on the temperature param) to avoid duplicate errors
      if (key === "temperature" && config.params[otherKey] !== undefined) {
        issues.push({
          param: key,
          value,
          message: `Cannot specify both "temperature" and "${otherKey}" for Anthropic models.`,
          severity: "error",
        });
      }
    }

    if (spec.type === "number") {
      const num = Number(value);
      if (Number.isNaN(num)) {
        issues.push({
          param: key,
          value,
          message: `"${key}" should be a number, got "${value}".`,
          severity: "error",
        });
        continue;
      }
      if (spec.min !== undefined && num < spec.min) {
        issues.push({
          param: key,
          value,
          message: `"${key}" must be >= ${spec.min}, got ${num}.`,
          severity: "error",
        });
      }
      if (spec.max !== undefined && num > spec.max) {
        issues.push({
          param: key,
          value,
          message: `"${key}" must be <= ${spec.max}, got ${num}.`,
          severity: "error",
        });
      }
    }

    if (spec.type === "boolean") {
      if (!["true", "false", "0", "1"].includes(value)) {
        issues.push({
          param: key,
          value,
          message: `"${key}" should be a boolean (true/false), got "${value}".`,
          severity: "error",
        });
      }
    }

    if (spec.type === "json" || spec.type === "string[]") {
      try {
        const parsed: unknown =
          spec.type === "string[]" && !value.trim().startsWith("[")
            ? value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : JSON.parse(value);
        if (
          spec.type === "string[]" &&
          (!Array.isArray(parsed) ||
            parsed.some((item) => typeof item !== "string"))
        ) {
          throw new Error("not a string array");
        }
      } catch {
        issues.push({
          param: key,
          value,
          message:
            spec.type === "string[]"
              ? `"${key}" should be a JSON array of strings.`
              : `"${key}" should be valid JSON.`,
          severity: "error",
        });
      }
    }

    if (spec.type === "string" && spec.values) {
      if (!spec.values.includes(value)) {
        issues.push({
          param: key,
          value,
          message: `"${key}" must be one of [${spec.values.join(", ")}], got "${value}".`,
          severity: "error",
        });
      }
    }
  }

  return issues;
}
