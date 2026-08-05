import assert from 'node:assert/strict';
import test from 'node:test';

import {
	TRUSTEDROUTER_CONTROL_API_URL,
	TRUSTEDROUTER_INFERENCE_API_URL,
	trustedRouterApiRequest,
} from '../dist/nodes/TrustedRouter/shared/transport.js';

test('transport keeps control and attested inference origins separate', () => {
	assert.equal(TRUSTEDROUTER_CONTROL_API_URL, 'https://trustedrouter.com/v1');
	assert.equal(TRUSTEDROUTER_INFERENCE_API_URL, 'https://api.trustedrouter.com/v1');
});

test('transport sends requests through n8n credential authentication', async () => {
	let captured;
	const context = {
		helpers: {
			httpRequestWithAuthentication: async (credentialName, options) => {
				captured = { credentialName, options };
				return { id: 'gen_1' };
			},
		},
	};

	const result = await trustedRouterApiRequest.call(
		context,
		'POST',
		'/chat/completions',
		{ model: 'trustedrouter/auto' },
		{ 'Idempotency-Key': 'workflow:1' },
	);

	assert.deepEqual(result, { id: 'gen_1' });
	assert.equal(captured.credentialName, 'trustedRouterApi');
	assert.equal(captured.options.url, 'https://api.trustedrouter.com/v1/chat/completions');
	assert.deepEqual(captured.options.body, { model: 'trustedrouter/auto' });
	assert.deepEqual(captured.options.headers, { 'Idempotency-Key': 'workflow:1' });
	assert.equal(captured.options.json, true);
});

test('catalog and account requests can target the control plane', async () => {
	let captured;
	const context = {
		helpers: {
			httpRequestWithAuthentication: async (credentialName, options) => {
				captured = { credentialName, options };
				return { data: [] };
			},
		},
	};

	await trustedRouterApiRequest.call(
		context,
		'GET',
		'/models',
		undefined,
		undefined,
		'control',
	);

	assert.equal(captured.credentialName, 'trustedRouterApi');
	assert.equal(captured.options.url, 'https://trustedrouter.com/v1/models');
});
