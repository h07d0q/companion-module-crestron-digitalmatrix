import type { CompanionActionDefinitions } from '@companion-module/base'
import type CrestronInstance from './main.js'

export enum ActionId {
	Route = 'route',
	PollRoutes = 'poll_routes',
	FpLockout = 'fplockout',
	DisplayMessage = 'display_message',
}

export function updateActions(self: CrestronInstance): void {
	const actions: CompanionActionDefinitions = {
		[ActionId.Route]: {
			name: 'Route source to destination',
			hasResult: false,
			options: [
				{
					type: 'dropdown',
					id: 'id_type',
					label: 'Route type',
					choices: [
						{ id: 'SETAVROUTE', label: 'Audio & Video' },
						{ id: 'SETAVUROUTE', label: 'Audio, Video & USB' },
						{ id: 'SETVIDEOROUTE', label: 'Video' },
						{ id: 'SETAUDIOROUTE', label: 'Audio' },
						{ id: 'SETUSBROUTE', label: 'USB' },
					],
					default: 'SETAVROUTE',
				},
				{
					type: 'checkbox',
					id: 'id_dst_var_cbx',
					label: 'Custom output or variable',
					default: false,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'id_dst_var',
					label: 'Output or variable',
					isVisibleExpression: '$(options:id_dst_var_cbx)',
				},
				{
					type: 'dropdown',
					id: 'id_dst',
					label: 'Output',
					choices: self.destinations.map((d) => ({ id: d.id, label: `Output ${d.label} (Slot ${d.id})` })),
					isVisibleExpression: '!$(options:id_dst_var_cbx)',
					default: self.destinations[0]?.id ?? 0,
				},
				{
					type: 'checkbox',
					id: 'id_src_var_cbx',
					label: 'Custom input or variable',
					default: false,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'id_src_var',
					label: 'Input or variable',
					isVisibleExpression: '$(options:id_src_var_cbx)',
				},
				{
					type: 'dropdown',
					id: 'id_src',
					label: 'Input',
					choices: self.sources.map((s) => ({ id: s.id, label: s.id === 0 ? 'Off (Disconnect)' : `Input ${s.label}` })),
					isVisibleExpression: '!$(options:id_src_var_cbx)',
					default: self.sources[0]?.id ?? 0,
				},
			],
			callback: async (action) => {
				const idType = String(action.options.id_type || 'SETAVROUTE')

				const rawDst = action.options.id_dst_var_cbx ? action.options.id_dst_var : action.options.id_dst
				const idDst = await self.getSlotOrOff(rawDst as string | number, self.destinations, 'Destination')

				const rawSrc = action.options.id_src_var_cbx ? action.options.id_src_var : action.options.id_src
				const idSrc = await self.getSlotOrOff(rawSrc as string | number, self.sources, 'Source')

				const cmd = `${idType} ${idSrc} ${idDst}`
				self.sendToCrestron(cmd)

				// Optimistic local state update for snappy UI feedback
				self.updateLocalRoute(idDst, idSrc, idType)

				// Request updated routing table from device asynchronously
				self.requestRoutingUpdate()
			},
		},

		[ActionId.PollRoutes]: {
			name: 'Poll / Refresh Matrix Routing',
			hasResult: false,
			options: [],
			callback: async () => {
				self.getRouting()
			},
		},

		[ActionId.FpLockout]: {
			name: 'Front Panel Lockout',
			hasResult: false,
			options: [
				{
					type: 'dropdown',
					id: 'state',
					label: 'Lockout State',
					choices: [
						{ id: 'on', label: 'Locked (On)' },
						{ id: 'off', label: 'Unlocked (Off)' },
					],
					default: 'on',
				},
			],
			callback: async (action) => {
				const state = action.options.state === 'on' ? 'on' : 'off'
				self.sendToCrestron(`setfplockout ${state}`)
			},
		},

		[ActionId.DisplayMessage]: {
			name: 'Display Message on Front Panel',
			hasResult: false,
			options: [
				{
					type: 'textinput',
					id: 'message',
					label: 'Message',
					default: '',
				},
				{
					type: 'checkbox',
					id: 'shortMessage',
					label: 'Short message (2s timeout, then restore screen)',
					default: true,
				},
			],
			callback: async (action) => {
				const msg = String(action.options.message ?? '')
				const cmd = action.options.shortMessage ? `shortmessage ${msg}` : `message ${msg}`
				self.sendToCrestron(cmd)
			},
		},
	}

	self.setActionDefinitions(actions)
}
