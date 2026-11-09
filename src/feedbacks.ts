import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import type CrestronInstance from './main.js'
import type { SignalType } from './types.js'

export enum FeedbackId {
	OutputRouting = 'output_routing',
	OutputOff = 'output_off',
}

export function updateFeedbacks(self: CrestronInstance): void {
	const feedbacks: CompanionFeedbackDefinitions = {
		[FeedbackId.OutputRouting]: {
			type: 'boolean',
			name: 'Output Routing Status',
			description: 'Returns true if selected input is currently routed to the selected output',
			defaultStyle: {
				bgcolor: combineRgb(153, 204, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					id: 'id_type',
					label: 'Signal Type',
					default: 'Video',
					choices: [
						{ id: 'Video', label: 'Video' },
						{ id: 'Audio', label: 'Audio' },
						{ id: 'USB', label: 'USB' },
					],
				},
				{
					type: 'checkbox',
					id: 'output_var_cbx',
					label: 'Custom output or variable',
					default: false,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'output_var',
					label: 'Output or variable',
					isVisibleExpression: '$(options:output_var_cbx)',
				},
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					choices: self.destinations.map((d) => ({ id: d.id, label: `Output ${d.label} (Slot ${d.id})` })),
					isVisibleExpression: '!$(options:output_var_cbx)',
					default: self.destinations[0]?.id ?? 0,
				},
				{
					type: 'checkbox',
					id: 'input_var_cbx',
					label: 'Custom input or variable',
					default: false,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'input_var',
					label: 'Input or variable',
					isVisibleExpression: '$(options:input_var_cbx)',
				},
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					choices: self.sources.map((s) => ({ id: s.id, label: s.id === 0 ? 'Off (Disconnect)' : `Input ${s.label}` })),
					isVisibleExpression: '!$(options:input_var_cbx)',
					default: self.sources[0]?.id ?? 0,
				},
			],
			callback: async (feedback) => {
				const signalType = (feedback.options.id_type || 'Video') as SignalType

				const rawOutput = feedback.options.output_var_cbx ? feedback.options.output_var : feedback.options.output
				const output = await self.getSlotOrOff(rawOutput as string | number, self.destinations, 'Output')

				const rawInput = feedback.options.input_var_cbx ? feedback.options.input_var : feedback.options.input
				const input = await self.getSlotOrOff(rawInput as string | number, self.sources, 'Input')

				const route = self.routingMatrix[output]
				if (!route) return false

				const currentSource = route[signalType]
				return currentSource === input
			},
		},

		[FeedbackId.OutputOff]: {
			type: 'boolean',
			name: 'Output is Disconnected (Off)',
			description: 'Returns true if output has no active video input route (0/Off)',
			defaultStyle: {
				bgcolor: combineRgb(100, 100, 100),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					choices: self.destinations.map((d) => ({ id: d.id, label: `Output ${d.label} (Slot ${d.id})` })),
					default: self.destinations[0]?.id ?? 0,
				},
			],
			callback: (feedback) => {
				const output = Number(feedback.options.output ?? 0)
				const route = self.routingMatrix[output]
				if (!route) return false
				return route.Video === 0
			},
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
