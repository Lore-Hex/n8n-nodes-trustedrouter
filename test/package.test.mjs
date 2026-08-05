import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('package metadata meets n8n community-node requirements', () => {
	assert.equal(packageJson.name, 'n8n-nodes-trustedrouter');
	assert.equal(packageJson.license, 'MIT');
	assert.ok(packageJson.keywords.includes('n8n-community-node-package'));
	assert.equal(
		packageJson.repository.url,
		'git+https://github.com/Lore-Hex/n8n-nodes-trustedrouter.git',
	);
	assert.deepEqual(packageJson.publishConfig, { access: 'public' });
	assert.equal(packageJson.n8n.strict, true);
});

test('published package has no runtime dependencies', () => {
	assert.equal(packageJson.dependencies, undefined);
	assert.deepEqual(packageJson.peerDependencies, { 'n8n-workflow': '*' });
});

test('runtime source does not access environment variables or the file system', async () => {
	const sources = await Promise.all([
		readFile(new URL('../nodes/TrustedRouter/TrustedRouter.node.ts', import.meta.url), 'utf8'),
		readFile(new URL('../nodes/TrustedRouter/shared/helpers.ts', import.meta.url), 'utf8'),
		readFile(new URL('../nodes/TrustedRouter/shared/transport.ts', import.meta.url), 'utf8'),
	]);
	const source = sources.join('\n');
	assert.doesNotMatch(source, /process\.env/);
	assert.doesNotMatch(source, /node:fs|from ['"]fs['"]|require\(['"]fs/);
});

test('package exports only TrustedRouter node and credentials', () => {
	assert.deepEqual(packageJson.n8n.nodes, [
		'dist/nodes/TrustedRouter/TrustedRouter.node.js',
	]);
	assert.deepEqual(packageJson.n8n.credentials, [
		'dist/credentials/TrustedRouterApi.credentials.js',
	]);
});

test('node is usable as an AI tool and does not claim to be an AI language-model node', async () => {
	const { TrustedRouter } = await import('../dist/nodes/TrustedRouter/TrustedRouter.node.js');
	const node = new TrustedRouter();
	assert.equal(node.description.usableAsTool, true);
	assert.deepEqual(node.description.outputs, ['main']);
	assert.ok(node.description.properties.some((property) => property.name === 'model'));
});

test('credential validation uses the live TrustedRouter catalog endpoint', async () => {
	const { TrustedRouterApi } = await import(
		'../dist/credentials/TrustedRouterApi.credentials.js'
	);
	const credential = new TrustedRouterApi();
	assert.equal(credential.test.request.baseURL, 'https://trustedrouter.com/v1');
	assert.equal(credential.test.request.url, '/models');
	assert.equal(credential.properties[0].typeOptions.password, true);
});
