# n8n nodes for TrustedRouter

[![CI](https://github.com/Lore-Hex/n8n-nodes-trustedrouter/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Hex/n8n-nodes-trustedrouter/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/n8n-nodes-trustedrouter.svg)](https://www.npmjs.com/package/n8n-nodes-trustedrouter)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

Use hundreds of AI models through [TrustedRouter](https://trustedrouter.com) in n8n. The node supports OpenAI-compatible Chat Completions and Responses, automatic model routing, fallbacks, tags, tools, workspace selection, and idempotent retries.

TrustedRouter never stores prompt or output logs. Prompts still pass through n8n while a workflow runs, and n8n may retain execution data according to the settings of your n8n instance.

## Installation

### n8n Cloud and verified community nodes

After n8n completes verification, an instance owner or admin can:

1. Open the nodes panel.
2. Search for `TrustedRouter`.
3. Select **Install** under **More from the community**.

Verified community nodes must be enabled by the n8n instance owner.

### Self-hosted n8n

Open **Settings > Community Nodes**, select **Install**, and enter:

```text
n8n-nodes-trustedrouter
```

Restart n8n if the node does not appear immediately.

## Credentials

1. [Create a TrustedRouter API key](https://trustedrouter.com/console/keys).
2. Add a **TrustedRouter API** credential in n8n.
3. Paste the API key. n8n stores it as a secret credential.
4. Select **Save** to verify the credential against the live model catalog.

## Operations

### Text

- **Create Chat Completion** calls `POST /v1/chat/completions`.
- **Create Response** calls the stateless `POST /v1/responses` API with `store=false`.
- Choose a model from the live catalog or enter any TrustedRouter model ID.
- Configure fallback models, provider routing, tools, tags, trace metadata, structured JSON output, workspace selection, and an idempotency key.

### Model

- **Get Many** returns the current TrustedRouter model catalog.

### Account

- **Get Credits** returns the current balance and usage for the authenticated workspace.

The node is also marked **Usable as an AI Tool**, so an n8n AI Agent can call it as a workflow tool.

## Use TrustedRouter as an n8n AI Agent chat model

n8n does not yet accept third-party AI language-model nodes for verified community-node review. You can still use TrustedRouter as the model behind an AI Agent with n8n's built-in **OpenAI Chat Model** node:

1. Add an **OpenAI Chat Model** node to the AI Agent.
2. Create an OpenAI credential with your TrustedRouter API key.
3. Set **Base URL** to `https://api.trustedrouter.com/v1`.
4. Enter a model such as `trustedrouter/auto`, `trustedrouter/zdr`, or `trustedrouter/e2e`.

This uses the same attested TrustedRouter API. No OpenAI account is required.

## Example

Create a Text operation with these values:

```text
Operation: Create Chat Completion
Model: trustedrouter/auto
Instructions: Answer briefly and return valid JSON.
Input: Classify {{$json.customerMessage}} as billing, technical, or sales.
Response Format: JSON Object
Idempotency Key: {{$execution.id}}:{{$itemIndex}}
```

The simplified output contains the response text, finish reason, model, and token usage. Disable **Simplify** to receive the full OpenAI-compatible response.

## Security

- The published package has no runtime dependencies.
- It does not read environment variables or files.
- API keys remain in n8n's credential store and are sent only in the authorization header.
- The package is published from GitHub Actions with npm provenance.
- TrustedRouter's running gateway can be verified at [trust.trustedrouter.com](https://trust.trustedrouter.com).

Review the [TrustedRouter trust center](https://trustedrouter.com/trust) and [source code](https://github.com/Lore-Hex/quill-router) for the full security boundary.

## Development

```bash
npm ci
npm run check
```

Run the node locally in n8n with:

```bash
npm run dev
```

## Support

- Documentation: [trustedrouter.com/docs](https://trustedrouter.com/docs)
- Issues: [GitHub Issues](https://github.com/Lore-Hex/n8n-nodes-trustedrouter/issues)
- Email: [help@trustedrouter.com](mailto:help@trustedrouter.com)

## License

[MIT](LICENSE.md), maintained by [Lore Hex Corp](https://trustedrouter.com).
