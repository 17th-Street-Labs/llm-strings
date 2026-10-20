import { describe, expect, it } from "vitest";
import { parse, build } from "./parse.js";
import { normalize } from "./normalize.js";
import { validate } from "./validate.js";
import { isJevModel } from "./providers.js";
import { createAiSdkProviderOptions } from "./ai-sdk.js";

describe("September 2026 models", () => {
  it.each([
    "llm://meta/muse-spark-1.3",
    "llm://openrouter/meta/muse-spark-1.3",
  ])("preserves Muse Spark 1.3 routes in %s", (url) => {
    expect(parse(build(parse(url))).model).toContain("muse-spark-1.3");
    expect(validate(url, { strict: true })).toEqual([]);
  });
  it.each([
    "openai/gpt-6.1-sol",
    "openrouter/openai/gpt-6.1-sol",
    "vercel/openai/gpt-6.1-sol",
  ])("supports GPT-6.1 Sol reasoning through %s", (route) => {
    const url = `llm://${route}?effort=max&max=4096&temp=0.5&logprobs=true`;
    const result = normalize(parse(url));
    expect(result.config.params).toMatchObject({
      reasoning_effort: "max",
      max_completion_tokens: "4096",
    });
    expect(result.config.params).not.toHaveProperty("temperature");
    expect(result.config.params).not.toHaveProperty("logprobs");
    expect(validate(url, { strict: true })).toEqual([]);
    for (const effort of ["none", "minimal"]) {
      expect(validate(`llm://${route}?effort=${effort}`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            param: "reasoning_effort",
            severity: "error",
          }),
        ]),
      );
    }
  });

  it.each([
    "anthropic/claude-sonnet-5-5",
    "openrouter/anthropic/claude-sonnet-5.5",
    "vercel/anthropic/claude-sonnet-5.5",
  ])("supports Claude Sonnet 5.5 through %s", (route) => {
    const base = `llm://${route}`;
    const betweenTools = build({
      ...parse(base),
      params: {
        thinking: JSON.stringify({ type: "between_tools" }),
        effort: "high",
      },
    });
    expect(validate(betweenTools, { strict: true })).toEqual([]);
    expect(
      validate(
        build({
          ...parse(base),
          params: { tool_choice: JSON.stringify({ type: "auto" }) },
        }),
        { strict: true },
      ),
    ).toEqual([]);
    if (route.startsWith("anthropic/")) {
      expect(
        createAiSdkProviderOptions(betweenTools).providerOptions,
      ).toMatchObject({
        anthropic: { thinking: { type: "between_tools" } },
      });
    }
    expect(
      validate(
        build({
          ...parse(base),
          params: {
            thinking: JSON.stringify({ type: "between_tools" }),
            effort: "max",
          },
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ param: "thinking", severity: "error" }),
      ]),
    );
    for (const params of [
      { thinking: JSON.stringify({ type: "disabled" }) },
      { thinking: JSON.stringify({ type: "enabled", budget_tokens: 1024 }) },
      { tool_choice: JSON.stringify({ type: "any" }) },
      { temp: "0.5" },
      { top_k: "40" },
    ] as Record<string, string>[]) {
      const url = build({ ...parse(base), params });
      expect(validate(url)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ severity: "error" }),
        ]),
      );
    }
  });

  it.each(["gpt-6-sol", "gpt-6-luna"])(
    "preserves sampling only without reasoning for %s",
    (model) => {
      for (const host of ["openai", "openrouter", "vercel"]) {
        const route = host === "openai" ? model : `openai/${model}`;
        const result = normalize(
          parse(
            `llm://${host}/${route}?temp=0.5&reasoningEffort=none&top_p=0.8&logprobs=true`,
          ),
        );
        expect(result.config.params).toMatchObject({
          temperature: "0.5",
          top_p: "0.8",
          logprobs: "true",
        });
        expect(
          normalize(
            parse(`llm://${host}/${route}?effort=high&temp=0.5&logprobs=true`),
          ).config.params,
        ).not.toHaveProperty("logprobs");
      }
    },
  );
  it.each(["grok", "xai", "openrouter/x-ai", "vercel/xai"])(
    "validates Grok effort via %s",
    (route) => {
      expect(validate(`llm://${route}/grok-4.7?effort=xhigh`)).toEqual([]);
      expect(validate(`llm://${route}/grok-4.7?effort=none`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ severity: "error" }),
        ]),
      );
    },
  );
  it.each(["claude-fable-5-1", "claude-opus-5-5"])(
    "supports adaptive thinking for %s",
    (model) => {
      const url = build({
        host: "api.anthropic.com",
        model,
        params: { thinking: JSON.stringify({ type: "adaptive" }) },
      });
      expect(validate(url, { strict: true })).toEqual([]);
      expect(createAiSdkProviderOptions(url).providerOptions).toMatchObject({
        anthropic: { thinking: { type: "adaptive" } },
      });
      expect(validate(url.replace("adaptive", "disabled"))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ severity: "error" }),
        ]),
      );
    },
  );
  it("preserves and identifies Jev decision routes", () => {
    const url = "llm://openrouter/typesafe/jev-1.13";
    expect(parse(build(parse(url))).model).toBe("typesafe/jev-1.13");
    expect(isJevModel(parse(url).model)).toBe(true);
    expect(isJevModel("~typesafe/jev-latest")).toBe(true);
    expect(isJevModel("other/jev-1.13")).toBe(false);
    expect(validate(url, { strict: true })).toEqual([]);
    expect(validate(`${url}?temp=0.5`)[0].severity).toBe("error");
  });
});

// Official provider documentation and public gateway catalogs checked 2026-10-20.
describe("October frontier models", () => {
  it.each([
    "google/gemini-4-argon",
    "vertex/gemini-4-argon",
    "openrouter/google/gemini-4-argon",
    "vercel/google/gemini-4-argon",
  ])(
    "validates Argon thinking and preserves long output limits through %s",
    (route) => {
      expect(
        validate(`llm://${route}?effort=medium&max=262144`, { strict: true }),
      ).toEqual([]);
      for (const effort of ["none", "minimal", "xhigh", "max"]) {
        expect(validate(`llm://${route}?effort=${effort}`)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ severity: "error" }),
          ]),
        );
      }
      if (route.startsWith("google/") || route.startsWith("vertex/")) {
        const key = route.startsWith("vertex/") ? "vertex" : "google";
        expect(
          createAiSdkProviderOptions(`llm://${route}?effort=high`)
            .providerOptions,
        ).toMatchObject({
          [key]: { thinkingConfig: { thinkingLevel: "high" } },
        });
      }
    },
  );

  it.each([
    "anthropic/claude-haiku-5-5",
    "openrouter/anthropic/claude-haiku-5.5",
    "vercel/anthropic/claude-haiku-5.5",
  ])(
    "handles Haiku's distinct thinking and sampling contract through %s",
    (route) => {
      const url = (params: Record<string, string>) =>
        build({ ...parse(`llm://${route}`), params });
      for (const params of [
        {
          effort: "max",
          thinking: '{"type":"adaptive","display":"summarized"}',
        },
        { effort: "high", thinking: '{"type":"disabled"}' },
        { top_p: "0.99" },
        { temp: "1.0" },
        { tool_choice: '{"type":"any"}' },
      ] as Record<string, string>[])
        expect(validate(url(params), { strict: true })).toEqual([]);
      for (const params of [
        { effort: "max", thinking: '{"type":"disabled"}' },
        { effort: "xhigh", thinking: '{"type":"disabled"}' },
        { thinking: '{"type":"enabled","budget_tokens":1024}' },
        { thinking: '{"type":"between_tools"}' },
        { thinking: '{"type":"adaptive","budget_tokens":1024}' },
        { thinking: "null" },
        { thinking: "[]" },
        { thinking: "{" },
        { temp: "0.5" },
        { top_p: "1" },
        { top_k: "1" },
      ] as Record<string, string>[])
        expect(validate(url(params))).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ severity: "error" }),
          ]),
        );
      if (route.startsWith("anthropic/")) {
        expect(
          createAiSdkProviderOptions(
            url({ thinking: '{"type":"disabled"}', effort: "low" }),
          ).providerOptions,
        ).toMatchObject({
          anthropic: { thinking: { type: "disabled" }, effort: "low" },
        });
      }
    },
  );

  it.each([
    "moonshot/kimi-k3",
    "openrouter/moonshotai/kimi-k3",
    "vercel/moonshotai/kimi-k3",
  ])("supports Kimi K3 through %s", (route) => {
    const url = `llm://${route}?effort=low&max=131072`;
    expect(validate(url, { strict: true })).toEqual([]);
    const native = route.startsWith("moonshot/");
    expect(normalize(parse(url)).config.params).toMatchObject({
      reasoning_effort: "low",
      [native ? "max_completion_tokens" : "max_tokens"]: "131072",
    });
    for (const query of [
      "effort=none",
      "effort=medium",
      "effort=xhigh",
      "temp=0.5",
      "top_p=1",
    ]) {
      expect(validate(`llm://${route}?${query}`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ severity: "error" }),
        ]),
      );
    }
    if (native) {
      expect(createAiSdkProviderOptions(url).providerOptions).toMatchObject({
        moonshotai: { reasoningEffort: "low", maxCompletionTokens: 131072 },
      });
      expect(validate(`llm://${route}?max=1048577`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            param: "max_completion_tokens",
            severity: "error",
          }),
        ]),
      );
    }
  });

  it("supports DeepSeek's native Flash alias and thinking option", () => {
    const url = build({
      ...parse("llm://deepseek/deepseek-flash"),
      params: {
        thinking: '{"type":"enabled"}',
        effort: "low",
        max: "65536",
      },
    });
    expect(validate(url, { strict: true })).toEqual([]);
    expect(createAiSdkProviderOptions(url).providerOptions).toMatchObject({
      deepseek: { reasoningEffort: "low", thinking: { type: "enabled" } },
    });
  });

  it.each([
    "zai/glm-5.3",
    "api.z.ai/glm-5.3",
    "openrouter/z-ai/glm-5.3",
    "vercel/zai/glm-5.3",
  ])("validates GLM-5.3 through %s", (route) => {
    for (const effort of ["low", "high", "max"]) {
      expect(
        validate(`llm://${route}?effort=${effort}&max=4096`, { strict: true }),
      ).toEqual([]);
    }
    for (const effort of ["none", "minimal", "medium", "xhigh"]) {
      expect(validate(`llm://${route}?effort=${effort}`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            param: "reasoning_effort",
            severity: "error",
          }),
        ]),
      );
    }
    const url = build({
      ...parse(`llm://${route}`),
      params: { thinking: '{"type":"disabled"}' },
    });
    expect(validate(url)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ param: "thinking", severity: "error" }),
      ]),
    );
    if (route.startsWith("zai/")) {
      const enabled = build({
        ...parse(url),
        params: { effort: "high", thinking: '{"type":"enabled"}' },
      });
      expect(normalize(parse(enabled))).toMatchObject({
        provider: "zai",
        config: { params: { reasoning_effort: "high" } },
      });
      expect(createAiSdkProviderOptions(enabled).providerOptions).toMatchObject(
        { zai: { reasoningEffort: "high", thinking: { type: "enabled" } } },
      );
      expect(validate(enabled, { strict: true })).toEqual([]);
    }
  });

  it("rejects disabled Kimi K3 thinking and preserves fixed defaults", () => {
    const url = build({
      ...parse("llm://moonshot/kimi-k3"),
      params: { thinking: '{"type":"disabled"}' },
    });
    expect(validate(url)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ param: "thinking", severity: "error" }),
      ]),
    );
    const enabled = build({
      ...parse(url),
      params: {
        thinking: '{"type":"enabled"}',
        top_p: "0.95",
        temp: "1",
        n: "1",
      },
    });
    expect(validate(enabled, { strict: true })).toEqual([]);
    expect(createAiSdkProviderOptions(enabled).providerOptions).toMatchObject({
      moonshotai: { thinking: { type: "enabled" } },
    });
  });

  it("accepts GPT-6.1 Sol ultrafast processing", () => {
    const url = "llm://openai/gpt-6.1-sol?service_tier=ultrafast&effort=low";
    expect(validate(url, { strict: true })).toEqual([]);
    expect(createAiSdkProviderOptions(url).providerOptions).toMatchObject({
      openai: { serviceTier: "ultrafast" },
    });
  });

  it.each([
    "mistral/mistral-large-4",
    "openrouter/mistralai/mistral-large-4-0",
    "vercel/mistral/mistral-large-4",
    "openrouter/deepseek/deepseek-v4.1-flash-1017",
    "vercel/deepseek/deepseek-v4.1-flash-1017",
    "openrouter/qwen/qwen3.8-max-prime",
    "vercel/alibaba/qwen3.8-max-prime",
    "openrouter/z-ai/glm-5.3",
    "vercel/zai/glm-5.3",
    "openrouter/z-ai/glm-5.3-flashx",
    "vercel/zai/glm-5.3-flashx",
  ])("preserves verified lab route %s", (route) => {
    const url = `llm://${route}?max=4096`;
    expect(build(parse(url))).toContain(parse(url).model);
    expect(normalize(parse(url)).config.params.max_tokens).toBe("4096");
    expect(validate(url, { strict: true })).toEqual([]);
  });

  it("does not apply new model rules to unrelated families", () => {
    expect(validate("llm://google/gemini-3.6-flash?effort=minimal")).toEqual(
      [],
    );
    expect(validate("llm://moonshot/kimi-k2.6?effort=medium&temp=0.5")).toEqual(
      [],
    );
  });
});
