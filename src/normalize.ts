import type { LlmConnectionConfig } from "./parse.js";
import {
  ALIASES,
  CACHE_TTLS,
  CACHE_VALUES,
  PROVIDER_PARAMS,
  REASONING_MODEL_UNSUPPORTED,
  bedrockSupportsCaching,
  canHostOpenAIModels,
  detectGatewaySubProvider,
  detectProvider,
  isGatewayProvider,
  isReasoningModel,
  modelMatchesFamily,
  providerFromHostAlias,
  type Provider,
} from "./provider-core.js";

const DURATION_RE = /^\d+[mh]$/;

export interface NormalizeChange {
  from: string;
  to: string;
  value: string;
  reason: string;
}

export interface NormalizeResult {
  config: LlmConnectionConfig;
  provider: Provider | undefined;
  /** Underlying provider extracted from gateway model prefix (e.g. "anthropic" from "anthropic/claude-sonnet-4-5"). */
  subProvider: Provider | undefined;
  changes: NormalizeChange[];
}

export interface NormalizeOptions {
  /** Include detailed change log in the result. */
  verbose?: boolean;
}

/**
 * Normalize an LLM connection config's params for its target provider.
 *
 * 1. Expands shorthand aliases (e.g. `temp` → `temperature`)
 * 2. Maps canonical param names to provider-specific names
 *    (e.g. `max_tokens` → `maxOutputTokens` for Google)
 * 3. Normalizes special values (e.g. `cache=true` → `cache_control=ephemeral` for Anthropic)
 * 4. For OpenAI reasoning models, remaps `max_tokens` → `max_completion_tokens`
 *    and warns about unsupported sampling params
 */
export function normalize(
  config: LlmConnectionConfig,
  options: NormalizeOptions = {},
): NormalizeResult {
  const provider =
    (config.hostAlias ? providerFromHostAlias(config.hostAlias) : undefined) ??
    detectProvider(config.host);
  const subProvider =
    provider && isGatewayProvider(provider)
      ? detectGatewaySubProvider(config.model)
      : undefined;
  const changes: NormalizeChange[] = [];
  const params: Record<string, string> = {};
  // Resolve aliases before iterating so behavior does not depend on query order.
  const effort = Object.fromEntries(
    Object.entries(config.params).map(([key, value]) => [
      ALIASES[key] ?? key,
      value,
    ]),
  ).effort;
  const supportsNoReasoning = ["gpt-6-sol", "gpt-6-luna"].some((family) =>
    modelMatchesFamily(config.model, family),
  );

  for (const [rawKey, value] of Object.entries(config.params)) {
    let key = rawKey;

    // Step 1: Expand aliases to canonical name
    if (ALIASES[key]) {
      const canonical = ALIASES[key];
      if (options.verbose) {
        changes.push({
          from: key,
          to: canonical,
          value,
          reason: `alias: "${key}" → "${canonical}"`,
        });
      }
      key = canonical;
    }

    // Step 2: Handle special "cache" param
    if (key === "cache" && provider) {
      let cacheValue = CACHE_VALUES[provider];

      // Bedrock supports cache for Anthropic Claude and Amazon Nova models
      if (provider === "bedrock" && !bedrockSupportsCaching(config.model)) {
        cacheValue = undefined;
      }

      // Provider/model doesn't support cache — drop it
      if (!cacheValue) {
        if (options.verbose) {
          changes.push({
            from: "cache",
            to: "(dropped)",
            value,
            reason: `${provider} does not use a cache param for this model (caching is automatic or unsupported)`,
          });
        }
        continue;
      }

      const isBool = value === "true" || value === "1" || value === "yes";
      const isDuration = DURATION_RE.test(value);

      if (isBool || isDuration) {
        const providerKey = PROVIDER_PARAMS[provider]?.cache ?? "cache";
        if (options.verbose) {
          changes.push({
            from: "cache",
            to: providerKey,
            value: cacheValue,
            reason: `cache=${value} → ${providerKey}=${cacheValue} for ${provider}`,
          });
        }
        params[providerKey] = cacheValue;

        // Emit cache_ttl when a duration is specified
        if (isDuration && CACHE_TTLS[provider]) {
          if (options.verbose) {
            changes.push({
              from: "cache",
              to: "cache_ttl",
              value,
              reason: `cache=${value} → cache_ttl=${value} for ${provider}`,
            });
          }
          params.cache_ttl = value;
        }
        continue;
      }
    }

    // Step 3: Map canonical → provider-specific param name
    if (provider && PROVIDER_PARAMS[provider]) {
      const providerKey = PROVIDER_PARAMS[provider][key];
      if (providerKey && providerKey !== key) {
        if (options.verbose) {
          changes.push({
            from: key,
            to: providerKey,
            value,
            reason: `${provider} uses "${providerKey}" instead of "${key}"`,
          });
        }
        key = providerKey;
      }
    }

    // Kimi's native API uses max_completion_tokens; gateways accept max_tokens.
    if (
      provider === "moonshotai" &&
      modelMatchesFamily(config.model, "kimi-k3") &&
      key === "max_tokens"
    ) {
      if (options.verbose) {
        changes.push({
          from: key,
          to: "max_completion_tokens",
          value,
          reason: "Kimi K3 uses max_completion_tokens instead of max_tokens",
        });
      }
      key = "max_completion_tokens";
    }

    // Step 4: OpenAI reasoning model adjustments (direct or via gateway)
    if (
      provider &&
      canHostOpenAIModels(provider) &&
      isReasoningModel(config.model) &&
      key === "max_tokens"
    ) {
      if (options.verbose) {
        changes.push({
          from: "max_tokens",
          to: "max_completion_tokens",
          value,
          reason:
            "OpenAI reasoning models use max_completion_tokens instead of max_tokens",
        });
      }
      key = "max_completion_tokens";
    }

    const isGpt6Unsupported =
      ["gpt-6-astra", "gpt-6.1-sol", "gpt-6-sol", "gpt-6-luna"].some((family) =>
        modelMatchesFamily(config.model, family),
      ) &&
      (key === "top_logprobs" || key === "logprobs");

    if (
      provider &&
      canHostOpenAIModels(provider) &&
      isReasoningModel(config.model) &&
      !(
        supportsNoReasoning &&
        effort === "none" &&
        ["temperature", "top_p", "top_logprobs", "logprobs"].includes(key)
      ) &&
      (REASONING_MODEL_UNSUPPORTED.has(key) || isGpt6Unsupported)
    ) {
      if (options.verbose) {
        changes.push({
          from: key,
          to: "(dropped)",
          value,
          reason: `${provider} reasoning model "${config.model}" does not support "${key}"`,
        });
      }
      continue;
    }

    params[key] = value;
  }

  return {
    config: { ...config, params },
    provider,
    subProvider,
    changes,
  };
}
