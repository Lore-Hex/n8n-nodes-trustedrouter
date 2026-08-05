import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export interface TextRequestParameters {
	model: unknown;
	input: string;
	instructions?: string;
	messages?: unknown;
	options?: IDataObject;
}

export function locatorValue(value: unknown): string {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (value && typeof value === 'object' && 'value' in value) {
		const locator = value as { value?: unknown };
		if (typeof locator.value === 'string' && locator.value.trim()) return locator.value.trim();
	}
	throw new Error("'Model' must contain a model ID");
}

export function parseJsonValue(value: unknown, fieldName: string): unknown {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		throw new Error(`'${fieldName}' must contain valid JSON`);
	}
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function applySharedOptions(body: IDataObject, options: IDataObject): void {
	if (typeof options.temperature === 'number') body.temperature = options.temperature;
	if (typeof options.topP === 'number') body.top_p = options.topP;

	const fallbackModels = nonEmptyString(options.fallbackModels);
	if (fallbackModels) {
		body.models = fallbackModels
			.split(',')
			.map((model) => model.trim())
			.filter(Boolean);
	}

	for (const [parameterName, apiName] of [
		['provider', 'provider'],
		['metadata', 'metadata'],
		['trace', 'trace'],
		['tags', 'tags'],
		['tools', 'tools'],
	] as const) {
		const parsed = parseJsonValue(options[parameterName], parameterName);
		if (parsed !== undefined) body[apiName] = parsed as IDataObject;
	}
}

function additionalMessages(value: unknown): IDataObject[] {
	if (!value || typeof value !== 'object') return [];
	const collection = value as { message?: unknown };
	if (!Array.isArray(collection.message)) return [];
	return collection.message
		.filter((message): message is { role?: unknown; content?: unknown } => Boolean(message))
		.map((message) => ({
			role: typeof message.role === 'string' ? message.role : 'user',
			content: typeof message.content === 'string' ? message.content : '',
		}))
		.filter((message) => Boolean(message.content));
}

export function buildChatCompletionBody(parameters: TextRequestParameters): IDataObject {
	const options = parameters.options ?? {};
	const messages: IDataObject[] = [];
	const instructions = nonEmptyString(parameters.instructions);
	if (instructions) messages.push({ role: 'system', content: instructions });
	messages.push(...additionalMessages(parameters.messages));
	messages.push({ role: 'user', content: parameters.input });

	const body: IDataObject = {
		model: locatorValue(parameters.model),
		messages,
		stream: false,
	};

	if (typeof options.maxTokens === 'number' && options.maxTokens > 0) {
		body.max_tokens = options.maxTokens;
	}
	if (options.responseFormat === 'json_object') {
		body.response_format = { type: 'json_object' };
	}
	applySharedOptions(body, options);
	return body;
}

export function buildResponseBody(parameters: TextRequestParameters): IDataObject {
	const options = parameters.options ?? {};
	const body: IDataObject = {
		model: locatorValue(parameters.model),
		input: parameters.input,
		store: false,
		stream: false,
	};

	const instructions = nonEmptyString(parameters.instructions);
	if (instructions) body.instructions = instructions;
	if (typeof options.maxTokens === 'number' && options.maxTokens > 0) {
		body.max_output_tokens = options.maxTokens;
	}
	if (options.responseFormat === 'json_object') {
		body.text = { format: { type: 'json_object' } };
	}
	applySharedOptions(body, options);
	return body;
}

function record(value: unknown): IDataObject {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as IDataObject)
		: {};
}

function array(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function simplifyChatCompletion(response: unknown): IDataObject {
	const root = record(response);
	const choice = record(array(root.choices)[0]);
	const message = record(choice.message);
	const usage = record(root.usage);
	return {
		id: root.id,
		model: root.model,
		text: message.content,
		finishReason: choice.finish_reason,
		inputTokens: usage.prompt_tokens,
		outputTokens: usage.completion_tokens,
		totalTokens: usage.total_tokens,
	};
}

export function simplifyResponse(response: unknown): IDataObject {
	const root = record(response);
	const usage = record(root.usage);
	let text = root.output_text;
	if (typeof text !== 'string') {
		const outputItem = record(array(root.output)[0]);
		const content = record(array(outputItem.content)[0]);
		text = content.text;
	}
	return {
		id: root.id,
		model: root.model,
		status: root.status,
		text,
		inputTokens: usage.input_tokens,
		outputTokens: usage.output_tokens,
		totalTokens: usage.total_tokens,
	};
}

export function simplifyModel(model: unknown): IDataObject {
	const value = record(model);
	const pricing = record(value.pricing);
	return {
		id: value.id,
		name: value.name,
		contextLength: value.context_length,
		inputPrice: pricing.prompt,
		outputPrice: pricing.completion,
		providers: value.providers,
		architecture: value.architecture,
	};
}

export function responseItems(
	response: unknown,
	itemIndex: number,
	transform?: (value: unknown) => IDataObject,
): INodeExecutionData[] {
	const values = Array.isArray(response) ? response : [response];
	return values.map((value) => ({
		json: transform ? transform(value) : record(value),
		pairedItem: { item: itemIndex },
	}));
}
