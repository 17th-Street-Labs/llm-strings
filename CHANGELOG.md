# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Meta Model API provider support (`meta`, `api.meta.ai`) for Muse Spark 1.1 using OpenAI-compatible parameter normalization and AI SDK provider options.

## [1.10.0] — 2026-10-20

### Added
- Z.ai provider (`zai`, `api.z.ai`) with GLM-5.3 reasoning validation and AI SDK options.
- Gemini 4 Argon and Claude Haiku 5.5 parameter validation, including Haiku's distinct thinking and sampling rules.
- DeepSeek and Moonshot thinking configuration in strict validation and AI SDK options.
- Verified October frontier model routes in regression tests and playground suggestions.

### Fixed
- Accept OpenAI's `ultrafast` service tier.
- Normalize Kimi K3 native token limits to `max_completion_tokens` and validate its reasoning and fixed sampling options.
- Detect DeepSeek, Moonshot, Z.ai, and OpenRouter's `mistralai` gateway prefixes.

## [1.4.0] — 2026-07-02

### Added
- `isReasoningModel` now detects GPT-5 family models (`gpt-5`, `gpt-5.5`, etc.) in addition to o-series models, and strips gateway prefixes before matching.
- `max_completion_tokens` added to OpenAI, OpenRouter, and Vercel `PROVIDER_PARAMS` and `PARAM_SPECS`; normalizing `max_tokens` on a reasoning model no longer emits a spurious "Unknown param" warning.
- Vercel AI Gateway `PARAM_SPECS` extended with routing params: `order`, `only`, `models`, `tags`, `sort`, `caching`, `user`, `byok`, `zero_data_retention`, `disallow_prompt_training`, `hipaa_compliant`, `quota_entity_id`, `provider_timeouts`.

### Changed
- Updated model IDs across README and tests for current provider releases (claude-sonnet-4-5, claude-opus-4-6, claude-opus-4-8, gpt-5.5, gemini-3.5-flash, llama-4).
- Bedrock test cases updated to use current Amazon Nova and Meta Llama 4 model IDs.

### Fixed
- Validation correctly blocks `temperature`/`top_p` on GPT-5 reasoning models when using OpenRouter or Vercel gateways.

## [1.3.0] — 2026-06-30

### Added
- 20+ new providers: `xai`, `groq`, `fal`, `deepinfra`, `black-forest-labs`, `together`, `fireworks`, `deepseek`, `moonshotai`, `perplexity`, `alibaba`, `cerebras`, `replicate`, `prodia`, `luma`, `bytedance`, `kling`, `elevenlabs`, `assemblyai`, `deepgram`, `gladia`, `lmnt`, `hume`, `revai`, `baseten`, `huggingface`.
- Additional host aliases: `aistudio`, `vertex`, `grok`, `bfl`, `dashscope`, `alibabacloud`, `togetherai`, `fireworksai`, `moonshot`, `wandb`, `weightsandbiases`, `baidu`, `qianfan`, `venice`, `parasail`, `novita`, `atlascloud`, `xiaomi`, `minimax`.
- `PROVIDER_META` array with `id`, `name`, `host`, and `color` for all providers — for UI integrations.
- `CANONICAL_PARAM_SPECS` export: canonical (snake_case) param specs per provider, derived at runtime from `PROVIDER_PARAMS` and `PARAM_SPECS`.
- `createAiSdkProviderOptions` now accepts a raw connection string, parsed `LlmConnectionConfig`, or a `NormalizeResult` directly.
- AI SDK adapter (`llm-strings/ai-sdk`) extended with:
  - Bedrock `reasoningConfig` / `cachePoint` options.
  - OpenRouter `reasoning` object with `effort`, `max_tokens`, `enabled`, `exclude`.
  - Vercel AI Gateway routing options under `providerOptions.gateway`.
  - Anthropic `thinking`, `thinking_budget`, `anthropic_beta`, `mcp_servers`, `context_management`.
  - Google thinking config (`thinking_budget`, `thinking_level`, `include_thoughts`).
  - Mistral `safe_prompt`, `reasoning_effort`, `structured_outputs`.
  - Cohere thinking (`thinking_token_budget`, `thinking_type`).
- `google-vertex` provider with `aiplatform.googleapis.com` and `vertex` alias.
- `azure` provider with `models.inference.ai.azure.com`.

### Changed
- `CANONICAL_PARAM_SPECS` is now derived from `PROVIDER_PARAMS` + `PARAM_SPECS` instead of being a separate static definition, eliminating duplication.
- Removed the `MODELS` export (previously listed model IDs per provider) — model IDs change too frequently to maintain reliably in a library.

### Fixed
- `canHostOpenAIModels` correctly includes `azure` provider for reasoning-model checks.

## [1.2.0] — 2026-05-13

### Added
- `createAiSdkProviderOptions` can now be called with a plain connection string (previously required a parsed config).
- Additional host aliases for `novitaai`, `parasail`, `atlascloud`, `xiaomi`, `minimax`.
- `resolveHostAlias` accepts an optional `env` argument, enabling testing without mutating `process.env`.
- `LLM_STRINGS_HOST_<ALIAS>` env override form (alternative to `LLM_STRINGS_<ALIAS>_HOST`).

### Changed
- `hostAlias` is now recorded on the parsed config and drives provider detection before falling back to hostname pattern matching — important when the resolved host is a private/regional endpoint that doesn't contain the provider name.

## [1.1.1] — 2026-02-18

### Added
- `llm-strings/providers` sub-path included in build output with full type declarations.
- `subProvider` field on `NormalizeResult` — for gateway URLs like `openrouter.ai/anthropic/claude-*`, the underlying `anthropic` provider is exposed separately.
- Gateway sub-provider validation: when routing through OpenRouter or Vercel to a known sub-provider (OpenAI, Anthropic, Google, Mistral, Cohere), `validate()` applies the sub-provider's tighter parameter specs instead of the gateway's loose ranges.
- Anthropic `temperature` + `top_p` mutual exclusion validated for Bedrock Claude models and Anthropic models accessed via gateways.

### Fixed
- `detectGatewaySubProvider` correctly extracts the provider prefix from gateway model strings.

## [1.0.1] — 2026-02-18

### Fixed
- `providers.ts` entry point included in tsup build.
- Provider metadata (`PROVIDER_META`) exported from `llm-strings/providers`.

## [1.0.0] — 2026-02-09

### Added
- `parse(connectionString)` — parses `llm://` connection strings into structured `LlmConnectionConfig`.
- `build(config)` — inverse of `parse`; serializes config back to a connection string.
- `normalize(config, options?)` — expands shorthand aliases, maps canonical params to provider-specific names, handles cache and reasoning-model rewrites.
- `validate(connectionString, options?)` — parses + normalizes + checks types, ranges, enum values, and provider constraints.
- Short aliases for all major params: `temp`, `max`, `topp`, `topk`, `freq`, `pres`, `stop`, `seed`, `effort`, `cache`, and more.
- `ALIASES`, `HOST_ALIASES`, `PROVIDER_PARAMS`, `PARAM_SPECS` constants.
- `detectProvider(host)` — hostname to `Provider` enum.
- `resolveHostAlias(host)` — expands short aliases with `LLM_STRINGS_*_HOST` env override support.
- Strict mode (`{ strict: true }`) promotes unknown-provider and unknown-param warnings to errors.
- Bedrock: `detectBedrockModelFamily` detects Anthropic, Meta, Amazon, Mistral, Cohere, AI21 from model ID prefixes, including cross-region (`us.`, `eu.`, `apac.`, `global.`) prefixes.
- Bedrock: `bedrockSupportsCaching` — prompt caching gated to Claude and Amazon Nova models.
- Bedrock: `topK` restriction (Claude, Cohere, Mistral only).
- Anthropic: `temperature` + `top_p` mutual exclusion validated.
- Cache TTL normalization: `cache=5m` / `cache=1h` → `cache_control=ephemeral` + `cache_ttl=<value>` for Anthropic and Bedrock Claude.
- OpenAI reasoning models (`o1`, `o3`, `o4`, GPT-5): `max_tokens` remapped to `max_completion_tokens`; `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `n` blocked.
- `llm-strings/ai-sdk` sub-path: `createAiSdkProviderOptions` builds AI SDK `providerOptions` from a connection string.
- `llm-strings/providers` sub-path with all provider helpers and constants.
- Sub-path imports ship ESM + CJS with full TypeScript declarations.
- Zero runtime dependencies.

[Unreleased]: https://github.com/justsml/llm-strings/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/justsml/llm-strings/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/justsml/llm-strings/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/justsml/llm-strings/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/justsml/llm-strings/compare/v1.0.1...v1.1.1
[1.0.1]: https://github.com/justsml/llm-strings/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/justsml/llm-strings/releases/tag/v1.0.0
