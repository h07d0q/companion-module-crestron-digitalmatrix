import type { JsonValue, SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	[key: string]: JsonValue | undefined
	host: string
	port: number
	authentication: boolean
	username: string
	pollInterval: number
	debugLogging: boolean
	saveresponse?: boolean
}

export interface ModuleSecrets {
	[key: string]: JsonValue | undefined
	password?: string
}

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP or Hostname',
			width: 6,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 3,
			min: 1,
			max: 65535,
			default: 23,
		},
		{
			type: 'checkbox',
			id: 'authentication',
			label: 'Authentication',
			default: false,
			width: 3,
			disableAutoExpression: true,
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			width: 6,
			default: '',
			isVisibleExpression: '$(config:authentication)',
		},
		{
			type: 'secret-text',
			id: 'password',
			label: 'Password',
			width: 6,
			default: '',
			isVisibleExpression: '$(config:authentication)',
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Polling interval (ms, 0 = disabled)',
			width: 6,
			default: 0,
			min: 0,
			max: 60000,
			step: 500,
		},
		{
			type: 'checkbox',
			id: 'debugLogging',
			label: 'Log extra info during connection operations, for debugging purposes',
			default: false,
			width: 6,
		},
		{
			type: 'checkbox',
			id: 'saveresponse',
			label: 'Save TCP response to variable (tcp_response)',
			default: false,
			width: 6,
		},
	]
}
