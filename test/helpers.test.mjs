import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildChatCompletionBody,
	buildResponseBody,
	locatorValue,
	parseJsonValue,
	responseItems,
	simplifyChatCompletion,
	simplifyResponse,
} from '../dist/nodes/TrustedRouter/shared/helpers.js';

test('locatorValue accepts resource locator and plain model IDs', () => {
	assert.equal(locatorValue('trustedrouter/auto'), 'trustedrouter/auto');
	assert.equal(locatorValue({ mode: 'list', value: 'trustedrouter/zdr' }), 'trustedrouter/zdr');
	assert.throws(() => locatorValue({ mode: 'id', value: '' }), /Model/);
});

test('parseJsonValue preserves expressions and validates JSON strings', () => {
	assert.deepEqual(parseJsonValue('{"only":["anthropic"]}', 'provider'), {
		only: ['anthropic'],
	});
	assert.deepEqual(parseJsonValue({ team: 'legal' }, 'tags'), { team: 'legal' });
	assert.equal(parseJsonValue('', 'metadata'), undefined);
	assert.throws(() => parseJsonValue('{', 'metadata'), /valid JSON/);
});

test('chat completion request is stateless and preserves routing controls', () => {
	const body = buildChatCompletionBody({
		model: { mode: 'id', value: 'trustedrouter/auto' },
		instructions: 'Return JSON.',
		input: 'Classify this request.',
		messages: {
			message: [
				{ role: 'user', content: 'Earlier question' },
				{ role: 'assistant', content: 'Earlier answer' },
			],
		},
		options: {
			fallbackModels: 'trustedrouter/zdr, trustedrouter/e2e',
			maxTokens: 400,
			provider: '{"sort":"latency"}',
			responseFormat: 'json_object',
			tags: '{"environment":"test"}',
			temperature: 0.2,
			tools: '[{"type":"function","function":{"name":"lookup"}}]',
			topP: 0.9,
		},
	});

	assert.equal(body.model, 'trustedrouter/auto');
	assert.equal(body.stream, false);
	assert.equal(body.max_tokens, 400);
	assert.deepEqual(body.models, ['trustedrouter/zdr', 'trustedrouter/e2e']);
	assert.deepEqual(body.provider, { sort: 'latency' });
	assert.deepEqual(body.tags, { environment: 'test' });
	assert.deepEqual(body.response_format, { type: 'json_object' });
	assert.equal(body.messages.length, 4);
	assert.equal(body.messages[0].role, 'system');
	assert.equal(body.messages[3].content, 'Classify this request.');
});

test('Responses request always disables provider-side state', () => {
	const body = buildResponseBody({
		model: 'trustedrouter/zdr',
		input: 'Summarize this.',
		instructions: 'Use one sentence.',
		options: { maxTokens: 128, responseFormat: 'json_object' },
	});

	assert.deepEqual(body, {
		model: 'trustedrouter/zdr',
		input: 'Summarize this.',
		store: false,
		stream: false,
		instructions: 'Use one sentence.',
		max_output_tokens: 128,
		text: { format: { type: 'json_object' } },
	});
});

test('simplifyChatCompletion returns the useful fields only', () => {
	assert.deepEqual(
		simplifyChatCompletion({
			id: 'gen_1',
			model: 'trustedrouter/auto',
			choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
			usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
		}),
		{
			id: 'gen_1',
			model: 'trustedrouter/auto',
			text: 'Hello',
			finishReason: 'stop',
			inputTokens: 4,
			outputTokens: 2,
			totalTokens: 6,
		},
	);
});

test('simplifyResponse supports nested Responses API output text', () => {
	assert.deepEqual(
		simplifyResponse({
			id: 'resp_1',
			model: 'trustedrouter/zdr',
			status: 'completed',
			output: [{ content: [{ type: 'output_text', text: 'Done' }] }],
			usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10 },
		}),
		{
			id: 'resp_1',
			model: 'trustedrouter/zdr',
			status: 'completed',
			text: 'Done',
			inputTokens: 7,
			outputTokens: 3,
			totalTokens: 10,
		},
	);
});

test('responseItems correlates every output to its input item', () => {
	assert.deepEqual(responseItems([{ id: 'a' }, { id: 'b' }], 3), [
		{ json: { id: 'a' }, pairedItem: { item: 3 } },
		{ json: { id: 'b' }, pairedItem: { item: 3 } },
	]);
});
