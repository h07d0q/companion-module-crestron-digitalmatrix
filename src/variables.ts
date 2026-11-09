import type { CompanionVariableDefinitions } from '@companion-module/base'
import type CrestronInstance from './main.js'

export function updateVariableDefinitions(self: CrestronInstance): void {
	const definitions: CompanionVariableDefinitions = {
		connection_status: { name: 'Connection Status' },
		model: { name: 'Matrix Model' },
		tcp_response: { name: 'Last TCP Response' },
	}

	for (const dest of self.destinations) {
		definitions[`RouteOut${dest.id}Video`] = {
			name: `Output ${dest.label} (Slot ${dest.id}) Video Routed From Input`,
		}
		definitions[`RouteOut${dest.id}Audio`] = {
			name: `Output ${dest.label} (Slot ${dest.id}) Audio Routed From Input`,
		}
		definitions[`RouteOut${dest.id}USB`] = {
			name: `Output ${dest.label} (Slot ${dest.id}) USB Routed From Input`,
		}
	}

	self.setVariableDefinitions(definitions)
}
