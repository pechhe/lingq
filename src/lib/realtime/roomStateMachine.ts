export type RoomUiState =
	| 'idle'
	| 'requesting_microphone'
	| 'microphone_denied'
	| 'joining_room'
	| 'waiting_for_other_participant'
	| 'connecting_livekit'
	| 'connecting_translation'
	| 'connected'
	| 'speaking'
	| 'receiving_translation'
	| 'muted'
	| 'paused'
	| 'reconnecting'
	| 'ended'
	| 'error';

export type StatusLevel = 'idle' | 'pending' | 'ready' | 'blocked' | 'error';

export function statusLevelFor(state: RoomUiState): StatusLevel {
	if (state === 'error') return 'error';
	if (state === 'microphone_denied') return 'blocked';
	if (state === 'connected' || state === 'speaking' || state === 'receiving_translation')
		return 'ready';
	if (state === 'idle' || state === 'ended') return 'idle';
	return 'pending';
}

export function canPushToTalk(state: RoomUiState) {
	return state === 'connected' || state === 'speaking' || state === 'receiving_translation';
}
