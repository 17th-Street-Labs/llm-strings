import { describe, expect, it } from "vitest";
import {
  PROVIDER_META,
  CANONICAL_PARAM_SPECS,
  PARAM_SPECS,
  PROVIDER_PARAMS,
  HOST_ALIASES,
  detectProvider,
  detectBedrockModelFamily,
  detectGatewaySubProvider,
  bedrockSupportsCaching,
  isReasoningModel,
  isGatewayProvider,
  modelMatchesFamily,
  resolveHostAlias,
} from "./providers.js";
import type { Provider } from "./providers.js";

const ALL_PROVIDERS: Provider[] = [
  "openai",
  "azure",
  "anthropic",
  "google",
  "google-vertex",
  "mistral",
  "cohere",
  "bedrock",
  "openrouter",
  "vercel",
  "xai",
  "meta",
  "groq",
  "fal",
  "deepinfra",
  "black-forest-labs",
  "together",
  "fireworks",
  "deepseek",
  "zai",
  "moonshotai",
  "perplexity",
  "alibaba",
  "cerebras",
  "replicate",
  "prodia",
  "luma",
  "bytedance",
  "kling",
  "elevenlabs",
  "assemblyai",
  "deepgram",
  "gladia",
  "lmnt",
  "hume",
  "revai",
  "baseten",
  "huggingface",
];

describe("PROVIDER_META", () => {
  it("has an entry for every provider", () => {
    const ids = PROVIDER_META.map((m) => m.id);
    for (const p of ALL_PROVIDERS) {
      expect(ids).toContain(p);
    }
  });

  it("each entry has required fields", () => {
    for (const meta of PROVIDER_META) {
      expect(meta.id).toBeTruthy();
      expect(meta.name).toBeTruthy();
      expect(meta.host).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("hosts are detectable by detectProvider", () => {
    for (const meta of PROVIDER_META) {
      expect(detectProvider(meta.host)).toBe(meta.id);
    }
  });

  it("detects current Bedrock runtime and mantle endpoints", () => {
    expect(detectProvider("bedrock-runtime.us-east-1.amazonaws.com")).toBe(
      "bedrock",
    );
    expect(detectProvider("bedrock-mantle.us-east-1.api.aws")).toBe("bedrock");
  });

  it("does not detect providers from lookalike host substrings", () => {
    expect(detectProvider("my-anthropic-clone.com")).toBeUndefined();
    expect(detectProvider("openrouter.example.com")).toBeUndefined();
    expect(detectProvider("luma-preview.example.com")).toBeUndefined();
  });
});

describe("host aliases", () => {
  it("has an alias for every provider", () => {
    for (const p of ALL_PROVIDERS) {
      expect(HOST_ALIASES[p]).toBeTruthy();
    }
  });

  it("resolves aliases to canonical hosts", () => {
    expect(resolveHostAlias("openai")).toEqual({
      host: "api.openai.com",
      alias: "openai",
    });
    expect(resolveHostAlias("anthropic")).toEqual({
      host: "api.anthropic.com",
      alias: "anthropic",
    });
  });

  it("resolves second-tier provider aliases", () => {
    expect(resolveHostAlias("fireworks")).toEqual({
      host: "api.fireworks.ai",
      alias: "fireworks",
    });
    expect(resolveHostAlias("venice")).toEqual({
      host: "api.venice.ai",
      alias: "venice",
    });
    expect(resolveHostAlias("deepinfra")).toEqual({
      host: "api.deepinfra.com",
      alias: "deepinfra",
    });
    expect(resolveHostAlias("grok")).toEqual({
      host: "api.x.ai",
      alias: "grok",
    });
    expect(resolveHostAlias("meta")).toEqual({
      host: "api.meta.ai",
      alias: "meta",
    });
    expect(resolveHostAlias("wandb")).toEqual({
      host: "api.inference.wandb.ai",
      alias: "wandb",
    });
  });

  it("resolves Google Vertex and AI Studio aliases", () => {
    expect(resolveHostAlias("vertex")).toEqual({
      host: "aiplatform.googleapis.com",
      alias: "vertex",
    });
    expect(resolveHostAlias("aistudio")).toEqual({
      host: "generativelanguage.googleapis.com",
      alias: "aistudio",
    });
  });

  it("resolves aliases with explicit env overrides", () => {
    expect(
      resolveHostAlias("bedrock", {
        LLM_STRINGS_BEDROCK_HOST:
          "https://bedrock-runtime.us-west-2.amazonaws.com/model",
      }),
    ).toEqual({
      host: "bedrock-runtime.us-west-2.amazonaws.com",
      alias: "bedrock",
    });
  });

  it("passes through non-alias hosts", () => {
    expect(resolveHostAlias("custom-api.example.com")).toEqual({
      host: "custom-api.example.com",
    });
  });
});

describe("CANONICAL_PARAM_SPECS", () => {
  it("has entries for every provider", () => {
    for (const p of ALL_PROVIDERS) {
      expect(CANONICAL_PARAM_SPECS[p]).toBeDefined();
    }
  });

  it("canonical keys match PROVIDER_PARAMS keys", () => {
    for (const p of ALL_PROVIDERS) {
      const canonicalKeys = Object.keys(CANONICAL_PARAM_SPECS[p]);
      const providerCanonicalKeys = Object.keys(PROVIDER_PARAMS[p]);
      for (const key of canonicalKeys) {
        expect(
          providerCanonicalKeys,
          `${p}: canonical key "${key}" missing from PROVIDER_PARAMS`,
        ).toContain(key);
      }
    }
  });

  it("each spec has type and description", () => {
    for (const p of ALL_PROVIDERS) {
      for (const [name, spec] of Object.entries(CANONICAL_PARAM_SPECS[p])) {
        expect(spec.type, `${p}.${name} missing type`).toBeTruthy();
        expect(
          spec.description,
          `${p}.${name} missing description`,
        ).toBeTruthy();
      }
    }
  });

  it("enum specs have values array", () => {
    for (const p of ALL_PROVIDERS) {
      for (const [name, spec] of Object.entries(CANONICAL_PARAM_SPECS[p])) {
        if (spec.type === "enum") {
          expect(
            spec.values,
            `${p}.${name} is enum but has no values`,
          ).toBeDefined();
          expect(spec.values?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("number ranges match PARAM_SPECS ranges", () => {
    for (const p of ALL_PROVIDERS) {
      for (const [canonicalName, cSpec] of Object.entries(
        CANONICAL_PARAM_SPECS[p],
      )) {
        if (cSpec.type !== "number") continue;
        const providerName = PROVIDER_PARAMS[p][canonicalName];
        if (!providerName) continue;
        const pSpec = PARAM_SPECS[p][providerName];
        if (!pSpec) continue;
        if (cSpec.min !== undefined) {
          expect(cSpec.min, `${p}.${canonicalName} min mismatch`).toBe(
            pSpec.min,
          );
        }
        if (cSpec.max !== undefined) {
          expect(cSpec.max, `${p}.${canonicalName} max mismatch`).toBe(
            pSpec.max,
          );
        }
      }
    }
  });
});

describe("PARAM_SPECS defaults and descriptions", () => {
  it("every spec has a description", () => {
    for (const p of ALL_PROVIDERS) {
      for (const [name, spec] of Object.entries(PARAM_SPECS[p])) {
        expect(
          spec.description,
          `${p}.${name} missing description`,
        ).toBeTruthy();
      }
    }
  });
});

describe("isGatewayProvider", () => {
  it("returns true for openrouter and vercel", () => {
    expect(isGatewayProvider("openrouter")).toBe(true);
    expect(isGatewayProvider("vercel")).toBe(true);
  });

  it("returns false for direct providers", () => {
    expect(isGatewayProvider("openai")).toBe(false);
    expect(isGatewayProvider("anthropic")).toBe(false);
    expect(isGatewayProvider("google")).toBe(false);
    expect(isGatewayProvider("bedrock")).toBe(false);
  });
});

describe("detectGatewaySubProvider", () => {
  it("detects known sub-providers from model prefix", () => {
    expect(detectGatewaySubProvider("openai/gpt-5.5")).toBe("openai");
    expect(detectGatewaySubProvider("anthropic/claude-sonnet-4-5")).toBe(
      "anthropic",
    );
    expect(detectGatewaySubProvider("google/gemini-2.5-pro")).toBe("google");
    expect(detectGatewaySubProvider("mistral/mistral-large-latest")).toBe(
      "mistral",
    );
    expect(detectGatewaySubProvider("cohere/command-r-plus")).toBe("cohere");
  });

  it("handles case-insensitive gateway prefixes and Google Vertex aliases", () => {
    expect(detectGatewaySubProvider("OpenAI/GPT-5-20260703")).toBe("openai");
    expect(detectGatewaySubProvider("vertex/gemini-3.5-pro-latest")).toBe(
      "google",
    );
    expect(
      detectGatewaySubProvider("google-vertex/gemini-3.5-pro-latest"),
    ).toBe("google");
  });

  it("returns undefined for unknown sub-providers", () => {
    expect(detectGatewaySubProvider("qwen/qwen2.5-pro")).toBeUndefined();
    expect(detectGatewaySubProvider("deepseek/deepseek-v4.1-flash-1017")).toBe(
      "deepseek",
    );
    expect(detectGatewaySubProvider("moonshotai/kimi-k3")).toBe("moonshotai");
    expect(detectGatewaySubProvider("mistralai/mistral-large-4-0")).toBe(
      "mistral",
    );
  });

  it("returns undefined for models without a slash", () => {
    expect(detectGatewaySubProvider("gpt-5.5")).toBeUndefined();
    expect(detectGatewaySubProvider("claude-sonnet-4-5")).toBeUndefined();
  });

  it("does not match gateways as sub-providers", () => {
    expect(detectGatewaySubProvider("openrouter/some-model")).toBeUndefined();
    expect(detectGatewaySubProvider("vercel/some-model")).toBeUndefined();
    expect(detectGatewaySubProvider("bedrock/some-model")).toBeUndefined();
  });
});

describe("modelMatchesFamily", () => {
  it("matches known model families across version suffix delimiters", () => {
    expect(modelMatchesFamily("openai/gpt-5-20260703-preview", "gpt-5")).toBe(
      true,
    );
    expect(modelMatchesFamily("claude-sonnet-4-5-20250929", "claude")).toBe(
      true,
    );
    expect(modelMatchesFamily("nova.v2", "nova")).toBe(true);
  });

  it("does not match families embedded in longer names", () => {
    expect(modelMatchesFamily("gpt-50-preview", "gpt-5")).toBe(false);
    expect(modelMatchesFamily("novalite", "nova")).toBe(false);
    expect(modelMatchesFamily("gpt-5_20260703-preview", "gpt-5")).toBe(false);
    expect(modelMatchesFamily("nova:v2", "nova")).toBe(false);
  });
});

describe("isReasoningModel", () => {
  it("detects reasoning model family prefixes", () => {
    expect(isReasoningModel("o3")).toBe(true);
    expect(isReasoningModel("o4-mini")).toBe(true);
    expect(isReasoningModel("o9-preview")).toBe(true);
    expect(isReasoningModel("o9.20260703")).toBe(true);
    expect(isReasoningModel("gpt-5.5")).toBe(true);
    expect(isReasoningModel("gpt-5.12-preview")).toBe(true);
    expect(isReasoningModel("gpt-7")).toBe(true);
    expect(isReasoningModel("gpt-7.1-preview")).toBe(true);
    expect(isReasoningModel("openai/GPT-5-20260703-preview")).toBe(true);
    expect(isReasoningModel("openai/gpt-5.5")).toBe(true);
    expect(isReasoningModel("gpt-4o")).toBe(false);
    expect(isReasoningModel("gpt-5_20260703")).toBe(false);
  });
});

describe("detectBedrockModelFamily", () => {
  it("matches family segments across profiles, ARNs, and suffix revisions", () => {
    expect(
      detectBedrockModelFamily(
        "arn:aws:bedrock:us-east-1::inference-profile/us.anthropic.claude-sonnet-4-5-20260703-v2:0",
      ),
    ).toBe("anthropic");
    expect(detectBedrockModelFamily("global.amazon.nova-pro-v2:0")).toBe(
      "amazon",
    );
  });

  it("detects prompt caching support for revisioned Nova model names", () => {
    expect(bedrockSupportsCaching("amazon.nova-pro-v2:0")).toBe(true);
    expect(bedrockSupportsCaching("amazon.novalite-v2:0")).toBe(false);
  });
});
