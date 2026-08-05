import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class TrustedRouterApi implements ICredentialType {
	name = 'trustedRouterApi';

	displayName = 'TrustedRouter API';

	icon: Icon = {
		light: 'file:../icons/trustedrouter.svg',
		dark: 'file:../icons/trustedrouter.dark.svg',
	};

	documentationUrl = 'https://trustedrouter.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Create an API key in the TrustedRouter console',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.trustedrouter.com/v1',
			url: '/models',
			method: 'GET',
		},
	};
}
