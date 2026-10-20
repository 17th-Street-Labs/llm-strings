/** Lightweight provider/host shorthands used by the base parser. */
export const HOST_ALIASES = {
  openai: "api.openai.com",
  azure: "models.inference.ai.azure.com",
  anthropic: "api.anthropic.com",
  google: "generativelanguage.googleapis.com",
  "google-vertex": "aiplatform.googleapis.com",
  aistudio: "generativelanguage.googleapis.com",
  vertex: "aiplatform.googleapis.com",
  mistral: "api.mistral.ai",
  cohere: "api.cohere.com",
  bedrock: "bedrock-runtime.us-east-1.amazonaws.com",
  openrouter: "openrouter.ai",
  vercel: "gateway.ai.vercel.app",
  xai: "api.x.ai",
  grok: "api.x.ai",
  meta: "api.meta.ai",
  groq: "api.groq.com",
  fal: "fal.run",
  deepinfra: "api.deepinfra.com",
  "black-forest-labs": "api.bfl.ai",
  bfl: "api.bfl.ai",
  together: "api.together.xyz",
  togetherai: "api.together.xyz",
  fireworks: "api.fireworks.ai",
  fireworksai: "api.fireworks.ai",
  deepseek: "api.deepseek.com",
  zai: "api.z.ai",
  moonshotai: "api.moonshot.ai",
  moonshot: "api.moonshot.ai",
  perplexity: "api.perplexity.ai",
  alibaba: "dashscope-intl.aliyuncs.com",
  alibabacloud: "dashscope-intl.aliyuncs.com",
  dashscope: "dashscope-intl.aliyuncs.com",
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
  xiaomi: "api.xiaomimimo.com",
  minimax: "api.minimax.io",
  atlascloud: "api.atlascloud.ai",
  novita: "api.novita.ai",
  novitaai: "api.novita.ai",
  parasail: "api.parasail.io",
  venice: "api.venice.ai",
} as const;

export type HostAlias = keyof typeof HOST_ALIASES;
type Env = Record<string, string | undefined>;

declare const process: { env?: Env } | undefined;

export interface HostResolution {
  host: string;
  alias?: HostAlias;
}

function readProcessEnv(): Env {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

function normalizeHostValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try {
    if (trimmed.includes("://")) return new URL(trimmed).host;
  } catch {
    // Treat invalid URLs as host-like values.
  }
  return trimmed.replace(/^\/\//, "").split("/")[0] ?? trimmed;
}

export function resolveHostAlias(
  host: string,
  env: Env = readProcessEnv(),
): HostResolution {
  const key = host.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(HOST_ALIASES, key)) return { host };
  const alias = key as HostAlias;
  const upper = alias.toUpperCase();
  const override =
    env[`LLM_STRINGS_${upper}_HOST`] ?? env[`LLM_STRINGS_HOST_${upper}`];
  return {
    host: normalizeHostValue(override?.trim() ? override : HOST_ALIASES[alias]),
    alias,
  };
}
