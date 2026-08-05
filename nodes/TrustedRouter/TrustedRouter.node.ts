import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getModels } from './listSearch/getModels';
import {
	buildChatCompletionBody,
	buildResponseBody,
	responseItems,
	simplifyChatCompletion,
	simplifyModel,
	simplifyResponse,
} from './shared/helpers';
import { trustedRouterApiRequest } from './shared/transport';

const textDisplayOptions = { show: { resource: ['text'] } };
const modelDisplayOptions = { show: { resource: ['model'] } };
const accountDisplayOptions = { show: { resource: ['account'] } };

export class TrustedRouter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TrustedRouter',
		name: 'trustedRouter',
		icon: {
			light: 'file:../../icons/trustedrouter.svg',
			dark: 'file:../../icons/trustedrouter.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use hundreds of AI models through a private, OpenAI-compatible router',
		defaults: { name: 'TrustedRouter' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'trustedRouterApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'Model', value: 'model' },
					{ name: 'Account', value: 'account' },
				],
				default: 'text',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: textDisplayOptions,
				options: [
					{
						name: 'Create Chat Completion',
						value: 'chatCompletion',
						action: 'Create chat completion',
						description: 'Generate text using the OpenAI-compatible Chat Completions API',
					},
					{
						name: 'Create Response',
						value: 'response',
						action: 'Create response',
						description: 'Generate text using the OpenAI-compatible Responses API',
					},
				],
				default: 'chatCompletion',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: modelDisplayOptions,
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get models',
						description: 'Retrieve the available model catalog',
					},
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: accountDisplayOptions,
				options: [
					{
						name: 'Get Credits',
						value: 'getCredits',
						action: 'Get account credits',
						description: 'Retrieve the current credit balance and usage',
					},
				],
				default: 'getCredits',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'id', value: 'trustedrouter/auto' },
				required: true,
				displayOptions: textDisplayOptions,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'getModels',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. trustedrouter/auto',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[^\\s]+/[^\\s]+',
									errorMessage: 'Enter a model ID such as trustedrouter/auto',
								},
							},
						],
						url: '=https://trustedrouter.com/models/{{$value}}',
					},
				],
				description: 'The model to use for generation',
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				required: true,
				displayOptions: textDisplayOptions,
				description: 'The user message or input to send to the model',
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				displayOptions: textDisplayOptions,
				description: 'System instructions that guide the model response',
			},
			{
				displayName: 'Earlier Messages',
				name: 'messages',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
					multipleValueButtonText: 'Add Message',
				},
				default: {},
				displayOptions: {
					show: { resource: ['text'], operation: ['chatCompletion'] },
				},
				options: [
					{
						displayName: 'Message',
						name: 'message',
						values: [
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{ name: 'Assistant', value: 'assistant' },
									{ name: 'System', value: 'system' },
									{ name: 'User', value: 'user' },
								],
								default: 'user',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								typeOptions: { rows: 3 },
								default: '',
								required: true,
							},
						],
					},
				],
				description: 'Optional earlier messages for a multi-turn chat',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: textDisplayOptions,
				options: [
					{
						displayName: 'Fallback Models',
						name: 'fallbackModels',
						type: 'string',
						default: '',
						placeholder: 'e.g. anthropic/claude-sonnet, moonshotai/kimi-k3',
						description: 'Comma-separated model IDs to try if the primary model is unavailable',
					},
					{
						displayName: 'Idempotency Key',
						name: 'idempotencyKey',
						type: 'string',
						default: '',
						description: 'A unique value that prevents duplicate billing when a workflow retries',
					},
					{
						displayName: 'Maximum Output Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 1024,
						typeOptions: { minValue: 1 },
						description: 'Maximum number of tokens the model may generate',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Metadata to associate with the request',
					},
					{
						displayName: 'Provider Routing',
						name: 'provider',
						type: 'json',
						default: '{}',
						description: 'TrustedRouter provider routing preferences as JSON',
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						options: [
							{ name: 'Text', value: 'text' },
							{ name: 'JSON Object', value: 'json_object' },
						],
						default: 'text',
						description: 'The format the model should return',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'json',
						default: '{}',
						description: 'Tags used to attribute and organize TrustedRouter usage',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
						description: 'Controls response randomness',
					},
					{
						displayName: 'Tools',
						name: 'tools',
						type: 'json',
						default: '[]',
						description: 'Function tool definitions in OpenAI-compatible JSON format',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						description: 'Controls token diversity using nucleus sampling',
					},
					{
						displayName: 'Trace Metadata',
						name: 'trace',
						type: 'json',
						default: '{}',
						description: 'Trace metadata for configured observability destinations',
					},
					{
						displayName: 'Workspace ID',
						name: 'workspaceId',
						type: 'string',
						default: '',
						description: 'Workspace to bill when the API key can access more than one workspace',
					},
				],
			},
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				displayOptions: textDisplayOptions,
				description: 'Whether to return a simplified response instead of the raw API response',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: true,
				displayOptions: modelDisplayOptions,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 1000 },
				displayOptions: { show: { resource: ['model'], returnAll: [false] } },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Simplify',
				name: 'simplifyModels',
				type: 'boolean',
				default: true,
				displayOptions: modelDisplayOptions,
				description: 'Whether to return a simplified version of each model',
			},
		],
	};

	methods = { listSearch: { getModels } };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				if (resource === 'model' && operation === 'getMany') {
					const response = (await trustedRouterApiRequest.call(
						this,
						'GET',
						'/models',
						undefined,
						undefined,
						'control',
					)) as {
						data?: unknown[];
					};
					const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
					const limit = returnAll ? Number.MAX_SAFE_INTEGER : (this.getNodeParameter('limit', itemIndex) as number);
					const simplify = this.getNodeParameter('simplifyModels', itemIndex) as boolean;
					const models = Array.isArray(response.data) ? response.data.slice(0, limit) : [];
					returnData.push(
						...models.flatMap((model) =>
							responseItems(model, itemIndex, simplify ? simplifyModel : undefined),
						),
					);
					continue;
				}

				if (resource === 'account' && operation === 'getCredits') {
					const response = await trustedRouterApiRequest.call(
						this,
						'GET',
						'/credits',
						undefined,
						undefined,
						'control',
					);
					returnData.push(...responseItems(response, itemIndex));
					continue;
				}

				if (resource !== 'text') {
					throw new NodeOperationError(this.getNode(), 'Unsupported resource or operation', {
						itemIndex,
					});
				}

				const model = this.getNodeParameter('model', itemIndex);
				const input = this.getNodeParameter('input', itemIndex) as string;
				const instructions = this.getNodeParameter('instructions', itemIndex, '') as string;
				const messages = this.getNodeParameter('messages', itemIndex, {});
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
				const simplify = this.getNodeParameter('simplify', itemIndex) as boolean;
				const headers: IDataObject = {};
				if (typeof options.workspaceId === 'string' && options.workspaceId.trim()) {
					headers['X-TrustedRouter-Workspace'] = options.workspaceId.trim();
				}
				if (typeof options.idempotencyKey === 'string' && options.idempotencyKey.trim()) {
					headers['Idempotency-Key'] = options.idempotencyKey.trim();
				}

				const parameters = {
					model,
					input,
					instructions,
					messages,
					options,
					node: this.getNode(),
					itemIndex,
				};
				const isResponse = operation === 'response';
				const body = isResponse
					? buildResponseBody(parameters)
					: buildChatCompletionBody(parameters);
				const endpoint = isResponse ? '/responses' : '/chat/completions';
				const response = await trustedRouterApiRequest.call(this, 'POST', endpoint, body, headers);
				const transform = simplify
					? isResponse
						? simplifyResponse
						: simplifyChatCompletion
					: undefined;
				returnData.push(...responseItems(response, itemIndex, transform));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { message: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}

		return [returnData];
	}
}
