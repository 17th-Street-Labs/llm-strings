import { PARAM_SPECS, PROVIDER_PARAMS } from "./provider-core.js";
import type { ParamSpec, Provider } from "./provider-core.js";

/* ------------------------------------------------------------------ */
/*  UI-consumable metadata for 3rd-party integrations                 */
/* ------------------------------------------------------------------ */

export interface ProviderMeta {
  /** Provider identifier — matches the Provider union type. */
  id: Provider;
  /** Human-readable display name. */
  name: string;
  /** Default / canonical API hostname. */
  host: string;
  /** Brand color as a CSS hex value. */
  color: string;
}

export const PROVIDER_META: ProviderMeta[] = [
  { id: "openai", name: "OpenAI", host: "api.openai.com", color: "#10a37f" },
  {
    id: "azure",
    name: "Azure OpenAI",
    host: "models.inference.ai.azure.com",
    color: "#0078d4",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    host: "api.anthropic.com",
    color: "#e8956a",
  },
  {
    id: "google",
    name: "Google",
    host: "generativelanguage.googleapis.com",
    color: "#4285f4",
  },
  {
    id: "google-vertex",
    name: "Google Vertex AI",
    host: "aiplatform.googleapis.com",
    color: "#34a853",
  },
  { id: "mistral", name: "Mistral", host: "api.mistral.ai", color: "#ff7000" },
  { id: "cohere", name: "Cohere", host: "api.cohere.com", color: "#39594d" },
  {
    id: "bedrock",
    name: "Bedrock",
    host: "bedrock-runtime.us-east-1.amazonaws.com",
    color: "#ff9900",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    host: "openrouter.ai",
    color: "#818cf8",
  },
  {
    id: "vercel",
    name: "Vercel",
    host: "gateway.ai.vercel.app",
    color: "#ededed",
  },
  { id: "xai", name: "xAI", host: "api.x.ai", color: "#111111" },
  { id: "meta", name: "Meta", host: "api.meta.ai", color: "#0866ff" },
  { id: "groq", name: "Groq", host: "api.groq.com", color: "#f55036" },
  { id: "fal", name: "Fal", host: "fal.run", color: "#111111" },
  {
    id: "deepinfra",
    name: "DeepInfra",
    host: "api.deepinfra.com",
    color: "#2563eb",
  },
  {
    id: "black-forest-labs",
    name: "Black Forest Labs",
    host: "api.bfl.ai",
    color: "#111111",
  },
  {
    id: "together",
    name: "Together.ai",
    host: "api.together.xyz",
    color: "#ff4f00",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    host: "api.fireworks.ai",
    color: "#7c3aed",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    host: "api.deepseek.com",
    color: "#4d6bfe",
  },
  { id: "zai", name: "Z.ai", host: "api.z.ai", color: "#3858f6" },
  {
    id: "moonshotai",
    name: "Moonshot AI",
    host: "api.moonshot.ai",
    color: "#6b46ff",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    host: "api.perplexity.ai",
    color: "#20b8cd",
  },
  {
    id: "alibaba",
    name: "Alibaba",
    host: "dashscope-intl.aliyuncs.com",
    color: "#ff6a00",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    host: "api.cerebras.ai",
    color: "#d71920",
  },
  {
    id: "replicate",
    name: "Replicate",
    host: "api.replicate.com",
    color: "#111111",
  },
  { id: "prodia", name: "Prodia", host: "api.prodia.com", color: "#6d28d9" },
  { id: "luma", name: "Luma", host: "api.lumalabs.ai", color: "#111111" },
  {
    id: "bytedance",
    name: "ByteDance",
    host: "ark.cn-beijing.volces.com",
    color: "#2563eb",
  },
  { id: "kling", name: "Kling AI", host: "api.klingai.com", color: "#111111" },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    host: "api.elevenlabs.io",
    color: "#111111",
  },
  {
    id: "assemblyai",
    name: "AssemblyAI",
    host: "api.assemblyai.com",
    color: "#4f46e5",
  },
  {
    id: "deepgram",
    name: "Deepgram",
    host: "api.deepgram.com",
    color: "#13ef93",
  },
  { id: "gladia", name: "Gladia", host: "api.gladia.io", color: "#7c3aed" },
  { id: "lmnt", name: "LMNT", host: "api.lmnt.com", color: "#14b8a6" },
  { id: "hume", name: "Hume", host: "api.hume.ai", color: "#8b5cf6" },
  { id: "revai", name: "Rev.ai", host: "api.rev.ai", color: "#ef4444" },
  {
    id: "baseten",
    name: "Baseten",
    host: "api.baseten.co",
    color: "#111111",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    host: "api-inference.huggingface.co",
    color: "#ffcc4d",
  },
];

/**
 * Canonical parameter spec — keyed by canonical (snake_case) param names
 * with defaults and descriptions for UI consumption.
 */
export interface CanonicalParamSpec {
  type: "number" | "string" | "boolean" | "json" | "string[]" | "enum";
  min?: number;
  max?: number;
  values?: string[];
  default?: string | number | boolean;
  description?: string;
}

function toCanonicalParamSpec(spec: ParamSpec): CanonicalParamSpec {
  return {
    ...spec,
    type: spec.values ? "enum" : spec.type,
    default:
      spec.default ?? (spec.type === "string" && !spec.values ? "" : undefined),
  };
}

function deriveCanonicalParamSpecs(): Record<
  Provider,
  Record<string, CanonicalParamSpec>
> {
  const specs = {} as Record<Provider, Record<string, CanonicalParamSpec>>;

  for (const provider of Object.keys(PROVIDER_PARAMS) as Provider[]) {
    specs[provider] = {};
    for (const [canonicalName, providerName] of Object.entries(
      PROVIDER_PARAMS[provider],
    )) {
      const spec = PARAM_SPECS[provider][providerName];
      if (spec) {
        specs[provider][canonicalName] = toCanonicalParamSpec(spec);
      }
    }
  }

  return specs;
}

export const CANONICAL_PARAM_SPECS = deriveCanonicalParamSpecs();
