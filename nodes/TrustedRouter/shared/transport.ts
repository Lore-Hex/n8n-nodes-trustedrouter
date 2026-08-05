import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export const TRUSTEDROUTER_API_URL = 'https://api.trustedrouter.com/v1';

type RequestContext = IExecuteFunctions | ILoadOptionsFunctions;

export async function trustedRouterApiRequest(
	this: RequestContext,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
	headers?: IDataObject,
): Promise<unknown> {
	const options: IHttpRequestOptions = {
		method,
		url: `${TRUSTEDROUTER_API_URL}${resource}`,
		json: true,
		returnFullResponse: false,
	};

	if (body !== undefined) {
		options.body = body;
	}
	if (headers !== undefined && Object.keys(headers).length > 0) {
		options.headers = headers;
	}

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		'trustedRouterApi',
		options,
	);
}
