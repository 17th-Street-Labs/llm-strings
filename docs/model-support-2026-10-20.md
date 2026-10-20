# Model support refresh — October 20, 2026

Model IDs pass through without an allowlist. This audit checked official provider
documentation and fetched both public gateway catalogs (HTTP 200). Regression tests
cover parsing, normalization, validation, and provider option shaping. No paid
inference requests were made; catalog presence does not establish account access.

## OpenAI

GPT-6.1 Sol remains current. The new `service_tier=ultrafast` value now passes
validation and maps to `providerOptions.openai.serviceTier`. Existing GPT-6
reasoning and sampling rules remain in place. Ultrafast requires the Responses API;
this library does not choose endpoints.

Source: [OpenAI changelog](https://developers.openai.com/api/docs/changelog).

## Google

`gemini-4-argon` accepts `low`, `medium`, and `high` thinking levels. Validation
checks native Gemini, Vertex, OpenRouter, and Vercel routes. Larger output limits
continue to pass through; this library cannot calculate the input-dependent
remaining context budget.

```text
llm://google/gemini-4-argon?effort=medium&max=262144
llm://vercel/google/gemini-4-argon?effort=high
```

Source: [Gemini 4 Argon guide](https://ai.google.dev/gemini-api/docs/latest-model).

## Anthropic

Haiku's native ID is `claude-haiku-5-5`; both gateways use
`anthropic/claude-haiku-5.5`. Haiku permits adaptive thinking, or disabled thinking
through `high` effort. Manual thinking budgets are invalid. Its accepted sampling
defaults are `temperature=1` and `top_p=0.99`, separately; any `top_k` is invalid.
Forced tool selection remains valid. These rules differ from Sonnet 5.5.

```text
llm://anthropic/claude-haiku-5-5?effort=medium&max=4096
llm://openrouter/anthropic/claude-haiku-5.5?effort=low
```

Sources: [Haiku migration](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide),
[effort settings](https://platform.claude.com/docs/en/build-with-claude/effort).

## DeepSeek, Moonshot, and Z.ai

DeepSeek's native `deepseek-flash` alias now serves V4.1 Flash 1017. Its JSON
`thinking` option is recognized in strict validation and provider option shaping.
The gateway ID is `deepseek/deepseek-v4.1-flash-1017`.

Kimi K3 uses `low`, `high`, or `max` effort and always thinks. Native `max` aliases
normalize to `max_completion_tokens`; gateways retain `max_tokens`. Validation
checks fixed sampling defaults and the native completion limit.

Z.ai is now available through the `zai` host alias. GLM-5.3 supports enabled
thinking and `low`, `high`, or `max` effort. Variant IDs retain their own pass-through
behavior. Configure the client's API base path separately, following Z.ai's guide.
`providerOptions.zai` is a custom provider namespace; a matching client adapter is
required to consume it.

```text
llm://deepseek/deepseek-flash?effort=low&max=65536
llm://moonshot/kimi-k3?effort=low&max=131072
llm://zai/glm-5.3?effort=high&max=4096
```

Sources: [DeepSeek quickstart](https://api-docs.deepseek.com/),
[Kimi K3](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart),
[GLM-5.3](https://docs.z.ai/guides/llm/glm-5.3).

## Other verified lab routes

Mistral's native ID is `mistral-large-4`; OpenRouter uses
`mistralai/mistral-large-4-0`, while Vercel uses `mistral/mistral-large-4`.
Qwen 3.8 Max Prime uses `qwen/qwen3.8-max-prime` on OpenRouter and
`alibaba/qwen3.8-max-prime` on Vercel. GLM-5.3 uses `z-ai/glm-5.3` on
OpenRouter and `zai/glm-5.3` on Vercel. Both also list GLM-5.3 FlashX.
These routes have round-trip and parameter pass-through regression coverage.
Grok 4.7 remains the current xAI flagship and already has effort validation.

Sources: [Mistral Large 4](https://docs.mistral.ai/models/mistral-large-4-0),
[xAI models](https://docs.x.ai/developers/models),
[OpenRouter catalog](https://openrouter.ai/api/v1/models),
[Vercel catalog](https://ai-gateway.vercel.sh/v1/models).
