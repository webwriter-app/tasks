type SpeechResults = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;

export interface SpeechRecognizer {
	lang: string;
	continuous: boolean;
	onresult: ((event: { results: SpeechResults }) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start(track?: MediaStreamTrack): void;
	stop(): void;
	abort(): void;
}

type RecognitionWindow = Window & {
	SpeechRecognition?: new () => SpeechRecognizer;
	webkitSpeechRecognition?: new () => SpeechRecognizer;
};

export function speechRecognition(view: RecognitionWindow | null) {
	return view?.SpeechRecognition ?? view?.webkitSpeechRecognition;
}

export function supportsRecognitionTrack(view: Window | null) {
	// Desktop Chromium added start(track) in 135. Older engines may ignore the track.
	const ua = view?.navigator.userAgent ?? "";
	return !/Android|iPhone|iPad|iPod/.test(ua) && Number(/\b(?:Headless)?Chrome\/(\d+)/.exec(ua)?.[1] ?? 0) >= 135;
}

export function finalTranscript(results: SpeechResults) {
	return Array.from(results).filter(result => result.isFinal)
		.map(result => result[0]?.transcript.trim()).filter(Boolean).join(" ");
}
