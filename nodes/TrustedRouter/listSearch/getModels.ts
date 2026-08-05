import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { trustedRouterApiRequest } from '../shared/transport';

interface ModelSummary extends IDataObject {
	id: string;
	name?: string;
}

interface ModelsResponse extends IDataObject {
	data?: ModelSummary[];
}

const PRIORITY_MODELS = new Map([
	['trustedrouter/auto', 0],
	['trustedrouter/zdr', 1],
	['trustedrouter/e2e', 2],
	['trustedrouter/fast', 3],
	['trustedrouter/cheap', 4],
]);

function modelUrl(modelId: string): string {
	const path = modelId
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
	return `https://trustedrouter.com/models/${path}`;
}

export async function getModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await trustedRouterApiRequest.call(this, 'GET', '/models')) as ModelsResponse;
	const query = filter?.trim().toLowerCase() ?? '';
	const models = Array.isArray(response.data) ? response.data : [];

	const results: INodeListSearchItems[] = models
		.filter((model) => {
			if (!query) return true;
			return model.id.toLowerCase().includes(query) || model.name?.toLowerCase().includes(query);
		})
		.sort((left, right) => {
			const leftPriority = PRIORITY_MODELS.get(left.id) ?? Number.MAX_SAFE_INTEGER;
			const rightPriority = PRIORITY_MODELS.get(right.id) ?? Number.MAX_SAFE_INTEGER;
			if (leftPriority !== rightPriority) return leftPriority - rightPriority;
			return left.id.localeCompare(right.id);
		})
		.slice(0, 100)
		.map((model) => ({
			name: model.name ? `${model.name} (${model.id})` : model.id,
			value: model.id,
			url: modelUrl(model.id),
		}));

	return { results };
}
