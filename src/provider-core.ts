export type Provider =
  | "openai"
  | "azure"
  | "anthropic"
  | "google"
  | "google-vertex"
  | "mistral"
  | "cohere"
  | "bedrock"
  | "openrouter"
  | "vercel"
  | "xai"
  | "meta"
  | "groq"
  | "fal"
  | "deepinfra"
  | "black-forest-labs"
  | "together"
  | "fireworks"
  | "deepseek"
  | "zai"
  | "moonshotai"
  | "perplexity"
  | "alibaba"
  | "cerebras"
  | "replicate"
  | "prodia"
  | "luma"
  | "bytedance"
  | "kling"
  | "elevenlabs"
  | "assemblyai"
  | "deepgram"
  | "gladia"
  | "lmnt"
  | "hume"
  | "revai"
  | "baseten"
  | "huggingface";

export type HostAlias =
  | Provider
  | "aistudio"
  | "alibaba"
  | "alibabacloud"
  | "atlascloud"
  | "baidu"
  | "cerebras"
  | "dashscope"
  | "deepinfra"
  | "deepseek"
  | "fireworks"
  | "fireworksai"
  | "groq"
  | "grok"
  | "bfl"
  | "minimax"
  | "moonshot"
  | "novita"
  | "novitaai"
  | "parasail"
  | "perplexity"
  | "qianfan"
  | "together"
  | "togetherai"
  | "vertex"
  | "venice"
  | "wandb"
  | "weightsandbiases"
  | "xai"
  | "xiaomi";

type Env = Record<string, string | undefined>;

declare const process:
  | {
      env?: Env;
    }
  | undefined;

function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export const HOST_ALIASES: Record<HostAlias, string> = {
  openai: "api.openai.com",
  azure: "models.inference.ai.azure.com",
  anthropic: "api.anthropic.com",
  google: "generativelanguage.googleapis.com",
  "google-vertex": "aiplatform.googleapis.com",
  aistudio: "generativelanguage.googleapis.com",
  mistral: "api.mistral.ai",
  cohere: "api.cohere.com",
  bedrock: "bedrock-runtime.us-east-1.amazonaws.com",
  openrouter: "openrouter.ai",
  vercel: "gateway.ai.vercel.app",
  meta: "api.meta.ai",
  alibaba: "dashscope-intl.aliyuncs.com",
  alibabacloud: "dashscope-intl.aliyuncs.com",
  dashscope: "dashscope-intl.aliyuncs.com",
  groq: "api.groq.com",
  fal: "fal.run",
  fireworks: "api.fireworks.ai",
  fireworksai: "api.fireworks.ai",
  "black-forest-labs": "api.bfl.ai",
  bfl: "api.bfl.ai",
  deepseek: "api.deepseek.com",
  zai: "api.z.ai",
  moonshotai: "api.moonshot.ai",
  moonshot: "api.moonshot.ai",
  perplexity: "api.perplexity.ai",
  venice: "api.venice.ai",
  parasail: "api.parasail.io",
  deepinfra: "api.deepinfra.com",
  atlascloud: "api.atlascloud.ai",
  novita: "api.novita.ai",
  novitaai: "api.novita.ai",
  grok: "api.x.ai",
  xai: "api.x.ai",
  together: "api.together.xyz",
  togetherai: "api.together.xyz",
  cerebras: "api.cerebras.ai",
  replicate: "api.replicate.com",
  prodia: "api.prodia.com",
  luma: "api.lumalabs.ai",
  bytedance: "ark.cn-beijing.volces.com",
  kling: "api.klingai.com",
  elevenlabs: "api.elevenlabs.io",
  assemblyai: "api.assemblyai.com",
  deepgram: "api.deepgram.com",
  gladia: "api.gladia.io",
  lmnt: "api.lmnt.com",
  hume: "api.hume.ai",
  revai: "api.rev.ai",
  baseten: "api.baseten.co",
  huggingface: "api-inference.huggingface.co",
  wandb: "api.inference.wandb.ai",
  weightsandbiases: "api.inference.wandb.ai",
  baidu: "qianfan.baidubce.com",
  qianfan: "qianfan.baidubce.com",
  vertex: "aiplatform.googleapis.com",
  xiaomi: "api.xiaomimimo.com",
  minimax: "api.minimax.io",
};

const HOST_ALIAS_PROVIDERS: Partial<Record<HostAlias, Provider>> = {
  aistudio: "google",
  vertex: "google-vertex",
  grok: "xai",
  bfl: "black-forest-labs",
  moonshot: "moonshotai",
  alibaba: "alibaba",
  alibabacloud: "alibaba",
  dashscope: "alibaba",
  togetherai: "together",
  fireworksai: "fireworks",
};

export interface HostResolution {
  /** The hostname/host to use for requests. */
  host: string;
  /** The provider alias that was expanded, if any. */
  alias?: HostAlias;
}

function readProcessEnv(): Env {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

function normalizeHostValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).host;
    }
  } catch {
    // Fall through and treat it as a host-ish string.
  }

  return trimmed.replace(/^\/\//, "").split("/")[0] ?? trimmed;
}

function envHostOverride(alias: HostAlias, env: Env): string | undefined {
  const upper = alias.toUpperCase();
  const override =
    env[`LLM_STRINGS_${upper}_HOST`] ?? env[`LLM_STRINGS_HOST_${upper}`];
  return override?.trim() ? override : undefined;
}

/**
 * Resolve short provider host aliases (`openai`, `anthropic`, etc.) to their
 * canonical hostnames. Per-provider environment overrides can redirect aliases
 * to regional or private endpoints:
 *
 * - `LLM_STRINGS_OPENAI_HOST`
 * - `LLM_STRINGS_HOST_OPENAI`
 */
export function resolveHostAlias(
  host: string,
  env: Env = readProcessEnv(),
): HostResolution {
  const normalizedHost = host.toLowerCase();
  if (!hasOwn(HOST_ALIASES, normalizedHost)) {
    return { host };
  }

  const alias = normalizedHost as HostAlias;
  const override = envHostOverride(alias, env);
  return {
    host: normalizeHostValue(override ?? HOST_ALIASES[alias]),
    alias,
  };
}

export function providerFromHostAlias(alias: string): Provider | undefined {
  const normalizedAlias = alias.toLowerCase();
  if (hasOwn(PROVIDER_PARAMS, normalizedAlias)) {
    return normalizedAlias as Provider;
  }
  if (hasOwn(HOST_ALIAS_PROVIDERS, normalizedAlias)) {
    return HOST_ALIAS_PROVIDERS[normalizedAlias as HostAlias];
  }
  return undefined;
}

function canonicalHostName(host: string): string {
  return normalizeHostValue(host).toLowerCase().split(":")[0] ?? host;
}

function hostMatches(host: string, ...domains: string[]): boolean {
  return domains.some((domain) => {
    const normalizedDomain = domain.toLowerCase();
    return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
  });
}

function hostHasLabel(host: string, ...labels: string[]): boolean {
  const hostLabels = host.split(".");
  return labels.some((label) => hostLabels.includes(label.toLowerCase()));
}

function hostHasLabelPrefix(host: string, ...prefixes: string[]): boolean {
  const hostLabels = host.split(".");
  return prefixes.some((prefix) =>
    hostLabels.some((label) => label.startsWith(prefix.toLowerCase())),
  );
}

const MODEL_FAMILY_DELIMITERS = new Set(["-", "."]);

function normalizeModelForMatching(model: string): string {
  return model.trim().toLowerCase();
}

function modelLeafName(model: string): string {
  const normalized = normalizeModelForMatching(model);
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

export function modelMatchesFamily(model: string, family: string): boolean {
  const name = modelLeafName(model);
  const normalizedFamily = normalizeModelForMatching(family);
  if (!name || !normalizedFamily) return false;
  if (name === normalizedFamily) return true;

  const delimiter = name[normalizedFamily.length];
  return (
    name.startsWith(normalizedFamily) &&
    delimiter !== undefined &&
    MODEL_FAMILY_DELIMITERS.has(delimiter)
  );
}

export function detectProvider(host: string): Provider | undefined {
  host = canonicalHostName(host);

  // Gateways and aggregators first — they proxy to other providers
  if (hostMatches(host, "openrouter", "openrouter.ai")) return "openrouter";
  if (
    hostMatches(host, "vercel", "gateway.ai.vercel.app", "gateway.ai.vercel.sh")
  ) {
    return "vercel";
  }
  // Bedrock before native providers since it hosts models from multiple vendors
  if (
    hostMatches(host, "bedrock", "amazonaws.com") ||
    hostHasLabelPrefix(host, "bedrock") ||
    (host.endsWith(".api.aws") && hostHasLabelPrefix(host, "bedrock-mantle"))
  ) {
    return "bedrock";
  }
  if (hostMatches(host, "aiplatform.googleapis.com")) return "google-vertex";
  if (hostMatches(host, "xai", "x.ai", "api.x.ai")) return "xai";
  if (hostMatches(host, "meta", "meta.ai", "api.meta.ai")) return "meta";
  if (hostMatches(host, "groq", "groq.com", "api.groq.com")) return "groq";
  if (hostMatches(host, "fal", "fal.run", "fal.ai")) return "fal";
  if (hostMatches(host, "deepinfra", "deepinfra.com")) return "deepinfra";
  if (hostMatches(host, "bfl", "bfl.ai", "api.bfl.ai")) {
    return "black-forest-labs";
  }
  if (hostMatches(host, "together", "together.xyz")) return "together";
  if (hostMatches(host, "fireworks", "fireworks.ai")) return "fireworks";
  if (hostMatches(host, "deepseek", "deepseek.com")) return "deepseek";
  if (hostMatches(host, "zai", "z.ai")) return "zai";
  if (hostMatches(host, "moonshot", "moonshot.ai")) return "moonshotai";
  if (hostMatches(host, "perplexity", "perplexity.ai")) return "perplexity";
  if (
    hostMatches(host, "alibaba", "aliyuncs.com") ||
    hostHasLabelPrefix(host, "dashscope")
  ) {
    return "alibaba";
  }
  if (hostMatches(host, "cerebras", "cerebras.ai")) return "cerebras";
  if (hostMatches(host, "replicate", "replicate.com")) return "replicate";
  if (hostMatches(host, "prodia", "prodia.com")) return "prodia";
  if (hostMatches(host, "luma", "lumalabs.ai")) return "luma";
  if (
    hostMatches(host, "bytedance", "volces.com") ||
    hostHasLabel(host, "bytedance")
  ) {
    return "bytedance";
  }
  if (hostMatches(host, "kling", "klingai.com")) return "kling";
  if (hostMatches(host, "elevenlabs", "elevenlabs.io")) return "elevenlabs";
  if (hostMatches(host, "assemblyai", "assemblyai.com")) return "assemblyai";
  if (hostMatches(host, "deepgram", "deepgram.com")) return "deepgram";
  if (hostMatches(host, "gladia", "gladia.io")) return "gladia";
  if (hostMatches(host, "lmnt", "lmnt.com")) return "lmnt";
  if (hostMatches(host, "hume", "hume.ai")) return "hume";
  if (hostMatches(host, "revai", "rev.ai")) return "revai";
  if (hostMatches(host, "baseten", "baseten.co")) return "baseten";
  if (hostMatches(host, "huggingface", "huggingface.co")) return "huggingface";
  if (hostMatches(host, "azure", "azure.com")) return "azure";
  if (hostMatches(host, "openai", "openai.com")) return "openai";
  if (hostMatches(host, "anthropic", "anthropic.com", "claude.ai")) {
    return "anthropic";
  }
  if (hostMatches(host, "google", "googleapis.com")) return "google";
  if (hostMatches(host, "mistral", "mistral.ai")) return "mistral";
  if (hostMatches(host, "cohere", "cohere.com")) return "cohere";
  return undefined;
}

/**
 * Shorthand aliases → canonical param name.
 * Canonical names use snake_case and follow OpenAI conventions where possible.
 */
export const ALIASES: Record<string, string> = {
  // temperature
  temp: "temperature",

  // max_tokens
  max: "max_tokens",
  max_out: "max_tokens",
  max_output: "max_tokens",
  max_output_tokens: "max_tokens",
  maxOutputTokens: "max_tokens",
  maxTokens: "max_tokens",

  // top_p
  topp: "top_p",
  topP: "top_p",
  nucleus: "top_p",

  // top_k
  topk: "top_k",
  topK: "top_k",

  // frequency_penalty
  freq: "frequency_penalty",
  freq_penalty: "frequency_penalty",
  frequencyPenalty: "frequency_penalty",
  repetition_penalty: "frequency_penalty",

  // presence_penalty
  pres: "presence_penalty",
  pres_penalty: "presence_penalty",
  presencePenalty: "presence_penalty",

  // stop
  stop_sequences: "stop",
  stopSequences: "stop",
  stop_sequence: "stop",

  // seed
  random_seed: "seed",
  randomSeed: "seed",

  // n (completions count)
  candidateCount: "n",
  candidate_count: "n",
  num_completions: "n",

  // effort / reasoning
  reasoning_effort: "effort",
  reasoningEffort: "effort",
  reasoning: "effort",
  thinking_effort: "effort",
  thinkingEffort: "effort",

  // cache
  cache_control: "cache",
  cacheControl: "cache",
  cachePoint: "cache",
  cache_point: "cache",

  // common OpenAI-compatible spellings
  minP: "min_p",
  repetitionPenalty: "repetition_penalty",
  responseFormat: "response_format",
  toolChoice: "tool_choice",
  parallelToolCalls: "parallel_tool_calls",
  topLogprobs: "top_logprobs",
  includeReasoning: "include_reasoning",

  // Vercel gateway params (camelCase → snake_case)
  zeroDataRetention: "zero_data_retention",
  disallowPromptTraining: "disallow_prompt_training",
  hipaaCompliant: "hipaa_compliant",
  quotaEntityId: "quota_entity_id",
  providerTimeouts: "provider_timeouts",
};

/** Validation spec for a single provider parameter. */
export interface ParamSpec {
  type: "number" | "string" | "boolean" | "json" | "string[]";
  min?: number;
  max?: number;
  values?: string[];
  default?: string | number | boolean;
  description?: string;
}

/**
 * All per-provider configuration in one place.
 * To add a new provider: add it to the Provider type, HOST_ALIASES,
 * detectProvider, and add an entry to PROVIDER_DEFINITIONS below.
 */
export interface ProviderDefinition {
  /** Canonical param name → provider-specific API param name. */
  params: Record<string, string>;
  /** Provider-specific param name → validation spec. */
  specs: Record<string, ParamSpec>;
  /** Cache value accepted by this provider (e.g. "ephemeral"). Absent = automatic or unsupported. */
  cacheValue?: string;
  /** Valid cache TTL strings. Absent = no TTL selection. */
  cacheTtls?: string[];
}

const REASONING_EFFORT_VALUES = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

// ── Shared building blocks ──────────────────────────────────────────────────

const OPENAI_COMPATIBLE_DEF = {
  params: {
    temperature: "temperature",
    max_tokens: "max_tokens",
    max_completion_tokens: "max_completion_tokens",
    top_p: "top_p",
    top_k: "top_k",
    frequency_penalty: "frequency_penalty",
    presence_penalty: "presence_penalty",
    stop: "stop",
    n: "n",
    seed: "seed",
    stream: "stream",
    effort: "reasoning_effort",
    min_p: "min_p",
    repetition_penalty: "repetition_penalty",
    response_format: "response_format",
    tools: "tools",
    tool_choice: "tool_choice",
    logit_bias: "logit_bias",
    logprobs: "logprobs",
    top_logprobs: "top_logprobs",
    parallel_tool_calls: "parallel_tool_calls",
    structured_outputs: "structured_outputs",
    verbosity: "verbosity",
    user: "user",
    include_reasoning: "include_reasoning",
  },
  specs: {
    temperature: {
      type: "number" as const,
      min: 0,
      max: 2,
      default: 0.7,
      description: "Controls randomness",
    },
    max_tokens: {
      type: "number" as const,
      min: 1,
      default: 4096,
      description: "Maximum output tokens",
    },
    max_completion_tokens: {
      type: "number" as const,
      min: 1,
      default: 4096,
      description: "Maximum completion tokens (reasoning models)",
    },
    top_p: {
      type: "number" as const,
      min: 0,
      max: 1,
      default: 1,
      description: "Nucleus sampling",
    },
    top_k: {
      type: "number" as const,
      min: 0,
      default: 40,
      description: "Top-K sampling",
    },
    frequency_penalty: {
      type: "number" as const,
      min: -2,
      max: 2,
      default: 0,
      description: "Penalize frequent tokens",
    },
    presence_penalty: {
      type: "number" as const,
      min: -2,
      max: 2,
      default: 0,
      description: "Penalize repeated topics",
    },
    stop: { type: "string" as const, description: "Stop sequences" },
    n: {
      type: "number" as const,
      min: 1,
      default: 1,
      description: "Completions count",
    },
    seed: { type: "number" as const, description: "Random seed" },
    stream: {
      type: "boolean" as const,
      default: false,
      description: "Stream response",
    },
    reasoning_effort: {
      type: "string" as const,
      values: REASONING_EFFORT_VALUES,
      default: "medium",
      description: "Reasoning effort",
    },
    min_p: {
      type: "number" as const,
      min: 0,
      max: 1,
      description: "Minimum token probability sampling",
    },
    repetition_penalty: {
      type: "number" as const,
      min: 0,
      description: "Token repetition penalty",
    },
    response_format: {
      type: "json" as const,
      description: "Structured response format",
    },
    tools: { type: "json" as const, description: "Tool definitions" },
    tool_choice: {
      type: "json" as const,
      description: "Tool selection mode or object",
    },
    logit_bias: { type: "json" as const, description: "Token logit bias map" },
    logprobs: {
      type: "boolean" as const,
      description: "Return token log probabilities",
    },
    top_logprobs: {
      type: "number" as const,
      min: 0,
      max: 20,
      description: "Number of most likely tokens to return",
    },
    parallel_tool_calls: {
      type: "boolean" as const,
      description: "Allow parallel tool calls",
    },
    structured_outputs: {
      type: "boolean" as const,
      description: "Require structured output support",
    },
    verbosity: {
      type: "string" as const,
      values: ["low", "medium", "high"],
      description: "Response verbosity",
    },
    user: { type: "string" as const, description: "End-user identifier" },
    include_reasoning: {
      type: "boolean" as const,
      description: "Include reasoning in the response",
    },
  },
};

const COMMON_IMAGE_SPECS: Record<string, ParamSpec> = {
  prompt: { type: "string", description: "Prompt" },
  negative_prompt: { type: "string", description: "Negative prompt" },
  seed: { type: "number", description: "Random seed" },
  image_size: { type: "string", description: "Output image size" },
  aspect_ratio: { type: "string", description: "Output aspect ratio" },
  output_format: { type: "string", description: "Output format" },
  width: { type: "number", min: 1, description: "Image width" },
  height: { type: "number", min: 1, description: "Image height" },
};

const COMMON_IMAGE_PARAMS: Record<string, string> = {
  prompt: "prompt",
  negative_prompt: "negative_prompt",
  seed: "seed",
  image_size: "image_size",
  aspect_ratio: "aspect_ratio",
  output_format: "output_format",
  width: "width",
  height: "height",
};

const FAL_DEF = {
  params: {
    ...COMMON_IMAGE_PARAMS,
    num_images: "num_images",
    enable_safety_checker: "enable_safety_checker",
    enable_safety_checks: "enable_safety_checks",
    enable_prompt_expansion: "enable_prompt_expansion",
    expand_prompt: "expand_prompt",
  },
  specs: {
    ...COMMON_IMAGE_SPECS,
    num_images: {
      type: "number" as const,
      min: 1,
      description: "Number of images to generate",
    },
    enable_safety_checker: {
      type: "boolean" as const,
      description: "Enable safety checker",
    },
    enable_safety_checks: {
      type: "boolean" as const,
      description: "Enable safety checker",
    },
    enable_prompt_expansion: {
      type: "boolean" as const,
      description: "Enable prompt expansion",
    },
    expand_prompt: {
      type: "boolean" as const,
      description: "Enable prompt expansion",
    },
    output_format: {
      type: "string" as const,
      values: ["jpeg", "jpg", "png", "webp", "gif"],
      description: "Output image format",
    },
  },
};

const REPLICATE_DEF = {
  params: {
    ...COMMON_IMAGE_PARAMS,
    input: "input",
    version: "version",
    num_outputs: "num_outputs",
    num_inference_steps: "num_inference_steps",
    guidance_scale: "guidance_scale",
    stream: "stream",
    webhook: "webhook",
    webhook_events_filter: "webhook_events_filter",
  },
  specs: {
    ...COMMON_IMAGE_SPECS,
    input: {
      type: "json" as const,
      description: "Model-specific input object",
    },
    version: { type: "string" as const, description: "Model version" },
    num_outputs: {
      type: "number" as const,
      min: 1,
      description: "Number of outputs to generate",
    },
    num_inference_steps: {
      type: "number" as const,
      min: 1,
      description: "Number of inference steps",
    },
    guidance_scale: {
      type: "number" as const,
      min: 0,
      description: "Guidance scale",
    },
    stream: {
      type: "boolean" as const,
      description: "Request streaming output",
    },
    webhook: { type: "string" as const, description: "Webhook URL" },
    webhook_events_filter: {
      type: "string" as const,
      description: "Webhook events filter",
    },
  },
};

const PRODIA_DEF = {
  params: {
    ...COMMON_IMAGE_PARAMS,
    model: "model",
    style_preset: "style_preset",
    steps: "steps",
    cfg_scale: "cfg_scale",
    upscale: "upscale",
    sampler: "sampler",
    type: "type",
    config: "config",
    price: "price",
  },
  specs: {
    ...COMMON_IMAGE_SPECS,
    model: { type: "string" as const, description: "Model name" },
    style_preset: { type: "string" as const, description: "Style preset" },
    steps: { type: "number" as const, min: 1, description: "Generation steps" },
    cfg_scale: { type: "number" as const, min: 0, description: "CFG scale" },
    upscale: { type: "boolean" as const, description: "Enable 2x upscale" },
    sampler: { type: "string" as const, description: "Sampler" },
    width: {
      type: "number" as const,
      min: 1,
      max: 1024,
      description: "Image width",
    },
    height: {
      type: "number" as const,
      min: 1,
      max: 1024,
      description: "Image height",
    },
    type: { type: "string" as const, description: "Prodia v2 job type" },
    config: { type: "string" as const, description: "Prodia v2 job config" },
    price: {
      type: "boolean" as const,
      description: "Include Prodia v2 job price",
    },
  },
};

const LUMA_DEF = {
  params: {
    prompt: "prompt",
    model: "model",
    aspect_ratio: "aspect_ratio",
    keyframes: "keyframes",
    loop: "loop",
    duration: "duration",
    type: "type",
    image_ref: "image_ref",
    video: "video",
    source: "source",
  },
  specs: {
    prompt: { type: "string" as const, description: "Prompt" },
    model: { type: "string" as const, description: "Model name" },
    aspect_ratio: {
      type: "string" as const,
      description: "Output aspect ratio",
    },
    keyframes: { type: "string" as const, description: "Generation keyframes" },
    loop: { type: "boolean" as const, description: "Generate a looping video" },
    duration: { type: "string" as const, description: "Generation duration" },
    type: { type: "string" as const, description: "Generation type" },
    image_ref: { type: "string" as const, description: "Image reference" },
    video: { type: "string" as const, description: "Video options" },
    source: {
      type: "string" as const,
      description: "Source generation or media",
    },
  },
};

const THINKING_COMPATIBLE_DEF = {
  ...OPENAI_COMPATIBLE_DEF,
  params: { ...OPENAI_COMPATIBLE_DEF.params, thinking: "thinking" },
  specs: {
    ...OPENAI_COMPATIBLE_DEF.specs,
    thinking: {
      type: "json" as const,
      description: "Thinking mode configuration",
    },
  },
};

const GOOGLE_COMPATIBLE_DEF = {
  params: {
    temperature: "temperature",
    max_tokens: "maxOutputTokens",
    top_p: "topP",
    top_k: "topK",
    frequency_penalty: "frequencyPenalty",
    presence_penalty: "presencePenalty",
    stop: "stopSequences",
    n: "candidateCount",
    stream: "stream",
    seed: "seed",
    responseMimeType: "responseMimeType",
    responseSchema: "responseSchema",
    effort: "thinkingLevel",
    thinking_level: "thinkingLevel",
    thinking_budget: "thinkingBudget",
    include_thoughts: "includeThoughts",
  },
  specs: {
    temperature: {
      type: "number" as const,
      min: 0,
      max: 2,
      default: 0.7,
      description: "Controls randomness",
    },
    maxOutputTokens: {
      type: "number" as const,
      min: 1,
      default: 4096,
      description: "Maximum output tokens",
    },
    topP: {
      type: "number" as const,
      min: 0,
      max: 1,
      default: 1,
      description: "Nucleus sampling",
    },
    topK: {
      type: "number" as const,
      min: 0,
      default: 40,
      description: "Top-K sampling",
    },
    frequencyPenalty: {
      type: "number" as const,
      min: -2,
      max: 2,
      default: 0,
      description: "Penalize frequent tokens",
    },
    presencePenalty: {
      type: "number" as const,
      min: -2,
      max: 2,
      default: 0,
      description: "Penalize repeated topics",
    },
    stopSequences: { type: "string" as const, description: "Stop sequences" },
    candidateCount: {
      type: "number" as const,
      min: 1,
      default: 1,
      description: "Candidate count",
    },
    stream: {
      type: "boolean" as const,
      default: false,
      description: "Stream response",
    },
    seed: { type: "number" as const, description: "Random seed" },
    responseMimeType: {
      type: "string" as const,
      description: "Response MIME type",
    },
    responseSchema: { type: "string" as const, description: "Response schema" },
    thinkingLevel: {
      type: "string" as const,
      values: ["minimal", "low", "medium", "high"],
      description: "Gemini thinking level",
    },
    thinkingBudget: {
      type: "number" as const,
      min: 0,
      description: "Gemini thinking token budget",
    },
    includeThoughts: {
      type: "boolean" as const,
      description: "Include Gemini thought summaries",
    },
  },
};

// OpenRouter routing params — only the canonical provider.X forms.
// Shorthand forms (e.g. "order") can be passed through as-is without explicit mapping.
const OPENROUTER_ROUTING_DEF = {
  params: {
    provider: "provider",
    "provider.order": "provider.order",
    "provider.only": "provider.only",
    "provider.ignore": "provider.ignore",
    "provider.allow_fallbacks": "provider.allow_fallbacks",
    "provider.require_parameters": "provider.require_parameters",
    "provider.data_collection": "provider.data_collection",
    "provider.zdr": "provider.zdr",
    "provider.enforce_distillable_text": "provider.enforce_distillable_text",
    "provider.quantizations": "provider.quantizations",
    "provider.sort": "provider.sort",
    "provider.preferred_min_throughput": "provider.preferred_min_throughput",
    "provider.preferred_max_latency": "provider.preferred_max_latency",
    "provider.max_price": "provider.max_price",
    transforms: "transforms",
    plugins: "plugins",
  },
  specs: {
    provider: {
      type: "string" as const,
      description: "Provider routing preferences",
    },
    "provider.order": {
      type: "string" as const,
      description: "Provider order",
    },
    "provider.only": {
      type: "string" as const,
      description: "Provider allowlist",
    },
    "provider.ignore": {
      type: "string" as const,
      description: "Provider blocklist",
    },
    "provider.allow_fallbacks": {
      type: "boolean" as const,
      default: true,
      description: "Allow fallback providers",
    },
    "provider.require_parameters": {
      type: "boolean" as const,
      default: false,
      description: "Only route to providers that support all request params",
    },
    "provider.data_collection": {
      type: "string" as const,
      values: ["allow", "deny"],
      default: "allow",
      description: "Provider data collection policy",
    },
    "provider.zdr": {
      type: "boolean" as const,
      description: "Require zero data retention providers",
    },
    "provider.enforce_distillable_text": {
      type: "boolean" as const,
      description: "Require providers that allow text distillation",
    },
    "provider.quantizations": {
      type: "string" as const,
      description: "Allowed provider quantization levels",
    },
    "provider.sort": {
      type: "string" as const,
      values: ["price", "throughput", "latency", "cost", "ttft", "tps"],
      description: "Provider sort strategy",
    },
    "provider.preferred_min_throughput": {
      type: "number" as const,
      min: 0,
      description: "Preferred minimum provider throughput",
    },
    "provider.preferred_max_latency": {
      type: "number" as const,
      min: 0,
      description: "Preferred maximum provider latency",
    },
    "provider.max_price": {
      type: "string" as const,
      description: "Maximum provider price filter",
    },
    transforms: {
      type: "string" as const,
      description: "Legacy OpenRouter message transforms",
    },
    plugins: {
      type: "string" as const,
      description: "OpenRouter request plugins",
    },
  },
};

// ── Provider definitions ────────────────────────────────────────────────────

export const PROVIDER_DEFINITIONS: Record<Provider, ProviderDefinition> = {
  openai: {
    params: {
      temperature: "temperature",
      max_tokens: "max_tokens",
      max_completion_tokens: "max_completion_tokens",
      top_p: "top_p",
      frequency_penalty: "frequency_penalty",
      presence_penalty: "presence_penalty",
      stop: "stop",
      n: "n",
      seed: "seed",
      stream: "stream",
      effort: "reasoning_effort",
      response_format: "response_format",
      tools: "tools",
      tool_choice: "tool_choice",
      logit_bias: "logit_bias",
      logprobs: "logprobs",
      top_logprobs: "top_logprobs",
      parallel_tool_calls: "parallel_tool_calls",
      user: "user",
      service_tier: "service_tier",
      verbosity: "verbosity",
    },
    specs: {
      temperature: {
        type: "number",
        min: 0,
        max: 2,
        default: 0.7,
        description: "Controls randomness",
      },
      max_tokens: {
        type: "number",
        min: 1,
        default: 4096,
        description: "Maximum output tokens",
      },
      max_completion_tokens: {
        type: "number",
        min: 1,
        default: 4096,
        description: "Maximum completion tokens (reasoning models)",
      },
      top_p: {
        type: "number",
        min: 0,
        max: 1,
        default: 1,
        description: "Nucleus sampling",
      },
      frequency_penalty: {
        type: "number",
        min: -2,
        max: 2,
        default: 0,
        description: "Penalize frequent tokens",
      },
      presence_penalty: {
        type: "number",
        min: -2,
        max: 2,
        default: 0,
        description: "Penalize repeated topics",
      },
      stop: { type: "string", description: "Stop sequences" },
      n: {
        type: "number",
        min: 1,
        default: 1,
        description: "Completions count",
      },
      seed: { type: "number", description: "Random seed" },
      stream: {
        type: "boolean",
        default: false,
        description: "Stream response",
      },
      reasoning_effort: {
        type: "string",
        values: REASONING_EFFORT_VALUES,
        default: "medium",
        description: "Reasoning effort",
      },
      response_format: {
        type: "json",
        description: "Structured response format",
      },
      tools: { type: "json", description: "Tool definitions" },
      tool_choice: {
        type: "json",
        description: "Tool selection mode or object",
      },
      logit_bias: { type: "json", description: "Token logit bias map" },
      logprobs: {
        type: "boolean",
        description: "Return token log probabilities",
      },
      top_logprobs: {
        type: "number",
        min: 0,
        max: 20,
        description: "Number of most likely tokens to return",
      },
      parallel_tool_calls: {
        type: "boolean",
        description: "Allow parallel tool calls",
      },
      user: { type: "string", description: "End-user identifier" },
      service_tier: {
        type: "string",
        values: ["auto", "default", "flex", "priority", "ultrafast"],
        description: "Processing service tier",
      },
      verbosity: {
        type: "string",
        values: ["low", "medium", "high"],
        description: "Response verbosity",
      },
    },
  },
  azure: OPENAI_COMPATIBLE_DEF,
  anthropic: {
    params: {
      thinking: "thinking",
      tool_choice: "tool_choice",
      temperature: "temperature",
      max_tokens: "max_tokens",
      top_p: "top_p",
      top_k: "top_k",
      stop: "stop_sequences",
      stream: "stream",
      effort: "effort",
      cache: "cache_control",
      cache_ttl: "cache_ttl",
    },
    specs: {
      thinking: { type: "string", description: "JSON thinking configuration" },
      tool_choice: { type: "string", description: "JSON tool selection" },
      temperature: {
        type: "number",
        min: 0,
        max: 1,
        default: 0.7,
        description: "Controls randomness",
      },
      max_tokens: {
        type: "number",
        min: 0,
        default: 4096,
        description: "Maximum output tokens",
      },
      top_p: {
        type: "number",
        min: 0,
        max: 1,
        default: 1,
        description: "Nucleus sampling",
      },
      top_k: {
        type: "number",
        min: 0,
        default: 40,
        description: "Top-K sampling",
      },
      stop_sequences: { type: "string", description: "Stop sequences" },
      stream: {
        type: "boolean",
        default: false,
        description: "Stream response",
      },
      effort: {
        type: "string",
        values: REASONING_EFFORT_VALUES,
        default: "low",
        description: "Thinking effort",
      },
      cache_control: {
        type: "string",
        values: ["ephemeral"],
        default: "ephemeral",
        description: "Cache control",
      },
      cache_ttl: {
        type: "string",
        values: ["5m", "1h"],
        default: "5m",
        description: "Cache TTL",
      },
    },
    cacheValue: "ephemeral",
    cacheTtls: ["5m", "1h"],
  },
  google: GOOGLE_COMPATIBLE_DEF,
  "google-vertex": GOOGLE_COMPATIBLE_DEF,
  mistral: {
    params: {
      temperature: "temperature",
      max_tokens: "max_tokens",
      top_p: "top_p",
      frequency_penalty: "frequency_penalty",
      presence_penalty: "presence_penalty",
      stop: "stop",
      n: "n",
      seed: "random_seed",
      stream: "stream",
      safe_prompt: "safe_prompt",
      min_tokens: "min_tokens",
    },
    specs: {
      temperature: {
        type: "number",
        min: 0,
        max: 1,
        default: 0.7,
        description: "Controls randomness",
      },
      max_tokens: {
        type: "number",
        min: 1,
        default: 4096,
        description: "Maximum output tokens",
      },
      top_p: {
        type: "number",
        min: 0,
        max: 1,
        default: 1,
        description: "Nucleus sampling",
      },
      frequency_penalty: {
        type: "number",
        min: -2,
        max: 2,
        default: 0,
        description: "Penalize frequent tokens",
      },
      presence_penalty: {
        type: "number",
        min: -2,
        max: 2,
        default: 0,
        description: "Penalize repeated topics",
      },
      stop: { type: "string", description: "Stop sequences" },
      n: {
        type: "number",
        min: 1,
        default: 1,
        description: "Completions count",
      },
      random_seed: { type: "number", description: "Random seed" },
      stream: {
        type: "boolean",
        default: false,
        description: "Stream response",
      },
      safe_prompt: {
        type: "boolean",
        default: false,
        description: "Enable safe prompt",
      },
      min_tokens: {
        type: "number",
        min: 0,
        default: 0,
        description: "Minimum tokens",
      },
    },
  },
  cohere: {
    params: {
      temperature: "temperature",
      max_tokens: "max_tokens",
      top_p: "p",
      top_k: "k",
      frequency_penalty: "frequency_penalty",
      presence_penalty: "presence_penalty",
      stop: "stop_sequences",
      stream: "stream",
      seed: "seed",
    },
    specs: {
      temperature: {
        type: "number",
        min: 0,
        max: 1,
        default: 0.7,
        description: "Controls randomness",
      },
      max_tokens: {
        type: "number",
        min: 1,
        default: 4096,
        description: "Maximum output tokens",
      },
      p: {
        type: "number",
        min: 0.01,
        max: 0.99,
        default: 0.75,
        description: "Nucleus sampling (p)",
      },
      k: {
        type: "number",
        min: 0,
        max: 500,
        default: 0,
        description: "Top-K sampling (k)",
      },
      frequency_penalty: {
        type: "number",
        min: 0,
        max: 1,
        default: 0,
        description: "Penalize frequent tokens",
      },
      presence_penalty: {
        type: "number",
        min: 0,
        max: 1,
        default: 0,
        description: "Penalize repeated topics",
      },
      stop_sequences: { type: "string", description: "Stop sequences" },
      stream: {
        type: "boolean",
        default: false,
        description: "Stream response",
      },
      seed: { type: "number", description: "Random seed" },
    },
  },
  bedrock: {
    params: {
      temperature: "temperature",
      max_tokens: "maxTokens",
      top_p: "topP",
      top_k: "topK", // Claude models via additionalModelRequestFields
      stop: "stopSequences",
      stream: "stream",
      cache: "cache_control",
      cache_ttl: "cache_ttl",
    },
    specs: {
      temperature: {
        type: "number",
        min: 0,
        max: 1,
        default: 0.7,
        description: "Controls randomness",
      },
      maxTokens: {
        type: "number",
        min: 1,
        default: 4096,
        description: "Maximum output tokens",
      },
      topP: {
        type: "number",
        min: 0,
        max: 1,
        default: 1,
        description: "Nucleus sampling",
      },
      topK: {
        type: "number",
        min: 0,
        default: 40,
        description: "Top-K sampling",
      },
      stopSequences: { type: "string", description: "Stop sequences" },
      stream: {
        type: "boolean",
        default: false,
        description: "Stream response",
      },
      cache_control: {
        type: "string",
        values: ["ephemeral"],
        default: "ephemeral",
        description: "Cache control",
      },
      cache_ttl: {
        type: "string",
        values: ["5m", "1h"],
        default: "5m",
        description: "Cache TTL",
      },
    },
    cacheValue: "ephemeral",
    cacheTtls: ["5m", "1h"],
  },
  openrouter: {
    // OpenAI-compatible API with extra routing params; loose ranges as it proxies many providers
    params: {
      ...OPENAI_COMPATIBLE_DEF.params,
      ...OPENROUTER_ROUTING_DEF.params,
    },
    specs: {
      ...OPENAI_COMPATIBLE_DEF.specs,
      ...OPENROUTER_ROUTING_DEF.specs,
    },
  },
  vercel: {
    // OpenAI-compatible gateway; loose ranges as it proxies many providers
    params: {
      ...OPENAI_COMPATIBLE_DEF.params,
      order: "order",
      only: "only",
      models: "models",
      tags: "tags",
      sort: "sort",
      caching: "caching",
      user: "user",
      byok: "byok",
      zero_data_retention: "zero_data_retention",
      disallow_prompt_training: "disallow_prompt_training",
      hipaa_compliant: "hipaa_compliant",
      quota_entity_id: "quota_entity_id",
      provider_timeouts: "provider_timeouts",
    },
    specs: {
      ...OPENAI_COMPATIBLE_DEF.specs,
      order: { type: "string[]", description: "Gateway provider order" },
      only: { type: "string[]", description: "Gateway provider allowlist" },
      models: { type: "string[]", description: "Gateway fallback models" },
      tags: { type: "string[]", description: "Gateway usage tags" },
      sort: {
        type: "string",
        values: ["cost", "ttft", "tps"],
        description: "Gateway provider sort strategy",
      },
      caching: {
        type: "string",
        values: ["auto"],
        description: "Gateway automatic caching strategy",
      },
      user: { type: "string", description: "Gateway usage user identifier" },
      byok: { type: "json", description: "Gateway BYOK credentials" },
      zero_data_retention: {
        type: "boolean",
        description: "Gateway zero data retention routing",
      },
      disallow_prompt_training: {
        type: "boolean",
        description: "Gateway prompt training opt-out routing",
      },
      hipaa_compliant: {
        type: "boolean",
        description: "Gateway HIPAA-compliant routing",
      },
      quota_entity_id: {
        type: "string",
        description: "Gateway quota entity identifier",
      },
      provider_timeouts: {
        type: "json",
        description: "Gateway provider timeouts",
      },
    },
  },
  xai: OPENAI_COMPATIBLE_DEF,
  meta: OPENAI_COMPATIBLE_DEF,
  groq: OPENAI_COMPATIBLE_DEF,
  fal: FAL_DEF,
  deepinfra: OPENAI_COMPATIBLE_DEF,
  "black-forest-labs": { params: {}, specs: {} },
  together: OPENAI_COMPATIBLE_DEF,
  fireworks: OPENAI_COMPATIBLE_DEF,
  deepseek: THINKING_COMPATIBLE_DEF,
  zai: THINKING_COMPATIBLE_DEF,
  moonshotai: THINKING_COMPATIBLE_DEF,
  perplexity: OPENAI_COMPATIBLE_DEF,
  alibaba: OPENAI_COMPATIBLE_DEF,
  cerebras: OPENAI_COMPATIBLE_DEF,
  replicate: REPLICATE_DEF,
  prodia: PRODIA_DEF,
  luma: LUMA_DEF,
  bytedance: { params: {}, specs: {} },
  kling: { params: {}, specs: {} },
  elevenlabs: { params: {}, specs: {} },
  assemblyai: { params: {}, specs: {} },
  deepgram: { params: {}, specs: {} },
  gladia: { params: {}, specs: {} },
  lmnt: { params: {}, specs: {} },
  hume: { params: {}, specs: {} },
  revai: { params: {}, specs: {} },
  baseten: OPENAI_COMPATIBLE_DEF,
  huggingface: OPENAI_COMPATIBLE_DEF,
};

// ── Derived exports ─────────────────────────────────────────────────────────

/** Canonical param name → provider-specific API param name. */
export const PROVIDER_PARAMS: Record<
  Provider,
  Record<string, string>
> = Object.fromEntries(
  (
    Object.entries(PROVIDER_DEFINITIONS) as [Provider, ProviderDefinition][]
  ).map(([provider, def]) => [provider, def.params]),
) as Record<Provider, Record<string, string>>;

/** Validation specs per provider, keyed by provider-specific param name. */
export const PARAM_SPECS: Record<
  Provider,
  Record<string, ParamSpec>
> = Object.fromEntries(
  (
    Object.entries(PROVIDER_DEFINITIONS) as [Provider, ProviderDefinition][]
  ).map(([provider, def]) => [provider, def.specs]),
) as Record<Provider, Record<string, ParamSpec>>;

/**
 * Cache value normalization per provider.
 * Omitted providers auto-cache (OpenAI) or don't support the param at all.
 */
export const CACHE_VALUES: Partial<Record<Provider, string>> =
  Object.fromEntries(
    (
      Object.entries(PROVIDER_DEFINITIONS) as [Provider, ProviderDefinition][]
    ).flatMap(([provider, def]) =>
      def.cacheValue === undefined ? [] : [[provider, def.cacheValue]],
    ),
  );

/** Valid cache TTL values per provider. Omitted providers don't support TTL selection. */
export const CACHE_TTLS: Partial<Record<Provider, string[]>> =
  Object.fromEntries(
    (
      Object.entries(PROVIDER_DEFINITIONS) as [Provider, ProviderDefinition][]
    ).flatMap(([provider, def]) =>
      def.cacheTtls === undefined ? [] : [[provider, def.cacheTtls]],
    ),
  );

/**
 * Extra reasoning model family prefixes beyond what the patterns below detect.
 * The o-series (o1, o3, …) and gpt-[5-9] series are auto-detected by pattern.
 * Add a new entry here only for future series with different naming conventions.
 */
export const REASONING_MODEL_PREFIXES: readonly string[] = [];

/** OpenAI reasoning models don't support standard sampling params. */
export function isReasoningModel(model: string): boolean {
  const name = modelLeafName(model);
  const oPrefix = name.match(/^o\d+/)?.[0];
  const gptPrefix = name.match(/^gpt-[5-9]/)?.[0];
  return (
    (oPrefix !== undefined && modelMatchesFamily(name, oPrefix)) ||
    (gptPrefix !== undefined && modelMatchesFamily(name, gptPrefix)) ||
    REASONING_MODEL_PREFIXES.some((prefix) => modelMatchesFamily(name, prefix))
  );
}

/** Providers that can route to OpenAI models (and need reasoning-model checks). */
export function canHostOpenAIModels(provider: Provider): boolean {
  return (
    provider === "openai" ||
    provider === "azure" ||
    provider === "openrouter" ||
    provider === "vercel"
  );
}

/** Whether this provider is a gateway/router that proxies to other providers. */
export function isGatewayProvider(provider: Provider): boolean {
  return provider === "openrouter" || provider === "vercel";
}

/**
 * Extract the underlying provider from a gateway model string.
 * e.g. "anthropic/claude-sonnet-4-5" → "anthropic"
 * Returns undefined for unknown prefixes (qwen, etc.) or models without "/".
 */
export function detectGatewaySubProvider(model: string): Provider | undefined {
  const slash = model.indexOf("/");
  if (slash < 1) return undefined;
  const prefix = normalizeModelForMatching(model.slice(0, slash));
  const direct: Partial<Record<string, Provider>> = {
    openai: "openai",
    anthropic: "anthropic",
    google: "google",
    vertex: "google",
    "google-vertex": "google",
    mistral: "mistral",
    mistralai: "mistral",
    deepseek: "deepseek",
    zai: "zai",
    "z-ai": "zai",
    moonshotai: "moonshotai",
    cohere: "cohere",
    xai: "xai",
    "x-ai": "xai",
  };
  return direct[prefix];
}

export const REASONING_MODEL_UNSUPPORTED = new Set([
  "temperature",
  "top_p",
  "top_k",
  "frequency_penalty",
  "presence_penalty",
  "n",
]);

/**
 * Bedrock model IDs are prefixed with the vendor name.
 * e.g. "anthropic.claude-sonnet-4-5-20250929-v1:0"
 */
export type BedrockModelFamily =
  "anthropic" | "meta" | "amazon" | "mistral" | "cohere" | "ai21";

export function detectBedrockModelFamily(
  model: string,
): BedrockModelFamily | undefined {
  const families: BedrockModelFamily[] = [
    "anthropic",
    "meta",
    "amazon",
    "mistral",
    "cohere",
    "ai21",
  ];
  const parts = modelLeafName(model).split(".");
  return families.find((family) => parts.includes(family));
}

/** Whether a Bedrock model supports prompt caching (Claude and Nova only). */
export function bedrockSupportsCaching(model: string): boolean {
  const family = detectBedrockModelFamily(model);
  if (family === "anthropic") return true;
  if (family === "amazon") {
    const parts = modelLeafName(model).split(".");
    const amazonIndex = parts.indexOf("amazon");
    const modelName = amazonIndex >= 0 ? parts[amazonIndex + 1] : undefined;
    return modelName ? modelMatchesFamily(modelName, "nova") : false;
  }
  return false;
}

/** Jev returns typed decisions, not generated text. Preserve its gateway namespace. */
export function isJevModel(model: string): boolean {
  return /^~?typesafe\/jev-(?:\d+(?:\.\d+)*(?:-\d{8})?|latest)$/.test(model);
}

/** OpenRouter's Jev API is separate from /api/v1/chat/completions. */
export const OPENROUTER_DECISIONS_URL =
  "https://openrouter.ai/api/alpha/decisions";
