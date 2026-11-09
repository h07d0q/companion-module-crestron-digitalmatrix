import type {
	CompanionStaticUpgradeScript,
	CompanionStaticUpgradeResult,
	JsonObject,
} from '@companion-module/base'

export const upgradeScripts: CompanionStaticUpgradeScript<JsonObject, JsonObject>[] = [
	function v2_0_0(_context, props): CompanionStaticUpgradeResult<JsonObject, JsonObject> {
		const result: CompanionStaticUpgradeResult<JsonObject, JsonObject> = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			if (action.actionId === 'routeav') {
				action.actionId = 'route'
				action.options.id_type = { isExpression: false, value: 'SETAVROUTE' }
				result.updatedActions.push(action)
			}
		}

		for (const feedback of props.feedbacks) {
			if (feedback.feedbackId === 'input_routing') {
				feedback.feedbackId = 'output_routing'
				feedback.options.id_type = { isExpression: false, value: 'Video' }
				result.updatedFeedbacks.push(feedback)
			}
		}

		return result
	},

	function v2_1_0(_context, props): CompanionStaticUpgradeResult<JsonObject, JsonObject> {
		const result: CompanionStaticUpgradeResult<JsonObject, JsonObject> = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config && typeof props.config === 'object') {
			let changed = false
			if (props.config.pollInterval === undefined) {
				props.config.pollInterval = 0
				changed = true
			}
			if (props.config.debugLogging === undefined) {
				props.config.debugLogging = false
				changed = true
			}
			if (changed) {
				result.updatedConfig = props.config
			}
		}

		for (const action of props.actions) {
			if (action.actionId === 'route') {
				let actionChanged = false
				if (action.options.id_dst_var_cbx === undefined) {
					action.options.id_dst_var_cbx = { isExpression: false, value: false }
					actionChanged = true
				}
				if (action.options.id_src_var_cbx === undefined) {
					action.options.id_src_var_cbx = { isExpression: false, value: false }
					actionChanged = true
				}
				if (action.options.id_dst_var === undefined) {
					action.options.id_dst_var = { isExpression: false, value: '' }
					actionChanged = true
				}
				if (action.options.id_src_var === undefined) {
					action.options.id_src_var = { isExpression: false, value: '' }
					actionChanged = true
				}
				if (actionChanged) {
					result.updatedActions.push(action)
				}
			}
		}

		for (const feedback of props.feedbacks) {
			if (feedback.feedbackId === 'output_routing') {
				let feedbackChanged = false
				if (feedback.options.output_var_cbx === undefined) {
					feedback.options.output_var_cbx = { isExpression: false, value: false }
					feedbackChanged = true
				}
				if (feedback.options.input_var_cbx === undefined) {
					feedback.options.input_var_cbx = { isExpression: false, value: false }
					feedbackChanged = true
				}
				if (feedback.options.output_var === undefined) {
					feedback.options.output_var = { isExpression: false, value: '' }
					feedbackChanged = true
				}
				if (feedback.options.input_var === undefined) {
					feedback.options.input_var = { isExpression: false, value: '' }
					feedbackChanged = true
				}
				if (feedbackChanged) {
					result.updatedFeedbacks.push(feedback)
				}
			}
		}

		return result
	},

	function v3_0_0(_context, props): CompanionStaticUpgradeResult<JsonObject, JsonObject> {
		const result: CompanionStaticUpgradeResult<JsonObject, JsonObject> = {
			updatedConfig: null,
			updatedSecrets: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config && typeof props.config === 'object') {
			let changed = false
			if (props.config.saveresponse === undefined) {
				props.config.saveresponse = false
				changed = true
			}

			// Migrate plain-text password from old config into secure secrets store
			const oldPassword = props.config.password
			if (typeof oldPassword === 'string' && oldPassword.length > 0) {
				result.updatedSecrets = { password: oldPassword }
				delete props.config.password
				changed = true
			}

			if (changed) {
				result.updatedConfig = props.config
			}
		}

		return result
	},
]

export const UpgradeScripts = upgradeScripts
