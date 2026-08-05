import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export const TRUSTEDROUTER_INFERENCE_API_URL = 'https://api.trustedrouter.com/v1';
export const TRUSTEDROUTER_CONTROL_API_URL = 'https://trustedrouter.com/v1';

export type TrustedRouterApiPlane = 'inference' | 'control';

type RequestContext = IExecuteFunctions | ILoadOptionsFunctions;

export async function trustedRouterApiRequest(
	this: RequestContext,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
	headers?: IDataObject,
	plane: TrustedRouterApiPlane = 'inference',
): Promise<unknown> {
	const baseUrl =
		plane === 'control' ? TRUSTEDROUTER_CONTROL_API_URL : TRUSTEDROUTER_INFERENCE_API_URL;
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${resource}`,
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
