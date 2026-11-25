import { str, type MsgFn } from "@lit/localize";
import "@shoelace-style/shoelace/dist/themes/light.css";
import MicIcon from "@tabler/icons/outline/microphone.svg";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { transaction } from "@webwriter/widget/transaction";
import { name as packageId } from "../../package.json";

import { registerQuizType } from "../model/quiz-api";
import { AudioPlayer } from "../components/audio-player";
import { AudioRecorder } from "../components/audio-recorder";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";
import { inheritedRecordingLanguage, recordingLanguageName, RecordingLanguagePicker, recordingLanguageStyles } from "../components/recording-language-picker";
import { finalTranscript, speechRecognition, supportsRecognitionTrack } from "../components/speech-recognition";
import { TopLayerPopup } from "../components/top-layer";
import { selfAssessmentOption } from "../components/rubric-popover";
import { matchText, scoreDictation } from "../model/scoring";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-speech": WebwriterSpeech;
	}
}

type LiveTranscription = { result: Promise<string>; stop(): void; abort(): void };
type Capture = {
	authoring: boolean;
	referenceAtStart: string;
	transcription?: LiveTranscription;
};

const recognitionTimeout = 8_000;

function comparableSpeech(text: string) {
	return text.normalize("NFC").replace(/\p{P}+/gu, " ");
}

registerQuizType({
	packageId,
	widgetPosition: 80,
	section: "speak",
	id: "webwriter-speech",
	getName: (locale, translate = messageFor(locale)) => translate("Voice recording"),
	icon: MicIcon,
	createInstance: () => document.createElement("webwriter-speech"),
});

/**
 * An answer where learners record a spoken response.
 */
@customElement("webwriter-speech")
export class WebwriterSpeech extends WebwriterTask {
	static styles = [WebwriterTask.styles, recordingLanguageStyles, css`
		:host {
			display: block;
			width: 100%;
		}

		/* The recorder and the player sit in one rounded bar. */
		.answer-control {
			box-sizing: border-box;
			inline-size: 100%;
			min-inline-size: 0;
			padding: var(--sl-spacing-2x-small) var(--sl-spacing-small) var(--sl-spacing-2x-small) var(--sl-spacing-2x-small);
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-pill);
			background: var(--sl-color-neutral-0);
		}

		@media print {
			.answer-control {
				display: none;
			}
		}

		.solution-comparison {
			margin-top: var(--sl-spacing-small);
			padding: var(--sl-spacing-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
		}

		.solution-title {
			margin-bottom: var(--sl-spacing-x-small);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
			color: var(--sl-color-neutral-700);
		}

		.speech-response {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: var(--sl-spacing-x-small);
		}

		.task-helper {
			min-block-size: var(--sl-input-height-small);
		}

		.recording-language {
			inline-size: min(10rem, 38cqi);
		}

		.transcript-panel {
			box-sizing: border-box;
			inline-size: min(24rem, calc(100vw - 1rem));
			max-block-size: var(--popup-space, 70vh);
			overflow: auto;
			display: grid;
			gap: var(--sl-spacing-x-small);
			padding: var(--sl-spacing-small);
			border: 1px solid var(--quiz-card-border);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
		}

		.transcript-panel textarea {
			box-sizing: border-box;
			inline-size: 100%;
			padding: var(--sl-spacing-x-small);
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-input-border-radius-medium);
			font: inherit;
			color: inherit;
			background: var(--sl-input-background-color, Canvas);
		}

		.transcript-value {
			color: var(--sl-color-success-700);
			white-space: pre-wrap;
		}

		.speech-progress {
			min-inline-size: 0;
			margin-inline-start: auto;
			color: var(--quiz-muted);
			font-size: var(--sl-font-size-small);
			text-align: end;
		}

		.speech-status:empty, .speech-progress:empty { position: absolute; }
		.speech-status[data-error] { color: var(--ww-danger, var(--sl-color-danger-700)); }
	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		"audio-recorder": AudioRecorder,
		"audio-player": AudioPlayer,
		"ww-language-picker": RecordingLanguagePicker,
	};

	static options = {
		...WebwriterTask.options,
		required: {
			type: "boolean",
			label: (widget: WebwriterSpeech) => widget.msg("Require a recording before submitting"),
		},
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "transcript",
					label: (widget: { msg: MsgFn }) => widget.msg("Match transcript"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the spoken words match the reference transcript."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Partial credit"),
					description: (widget: { msg: MsgFn }) => widget.msg("Give credit word by word, with deductions for missing, extra, or changed words."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Shows the optional sample for comparison without scoring."),
				},
			],
		},
	};

	static gradingOptions = ["points", "gradingMethod"];

	/** Language used for speech recognition. Defaults to the task's language. */
	@property({ type: String, attribute: "speech-language", reflect: true, useDefault: true })
	accessor speechLanguage = "";

	/** Text expected from the learner, saved with the reference recording. */
	@property({ type: String, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor transcript = "";

	@property({ type: Boolean, reflect: true, useDefault: true })
	accessor required = false;

	/** An existing learner recording URL supplied by the document. */
	@property({ type: String, reflect: true })
	accessor src: string | null = null;

	/** Optional reference recording authored in edit mode. */
	@property({ type: String, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution = "";

	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: "transcript" | "partial" | "ungraded" | "self-assess" = "transcript";

	@state() private accessor recording: string | null | undefined;
	@state() private accessor graded = false;
	@state() private accessor capture: Capture | undefined;
	@state() private accessor saving = false;
	@state() private accessor recognizedAnswer = "";
	@state() private accessor recognitionError = "";
	@state() private accessor revealTranscript = false;

	private transcriptPopup = new TopLayerPopup(this, () => ({
		trigger: this.shadowRoot?.querySelector<HTMLElement>(".transcript-trigger"),
		panel: this.shadowRoot?.querySelector<HTMLElement>(".transcript-popup"),
		keep: this.shadowRoot?.querySelector<HTMLElement>(".transcript-control"),
		scrollArea: this.shadowRoot?.querySelector<HTMLElement>(".transcript-panel"),
	}), {
		align: "end",
		followFocus: false,
		onShow: () => this.shadowRoot?.querySelector<HTMLTextAreaElement>("#speech-transcript")?.focus(),
		onHide: () => this.saveTranscript(),
	});

	private get autoGraded() {
		return this.gradingMethod === "transcript" || this.gradingMethod === "partial";
	}

	private get recognitionType() {
		return speechRecognition(this.ownerDocument.defaultView);
	}

	private get language() {
		return this.speechLanguage.trim() || inheritedRecordingLanguage(this);
	}

	private get activeSource() {
		if (this.editing) return this.solution || null;
		return this.recording === undefined ? this.src : this.recording;
	}

	checkAnswer(detailedFeedback = false): number {
		this.graded = true;
		this.revealTranscript = detailedFeedback;
		const expected = comparableSpeech(this.transcript ?? "").trim();
		if (!expected || this.capture || !this.recognitionType || (this.activeSource && !this.recognizedAnswer)) return Number.NaN;
		const answer = comparableSpeech(this.recognizedAnswer);
		return this.gradingMethod === "partial"
			? scoreDictation(answer, expected, { ignoreCase: true }, this.language)
			: Number(matchText(answer, [expected], { ignoreCase: true }));
	}

	checkValidity(): boolean {
		return !this.capture && (!this.required || Boolean(this.activeSource));
	}

	protected override get canCheckAnswer() {
		return !this.capture && (this.editing || !this.autoGraded || Boolean(this.recognitionType));
	}

	private recognitionMessage(code: string) {
		switch (code) {
			case "unsupported": return this.msg("Speech recognition is not supported in this browser.");
			case "not-allowed": return this.msg("Microphone access was denied.");
			case "audio-capture": return this.msg("The microphone is unavailable.");
			case "network": return this.msg("Speech recognition could not connect. Try again.");
			case "language-not-supported": return this.msg("Speech recognition does not support this language.");
			case "service-not-allowed": return this.msg("The browser's speech recognition service is unavailable.");
			case "no-speech": return this.msg("No speech was recognized. Try again.");
			case "timeout": return this.msg("Speech recognition timed out.");
			default: return this.msg("Speech recognition could not finish. Try again.");
		}
	}

	private transcribe(capture: Capture, stream: MediaStream): LiveTranscription | undefined {
		const Recognition = this.recognitionType;
		if (!Recognition) {
			this.recognitionError = "unsupported";
			return;
		}

		let recognition;
		try {
			recognition = new Recognition();
		} catch {
			this.recognitionError = "start-failed";
			return;
		}

		let transcript = "";
		let settled = false;
		let timer: number | undefined;
		let resolve!: (value: string) => void;
		const result = new Promise<string>(complete => { resolve = complete; });
		const finish = (value: string, error?: string) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			recognition.onresult = recognition.onerror = recognition.onend = null;
			if (this.capture === capture && error) this.recognitionError = error;
			resolve(value);
		};
		const abort = (error?: string) => {
			if (settled) return;
			finish("", error);
			try { recognition.abort(); } catch { /* The browser may already have ended recognition. */ }
		};
		const stop = () => {
			if (settled || timer !== undefined) return;
			timer = window.setTimeout(() => abort("timeout"), recognitionTimeout);
			try {
				recognition.stop();
			} catch {
				abort("start-failed");
			}
		};

		recognition.lang = this.language;
		recognition.continuous = true;
		recognition.onresult = event => { transcript = finalTranscript(event.results); };
		recognition.onerror = event => finish("", event.error);
		recognition.onend = () => finish(transcript, transcript ? undefined : "no-speech");
		try {
			const track = stream.getAudioTracks()[0];
			if (track && supportsRecognitionTrack(this.ownerDocument.defaultView)) recognition.start(track);
			else recognition.start();
		} catch (error) {
			finish("", error instanceof DOMException && error.name === "NotAllowedError" ? "not-allowed" : "start-failed");
		}
		return { result, stop, abort };
	}

	private newCapture(): Capture {
		return { authoring: this.editing, referenceAtStart: this.transcript };
	}

	private startCapture(event: CustomEvent<{ stream: MediaStream }>) {
		if (!this.isConnected || this.capture || (!this.editing && this.graded)) return;
		this.recognitionError = "";
		this.recognizedAnswer = "";
		this.transcriptPopup.hide();
		const capture = this.newCapture();
		this.capture = capture;
		if (capture.authoring || this.autoGraded) capture.transcription = this.transcribe(capture, event.detail.stream);
	}

	private stopCapture() {
		this.capture?.transcription?.stop();
	}

	private cancelCapture() {
		const capture = this.capture;
		this.capture = undefined;
		this.saving = false;
		capture?.transcription?.abort();
	}

	private blobToDataUrl(blob: Blob): Promise<string | null> {
		return new Promise(resolve => {
			const reader = new FileReader();
			reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
			reader.onerror = reader.onabort = () => resolve(null);
			reader.readAsDataURL(blob);
		});
	}

	private async saveCapture(event: CustomEvent<{ audioBlob: Blob }>) {
		const blob = event.detail.audioBlob;
		if (!this.isConnected || !(blob instanceof Blob) || (!this.editing && this.graded)) return;
		const capture = this.capture ?? this.newCapture();
		if (!blob.size) {
			this.cancelCapture();
			return;
		}
		this.capture = capture;
		this.saving = true;
		capture.transcription?.stop();
		const [dataUrl, transcript] = await Promise.all([
			capture.authoring ? this.blobToDataUrl(blob).catch(() => null) : null,
			capture.transcription?.result ?? "",
		]);
		if (this.capture !== capture || !this.isConnected || capture.authoring !== this.editing) return;

		this.capture = undefined;
		this.saving = false;
		if (capture.authoring) {
			if (!dataUrl) {
				this.recognitionError = "save-failed";
				return;
			}
			transaction(this, () => {
				this.solution = dataUrl;
				if (transcript && this.transcript === capture.referenceAtStart) this.transcript = transcript;
			});
		} else if (!this.graded) {
			this.discardRecording();
			this.recording = URL.createObjectURL(blob);
			this.recognizedAnswer = transcript;
			this.showRequiredWarning(false);
		}
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (changed.has("speechLanguage") || changed.has("editable") || changed.has("gradingMethod")) {
			this.cancelCapture();
			this.recognitionError = "";
			this.renderRoot.querySelector<AudioRecorder>("audio-recorder")?.cancelRecording();
			if (!this.editing) this.transcriptPopup.hide();
		}
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	private discardRecording() {
		if (this.recording) URL.revokeObjectURL(this.recording);
		this.recording = undefined;
	}

	disconnectedCallback() {
		this.cancelCapture();
		this.discardRecording();
		super.disconnectedCallback();
	}

	reset() {
		this.graded = false;
		this.cancelCapture();
		this.recognizedAnswer = "";
		this.recognitionError = "";
		this.revealTranscript = false;
		this.renderRoot?.querySelector<AudioRecorder>("audio-recorder")?.cancelRecording();
		this.discardRecording();
		this.recording = null;
	}

	override showScore(score: number | undefined, submitted = score !== undefined) {
		super.showScore(score, submitted);
		if (!this.editing) this.graded = submitted;
	}

	private transcriptControls() {
		return html`
			<ww-language-picker class="recording-language edit-only" label=${this.msg("Recording language")} .value=${live(this.speechLanguage)}
				placeholder=${recordingLanguageName(inheritedRecordingLanguage(this), this.localize.getLocale())}
				.disabled=${Boolean(this.capture)} @change=${(event: Event) => {
					const language = (event.currentTarget as RecordingLanguagePicker).value;
					if (this.editing && !this.capture && language !== this.speechLanguage) {
						transaction(this, () => { this.speechLanguage = language; });
					}
				}}></ww-language-picker>
			<div class="transcript-control">
				<sl-button class="transcript-trigger edit-only" size="small" aria-haspopup="dialog" aria-expanded=${this.transcriptPopup.open}
					?disabled=${Boolean(this.capture)}
				aria-controls="transcript-popup" @click=${() => this.transcriptPopup.toggle()}>${this.msg("Transcript")}</sl-button>
				<div id="transcript-popup" class="top-layer transcript-popup" popover="manual" role="dialog" aria-label=${this.msg("Solution transcript")}>
					<div class="transcript-panel">
						<label for="speech-transcript">${this.msg("Solution transcript")}</label>
						<textarea id="speech-transcript" rows="3" .value=${this.transcript ?? ""} @change=${this.saveTranscript}></textarea>
					</div>
				</div>
			</div>`;
	}

	private saveTranscript() {
		const field = this.shadowRoot?.querySelector<HTMLTextAreaElement>("#speech-transcript");
		if (this.isConnected && this.editing && field && field.value !== this.transcript) {
			transaction(this, () => { this.transcript = field.value; });
		}
	}

	protected renderAnswer() {
		const editing = this.editing;
		const source = this.activeSource;
		const locked = !editing && this.graded;
		const hint = editing ? this.msg("Record the solution or enter its transcript.")
			: this.msg("Record your answer.");
		const canTranscribe = editing || this.autoGraded;
		const error = this.recognitionError === "save-failed" ? this.msg("The recording could not be saved.")
			: this.recognitionError ? this.recognitionMessage(this.recognitionError)
			: canTranscribe && !this.recognitionType ? this.recognitionMessage("unsupported") : "";
		const status = error || (!editing && this.recognizedAnswer ? this.msg(str`Recognized answer: ${this.recognizedAnswer}`) : "");
		const progress = this.saving ? this.msg("Finishing recording…")
			: this.capture?.transcription && !error ? this.msg("Transcribing speech…") : "";
		return html`<p class="print-note">${this.msg("Interactive content: open the document online")}</p>
			<div class="speech-response">
				${this.HelperRow(hint, this.transcriptControls())}
				<div role="status" class="speech-status" ?data-error=${Boolean(error)}>${status}</div>
				${!source ? html`<audio-recorder class="answer-control" .disabled=${locked || this.saving}
					.allowPause=${!canTranscribe || !this.recognitionType}
					.finishing=${this.saving}
					@recording-started=${this.startCapture}
					@recording-stopping=${this.stopCapture}
					@recording-cancelled=${this.cancelCapture}
					@recording-complete=${this.saveCapture}>
					<span slot="progress" class="speech-progress" role="status">${progress}</span>
				</audio-recorder>`
					: html`<audio-player class="answer-control" .src=${source} .allowDelete=${!locked}
						@delete-recording=${() => {
							if (editing) transaction(this, () => { this.solution = ""; });
							else if (!this.graded) this.reset();
						}}></audio-player>`}
				${!editing && this.graded && (this.solution || (this.revealTranscript && this.transcript))
					? html`<div class="solution-comparison">
						<div class="solution-title">${this.msg("Solution")}</div>
						${this.solution ? html`<audio-player class="answer-control solution-player" .src=${this.solution}
							.allowDelete=${false}></audio-player>` : nothing}
						${this.revealTranscript && this.transcript ? html`<div class="transcript-value">${this.transcript}</div>` : nothing}
					</div>` : nothing}
			</div>`;
	}
}
