import assert from 'node:assert/strict';
import test from 'node:test';

import { TrustedRouter } from '../dist/nodes/TrustedRouter/TrustedRouter.node.js';

test('current-key operation uses the control API with the inference credential', async () => {
	const node = new TrustedRouter();
	let captured;
	const context = {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name) =>
			({ resource: 'account', operation: 'getCurrentKey' })[name],
		getNode: () => ({
			name: 'TrustedRouter',
			type: 'n8n-nodes-trustedrouter.trustedRouter',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (credentialName, options) => {
				captured = { credentialName, options };
				return { data: { usage: 7 } };
			},
		},
	};

	const [items] = await node.execute.call(context);

	assert.equal(captured.credentialName, 'trustedRouterApi');
	assert.equal(captured.options.url, 'https://trustedrouter.com/v1/key');
	assert.deepEqual(items, [
		{ json: { data: { usage: 7 } }, pairedItem: { item: 0 } },
	]);
});
