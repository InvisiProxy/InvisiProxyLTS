export function blockWebrtc(win: object): void {
	const target = win as {
		RTCPeerConnection?: unknown;
		webkitRTCPeerConnection?: unknown;
	};
	delete target.RTCPeerConnection;
	delete target.webkitRTCPeerConnection;
}
