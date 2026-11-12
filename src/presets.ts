import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
	type CompanionSimplePresetDefinition,
	type CompanionLayeredButtonPresetDefinition,
} from '@companion-module/base'
import type CrestronInstance from './main.js'
import { ActionId } from './actions.js'
import { FeedbackId } from './feedbacks.js'

export function updatePresets(self: CrestronInstance): void {
	const sections: CompanionPresetSection[] = []
	const presets: CompanionPresetDefinitions = {}

	// Section 1: System
	sections.push({
		id: 'system',
		name: 'System Utilities',
		definitions: ['poll_routes', 'fp_lockout_toggle'],
	})

	presets['poll_routes'] = {
		type: 'simple',
		name: 'Refresh Routing Status',
		style: {
			text: 'REFRESH\nROUTES',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(40, 40, 40),
			alignment: 'center:center',
		},
		steps: [
			{
				down: [
					{
						actionId: ActionId.PollRoutes,
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	presets['fp_lockout_toggle'] = {
		type: 'simple',
		name: 'Front Panel Lock',
		style: {
			text: 'FRONT PANEL\nLOCK',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(70, 70, 70),
			alignment: 'center:center',
		},
		steps: [
			{
				down: [
					{
						actionId: ActionId.FpLockout,
						options: { state: 'on' },
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	// For each destination, create a section with routing buttons and status tiles
	for (const dest of self.destinations) {
		const outLabel = dest.label
		const outSlot = dest.id
		const sectionId = `output_${outSlot}`
		const sectionName = `Output ${outLabel} (Slot ${outSlot})`
		const sectionDefinitions: string[] = []

		// 1. Output Status Tile (With Graphics Engine Layered Preset + Simple Fallback via Alternatives)
		const statusPresetId = `status_out_${outSlot}`
		sectionDefinitions.push(statusPresetId)

		const layeredStatusPreset: CompanionLayeredButtonPresetDefinition = {
			type: 'layered',
			name: `Output ${outLabel} Dynamic Status Tile (Layered Graphics)`,
			elements: [
				// Header background box
				{
					id: 'header_bg',
					type: 'box',
					x: 0,
					y: 0,
					width: 100,
					height: 28,
					color: '#1a1a2e',
				},
				// Header title
				{
					id: 'header_text',
					type: 'text',
					x: 5,
					y: 3,
					width: 90,
					height: 22,
					text: `OUT ${outLabel}`,
					fontsize: 11,
					color: '#a0a0c0',
					halign: 'center',
					valign: 'center',
				},
				// Center routed source number
				{
					id: 'source_text',
					type: 'text',
					x: 5,
					y: 30,
					width: 90,
					height: 42,
					text: `$(dm:RouteOut${outSlot}Video)`,
					fontsize: 20,
					color: '#ffffff',
					halign: 'center',
					valign: 'center',
					weight: 'bold',
				},
				// Bottom divider line
				{
					id: 'bottom_line',
					type: 'line',
					fromX: 5,
					fromY: 74,
					toX: 95,
					toY: 74,
					borderColor: '#333355',
					borderWidth: 1,
				},
				// Stream status badges: Video, Audio, USB
				{
					id: 'badge_video',
					type: 'text',
					x: 10,
					y: 77,
					width: 24,
					height: 20,
					text: 'V',
					fontsize: 9,
					color: '#00ff88',
					halign: 'center',
					valign: 'center',
				},
				{
					id: 'badge_audio',
					type: 'text',
					x: 38,
					y: 77,
					width: 24,
					height: 20,
					text: 'A',
					fontsize: 9,
					color: '#00ddff',
					halign: 'center',
					valign: 'center',
				},
				{
					id: 'badge_usb',
					type: 'text',
					x: 66,
					y: 77,
					width: 24,
					height: 20,
					text: 'U',
					fontsize: 9,
					color: '#ffaa00',
					halign: 'center',
					valign: 'center',
				},
			],
			steps: [
				{
					down: [
						{
							actionId: ActionId.PollRoutes,
							options: {},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}

		const simpleStatusPreset: CompanionSimplePresetDefinition = {
			type: 'simple',
			name: `Output ${outLabel} Status (Simple Fallback)`,
			style: {
				text: `OUT ${outLabel}\n\nIN $(dm:RouteOut${outSlot}Video)`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 50),
				alignment: 'center:center',
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.PollRoutes,
							options: {},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: FeedbackId.OutputOff,
					options: { output: outSlot },
					style: {
						bgcolor: combineRgb(80, 0, 0),
						text: `OUT ${outLabel}\n\nOFF`,
					},
				},
			],
		}

		presets[statusPresetId] = {
			type: 'alternatives',
			variants: [layeredStatusPreset, simpleStatusPreset],
		}

		// 2. Disconnect Button
		const disconnectId = `disconnect_out_${outSlot}`
		sectionDefinitions.push(disconnectId)

		presets[disconnectId] = {
			type: 'simple',
			name: `Disconnect Output ${outLabel}`,
			style: {
				text: `OUT ${outLabel}\nMUTE / OFF`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(100, 20, 20),
				alignment: 'center:center',
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.Route,
							options: {
								id_type: 'SETAVROUTE',
								id_dst: outSlot,
								id_dst_var_cbx: false,
								id_dst_var: '',
								id_src: 0,
								id_src_var_cbx: false,
								id_src_var: '',
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: FeedbackId.OutputOff,
					options: { output: outSlot },
					style: {
						bgcolor: combineRgb(200, 0, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
		}

		// 3. Routing Buttons for each Input
		for (const src of self.sources) {
			if (src.id === 0) continue

			const routePresetId = `route_in_${src.id}_out_${outSlot}`
			sectionDefinitions.push(routePresetId)

			presets[routePresetId] = {
				type: 'simple',
				name: `Route Input ${src.label} -> Output ${outLabel}`,
				style: {
					text: `IN ${src.label}\n►\nOUT ${outLabel}`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(20, 20, 20),
					alignment: 'center:center',
				},
				steps: [
					{
						down: [
							{
								actionId: ActionId.Route,
								options: {
									id_type: 'SETAVROUTE',
									id_dst: outSlot,
									id_dst_var_cbx: false,
									id_dst_var: '',
									id_src: src.id,
									id_src_var_cbx: false,
									id_src_var: '',
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: FeedbackId.OutputRouting,
						options: {
							id_type: 'Video',
							output: outSlot,
							output_var_cbx: false,
							output_var: '',
							input: src.id,
							input_var_cbx: false,
							input_var: '',
						},
						style: {
							bgcolor: combineRgb(0, 180, 0),
							color: combineRgb(255, 255, 255),
						},
					},
				],
			}
		}

		sections.push({
			id: sectionId,
			name: sectionName,
			definitions: sectionDefinitions,
		})
	}

	self.setPresetDefinitions(sections, presets)
}
