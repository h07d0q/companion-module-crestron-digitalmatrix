export interface MatrixSlot {
	id: number
	label: number | string
}

export interface RouteStatus {
	Video: number
	Audio: number
	USB: number
}

export type RoutingMatrix = Record<number, RouteStatus>

export type RouteType = 'SETAVROUTE' | 'SETAVUROUTE' | 'SETVIDEOROUTE' | 'SETAUDIOROUTE' | 'SETUSBROUTE'
export type SignalType = 'Video' | 'Audio' | 'USB'
