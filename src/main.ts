import { InstanceBase, InstanceStatus, TCPHelper, type JsonObject } from '@companion-module/base'
import { getConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { updateActions } from './actions.js'
import { updateFeedbacks, FeedbackId } from './feedbacks.js'
import { updatePresets } from './presets.js'
import { updateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import type { MatrixSlot, RoutingMatrix } from './types.js'

export default class CrestronInstance extends InstanceBase {
	public config!: ModuleConfig
	public secrets: ModuleSecrets = {}

	public sources: MatrixSlot[] = [{ id: 0, label: 'Off' }]
	public destinations: MatrixSlot[] = []
	public routingMatrix: RoutingMatrix = {}
	public model = ''

	private socket: TCPHelper | undefined
	private socketBuffer = ''
	private firstRun = true

	private heartbeatTimer: NodeJS.Timeout | null = null
	private heartbeatTimeoutTimer: NodeJS.Timeout | null = null
	private routingDebounceTimer: NodeJS.Timeout | null = null
	private readonly HEARTBEAT_TIMEOUT = 10000

	async init(config: JsonObject, _isFirstInit: boolean, secrets?: JsonObject | undefined): Promise<void> {
		this.config = config as unknown as ModuleConfig
		this.secrets = (secrets ?? {}) as unknown as ModuleSecrets

		this.updateAllDefinitions()

		await this.configUpdated(config, secrets)
	}

	async configUpdated(config: JsonObject, secrets?: JsonObject | undefined): Promise<void> {
		this.cleanupSocket()

		this.config = config as unknown as ModuleConfig
		this.secrets = (secrets ?? {}) as unknown as ModuleSecrets

		this.firstRun = true
		this.sources = [{ id: 0, label: 'Off' }]
		this.destinations = []
		this.routingMatrix = {}

		this.initTcp()
	}

	async destroy(): Promise<void> {
		this.stopHeartbeat()
		if (this.routingDebounceTimer) {
			clearTimeout(this.routingDebounceTimer)
			this.routingDebounceTimer = null
		}
		if (this.socket && this.socket.isConnected) {
			this.sendToCrestron('bye') // Logout correctly to avoid hanging console sessions
		}
		this.cleanupSocket()
		this.updateStatus(InstanceStatus.Disconnected)
	}

	getConfigFields() {
		return getConfigFields()
	}

	public getPassword(): string {
		return (this.secrets?.password as string) || (this.config?.password as string) || ''
	}

	public sendToCrestron(msg: string): void {
		const sendBuf = Buffer.from(msg + '\r\n', 'latin1')

		const password = this.getPassword()
		const isPassword = Boolean(password && msg === password)
		const logMsg = isPassword ? '********' : msg

		if (this.config.debugLogging) {
			this.log('debug', `Sending to ${this.config.host}: ${logMsg}`)
		}

		if (this.socket && this.socket.isConnected) {
			this.socket.send(sendBuf)
		} else {
			this.log('warn', 'Cannot send command: Socket not connected')
		}
	}

	public updateAllDefinitions(): void {
		updateActions(this)
		updateFeedbacks(this)
		updateVariableDefinitions(this)
		updatePresets(this)
	}

	private cleanupSocket(): void {
		this.stopHeartbeat()
		if (this.socket) {
			this.socket.destroy()
			this.socket = undefined
		}
		this.socketBuffer = ''
	}

	private initTcp(): void {
		this.cleanupSocket()

		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Target IP is missing')
			return
		}

		const port = Number(this.config.port) || 23
		this.updateStatus(InstanceStatus.Connecting)

		this.socket = new TCPHelper(this.config.host, port)

		this.socket.on('status_change', (status, message) => {
			this.updateStatus(status, message)
		})

		this.socket.on('error', (err) => {
			this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
			this.log('error', `Network error: ${err.message}`)
		})

		this.socket.on('connect', () => {
			this.updateStatus(InstanceStatus.Connecting, 'Handshaking with Crestron...')
			if (this.config.debugLogging) {
				this.log('debug', `Connected to ${this.config.host}:${port}`)
			}
		})

		this.socket.on('data', (data: Buffer) => {
			this.handleIncomingData(data.toString('latin1'))
		})
	}

	private handleIncomingData(chunk: string): void {
		this.socketBuffer += chunk

		if (this.config.saveresponse) {
			this.setVariableValues({ tcp_response: this.socketBuffer })
		}

		this.resetHeartbeatTimeout()

		// 1. Check for Authentication Prompts immediately
		if (this.socketBuffer.includes('Login:')) {
			if (!this.config.authentication || !this.config.username) {
				this.log('error', 'Crestron DM requires authentication, but credentials are missing in module config')
				this.updateStatus(InstanceStatus.BadConfig, 'Authentication required')
				this.cleanupSocket()
				return
			}
			this.log('info', 'Sending authentication username...')
			this.sendToCrestron(this.config.username)
			this.socketBuffer = this.socketBuffer.replace(/.*Login:/s, '')
			return
		}

		if (this.socketBuffer.includes('Password:')) {
			const password = this.getPassword()
			if (!this.config.authentication || !password) {
				this.log('error', 'Crestron DM requires authentication password, but none configured')
				this.updateStatus(InstanceStatus.BadConfig, 'Password required')
				this.cleanupSocket()
				return
			}
			this.log('info', 'Sending authentication password...')
			this.sendToCrestron(password)
			this.socketBuffer = this.socketBuffer.replace(/.*Password:/s, '')
			return
		}

		// 2. Client Blocked
		if (this.socketBuffer.includes('was blocked.')) {
			this.log('error', 'Connection rejected: Switcher reported client was blocked')
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Client blocked by Crestron')
			this.cleanupSocket()
			return
		}

		// 3. Welcome / Model detection
		const modelMatch = this.socketBuffer.match(/DM-MD(\d{1,2})x\d{1,2}/)
		if (modelMatch && !this.model) {
			this.model = modelMatch[0]
			this.onConnected(this.model)
		}

		// 4. Complete Console Response marker (e.g. DM-MD16x16> or prompt)
		const endMarkerRegex = /DM-MD\d+x\d+>|Control Console>|Prompt>/
		if (endMarkerRegex.test(this.socketBuffer)) {
			if (this.config.debugLogging) {
				this.log('debug', `Complete response received: ${this.socketBuffer.trim()}`)
			}
			this.parseResponse(this.socketBuffer)
			this.socketBuffer = ''
		}
	}

	private onConnected(modelName: string): void {
		this.updateStatus(InstanceStatus.Ok)
		this.log('info', `Connected to Crestron DigitalMatrix: ${modelName}`)
		this.setVariableValues({ model: modelName, connection_status: 'Connected' })

		this.sendToCrestron('dumpdmstreaminfo')
		this.getRouting()

		if (this.config.pollInterval && this.config.pollInterval > 0) {
			this.log('info', `Starting poll heartbeat with interval: ${this.config.pollInterval} ms`)
			this.startHeartbeat()
		}
	}

	public getRouting(): void {
		this.sendToCrestron('dumpdmrouteinfo')
	}

	public requestRoutingUpdate(): void {
		if (this.routingDebounceTimer) {
			clearTimeout(this.routingDebounceTimer)
		}
		this.routingDebounceTimer = setTimeout(() => {
			this.getRouting()
			this.routingDebounceTimer = null
		}, 300)
	}

	public updateLocalRoute(outputSlot: number, inputSlot: number, routeType: string): void {
		if (!this.routingMatrix[outputSlot]) {
			this.routingMatrix[outputSlot] = { Video: 0, Audio: 0, USB: 0 }
		}

		const route = this.routingMatrix[outputSlot]
		if (routeType === 'SETAVROUTE') {
			route.Video = inputSlot
			route.Audio = inputSlot
		} else if (routeType === 'SETAVUROUTE') {
			route.Video = inputSlot
			route.Audio = inputSlot
			route.USB = inputSlot
		} else if (routeType === 'SETVIDEOROUTE') {
			route.Video = inputSlot
		} else if (routeType === 'SETAUDIOROUTE') {
			route.Audio = inputSlot
		} else if (routeType === 'SETUSBROUTE') {
			route.USB = inputSlot
		}

		this.setVariableValues({
			[`RouteOut${outputSlot}Video`]: route.Video,
			[`RouteOut${outputSlot}Audio`]: route.Audio,
			[`RouteOut${outputSlot}USB`]: route.USB,
		})

		this.checkFeedbacks(FeedbackId.OutputRouting, FeedbackId.OutputOff)
	}

	private parseResponse(response: string): void {
		// Parse Input cards
		const inputMatches = [...response.matchAll(/Routing Information for Input Card at Slot (\d{1,2})/g)]
		if (inputMatches.length > 0) {
			const parsedSources: MatrixSlot[] = [{ id: 0, label: 'Off' }]
			for (const m of inputMatches) {
				const slot = parseInt(m[1], 10)
				parsedSources.push({ id: slot, label: slot })
			}
			this.sources = parsedSources
		}

		// Robust line-by-line block parser for Output routing
		const lines = response.split(/\r?\n/)
		let currentOutputSlot: number | null = null
		let outputIndex = 1
		const parsedDestinations: MatrixSlot[] = []
		let routesFound = false

		for (const line of lines) {
			const outHeaderMatch = line.match(/Routing Information for Output Card at Slot (\d{1,2})/)
			if (outHeaderMatch) {
				currentOutputSlot = parseInt(outHeaderMatch[1], 10)
				if (!this.routingMatrix[currentOutputSlot]) {
					this.routingMatrix[currentOutputSlot] = { Video: 0, Audio: 0, USB: 0 }
				}
				parsedDestinations.push({ id: currentOutputSlot, label: outputIndex++ })
				routesFound = true
				continue
			}

			if (currentOutputSlot !== null) {
				const videoMatch = line.match(/Video Routed From Input Card at slot (\d{1,2})/)
				if (videoMatch) {
					this.routingMatrix[currentOutputSlot].Video = parseInt(videoMatch[1], 10)
				} else if (line.includes('No Video connection')) {
					this.routingMatrix[currentOutputSlot].Video = 0
				}

				const audioMatch = line.match(/Audio Routed From Input Card at slot (\d{1,2})/)
				if (audioMatch) {
					this.routingMatrix[currentOutputSlot].Audio = parseInt(audioMatch[1], 10)
				} else if (line.includes('No Audio connection')) {
					this.routingMatrix[currentOutputSlot].Audio = 0
				}

				const usbMatch = line.match(/USB Host Routed to Card at slot (\d{1,2})/)
				if (usbMatch) {
					this.routingMatrix[currentOutputSlot].USB = parseInt(usbMatch[1], 10)
				} else if (line.includes('No USB connection')) {
					this.routingMatrix[currentOutputSlot].USB = 0
				}
			}
		}

		if (routesFound && parsedDestinations.length > 0) {
			this.destinations = parsedDestinations

			const variableUpdates: Record<string, number | string> = {}
			for (const dest of this.destinations) {
				const r = this.routingMatrix[dest.id]
				if (r) {
					variableUpdates[`RouteOut${dest.id}Video`] = r.Video
					variableUpdates[`RouteOut${dest.id}Audio`] = r.Audio
					variableUpdates[`RouteOut${dest.id}USB`] = r.USB
				}
			}
			this.setVariableValues(variableUpdates)

			if (this.firstRun) {
				this.updateAllDefinitions()
				this.firstRun = false
			}

			this.checkFeedbacks(FeedbackId.OutputRouting, FeedbackId.OutputOff)
		}
	}

	public async getSlotOrOff(value: string | number, array: MatrixSlot[], logLabel = 'Value'): Promise<number> {
		const parsed = parseInt(String(value), 10)
		if (!isNaN(parsed)) {
			const found = array.find((d) => d.label === parsed || d.id === parsed)
			return found ? found.id : 0
		} else {
			if (this.config.debugLogging) {
				this.log('warn', `${logLabel} "${value}" is not a number or slot not found; fallback to 0 (off)`)
			}
			return 0
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat()
		if (this.config.pollInterval && this.config.pollInterval > 0) {
			this.heartbeatTimer = setInterval(() => {
				this.getRouting()
			}, this.config.pollInterval)
			this.resetHeartbeatTimeout()
		}
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer)
			this.heartbeatTimer = null
		}
		if (this.heartbeatTimeoutTimer) {
			clearTimeout(this.heartbeatTimeoutTimer)
			this.heartbeatTimeoutTimer = null
		}
	}

	private resetHeartbeatTimeout(): void {
		if (this.heartbeatTimeoutTimer) {
			clearTimeout(this.heartbeatTimeoutTimer)
		}
		this.heartbeatTimeoutTimer = setTimeout(() => {
			this.onHeartbeatTimeout()
		}, this.HEARTBEAT_TIMEOUT)
	}

	private onHeartbeatTimeout(): void {
		this.log('warn', 'Heartbeat timeout: No response from Crestron matrix, reconnecting...')
		this.updateStatus(InstanceStatus.ConnectionFailure, 'Heartbeat lost')
		this.cleanupSocket()
		setTimeout(() => {
			this.initTcp()
		}, 5000)
	}
}

export { UpgradeScripts }
