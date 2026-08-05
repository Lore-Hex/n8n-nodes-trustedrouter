import assert from 'node:assert/strict';
import test from 'node:test';

import {
	TRUSTEDROUTER_API_URL,
	trustedRouterApiRequest,
} from '../dist/nodes/TrustedRouter/shared/transport.js';

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
	assert.equal(captured.options.url, `${TRUSTEDROUTER_API_URL}/chat/completions`);
	assert.deepEqual(captured.options.body, { model: 'trustedrouter/auto' });
	assert.deepEqual(captured.options.headers, { 'Idempotency-Key': 'workflow:1' });
	assert.equal(captured.options.json, true);
});
