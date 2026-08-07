# Changelog

## 0.1.3

- Use the supported `Development` node codex category required by the n8n UI.
- Add regression coverage for n8n's documented node codex category set.

## 0.1.2

- Route Chat Completions and Responses through the attested inference API.
- Route credential checks, model catalog reads, and current-key reads through the control API.
- Replace the management-only credits action with inference-key-safe current-key usage and limits.
- Add regression coverage for the inference and control-plane boundary.

## 0.1.0

- Add Chat Completions and stateless Responses operations.
- Add live model search, model catalog, and credit balance operations.
- Add fallback routing, provider preferences, tags, tools, workspace selection, trace metadata, and idempotency keys.
- Add simplified and raw output modes.
- Add tests, GitHub Actions CI, and provenance publishing.
