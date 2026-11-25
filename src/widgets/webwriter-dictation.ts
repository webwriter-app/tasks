import { str, type MsgFn } from "@lit/localize";
import HeadphonesIcon from "../icons/dictation.svg";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { live } from "lit/directives/live.js";
import { name as packageId } from "../../package.json";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { inheritedRecordingLanguage, recordingLanguageName, RecordingLanguagePicker, recordingLanguageStyles } from "../components/recording-language-picker";
import { messageFor } from "../components/localization";
import { finalTranscript, speechRecognition, supportsRecognitionTrack, type SpeechRecognizer } from "../components/speech-recognition";
import { selfAssessmentOption } from "../components/rubric-popover";
import { WebwriterTask, textToleranceOptions } from "../components/webwriter-task";
import { registerQuizType } from "../model/quiz-api";
import { scoreDictation } from "../model/scoring";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-dictation": WebwriterDictation;
	}
}

const transcriptionIdleTimeout = 15_000;

function createRecording(doc: Document) {
	const audio = doc.createElement("audio");
	audio.controls = true;
	audio.preload = "none";
	return audio;
}

function hasSource(audio?: HTMLAudioElement) {
	return Boolean(audio?.getAttribute("src")?.trim() || (audio && recordingSources(audio).length));
}

function recordingSources(audio: HTMLAudioElement) {
	return [...audio.querySelectorAll(":scope > source[src]")].flatMap(source => {
		const src = source.getAttribute("src")?.trim();
		return src ? [{ src, type: source.getAttribute("type"), media: source.getAttribute("media") }] : [];
	});
}

registerQuizType({
	packageId,
	widgetPosition: 45,
	section: "write",
	id: "webwriter-dictation",
	getName: (locale, translate = messageFor(locale)) => translate("Dictation"),
	icon: HeadphonesIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-dictation");
		task.append(createRecording(document));
		return task;
	},
});

/** An audio prompt with a typed transcription, and an optional slower recording. */
@customElement("webwriter-dictation")
export class WebwriterDictation extends WebwriterTask {
	static shadowRootOptions: ShadowRootInit = { ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" };
	static scopedElements = { ...WebwriterTask.scopedElements, "ww-language-picker": RecordingLanguagePicker };

	static styles = [WebwriterTask.styles, recordingLanguageStyles, css`
		.dictation-response {
			display: grid;
			gap: var(--sl-spacing-x-small);
		}

		.recordings {
			display: grid;
			gap: var(--sl-spacing-x-small);
			min-inline-size: 0;
		}

		.recording {
			display: grid;
			min-inline-size: 0;
			gap: var(--sl-spacing-2x-small);
		}

		slot::slotted(audio), .recording audio {
			display: block;
			inline-size: 100%;
			max-inline-size: 100%;
		}

		.dictation-entry {
			box-sizing: border-box;
			display: block;
			inline-size: 100%;
			padding: var(--sl-spacing-x-small);
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-input-border-radius-medium);
			background: var(--sl-input-background-color, Canvas);
			color: inherit;
			font: inherit;
			line-height: 1.5;
		}

		.dictation-status:empty { position: absolute; }
		.dictation-status, .plays-left {
			color: var(--quiz-muted);
			font-size: var(--sl-font-size-small);
		}
		.dictation-solution {
			color: var(--sl-color-success-700);
			white-space: pre-wrap;
		}

		@media print {
			.recordings, .dictation-status { display: none; }
		}
	`];

	static options = {
		...WebwriterTask.options,
		ignoreCase: textToleranceOptions.ignoreCase,
		ignorePunctuation: { type: "boolean", label: (task: { msg: MsgFn }) => task.msg("Ignore punctuation") },
		allowTypos: { type: "boolean", label: (task: { msg: MsgFn }) => task.msg("Give partial credit for minor typos") },
		gradingMethod: {
			type: "select",
			label: (task: { msg: MsgFn }) => task.msg("Grading Method"),
			options: [
				{ value: "pass-fail", label: (task: { msg: MsgFn }) => task.msg("All or nothing") },
				{ value: "partial", label: (task: { msg: MsgFn }) => task.msg("Partial credit") },
				selfAssessmentOption,
				{ value: "ungraded", label: (task: { msg: MsgFn }) => task.msg("Ungraded") },
			],
		},
	};
	static gradingOptions = ["points", "gradingMethod"];

	/** Expected transcript, saved as an obfuscated attribute. */
	@property({ type: String, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor transcript = "";

	/** Maximum number of plays per recording. Zero allows unlimited playback. */
	@property({ type: Number, attribute: "play-limit", reflect: true, useDefault: true })
	accessor playLimit = 0;

	@property({ type: Boolean, attribute: "ignore-case", reflect: true, useDefault: true })
	accessor ignoreCase = false;

	@property({ type: Boolean, attribute: "ignore-punctuation", reflect: true, useDefault: true })
	accessor ignorePunctuation = false;

	@property({ type: Boolean, attribute: "allow-typos", reflect: true, useDefault: true })
	accessor allowTypos = false;

	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: "partial" | "pass-fail" | "self-assess" | "ungraded" = "partial";

	@state() private accessor answer = "";
	@state() private accessor graded = false;
	@state() private accessor revealTranscript = false;
	@state() private accessor playbackError = false;
	@state() private accessor transcription: { cancel(): void } | undefined;
	@state() private accessor transcriptionError = "";
	private plays = new Map<HTMLAudioElement, number>();
	private startedPlays = new Set<HTMLAudioElement>();
	private playback?: HTMLAudioElement;
	private audioObserver?: MutationObserver;

	private get recordings(): { audio?: HTMLAudioElement; slow?: HTMLAudioElement } {
		const children = Array.from(this.querySelectorAll<HTMLAudioElement>(":scope > audio"));
		const slow = children.find(audio => audio.slot === "slow") ?? children[1];
		return { audio: children.find(audio => audio !== slow), slow };
	}

	protected override get canAddOption() {
		return !this.recordings.audio;
	}

	protected override get addOptionLabel() {
		return this.msg("Add recording");
	}

	protected override addOption() {
		if (!this.isConnected || !this.editing || !this.canAddOption) return;
		const audio = createRecording(this.ownerDocument);
		transaction(this, () => {
			this.insertBefore(audio, this.feedbackElement);
			this.requestUpdate();
		});
	}

	private get maxPlays() {
		return Number.isFinite(this.playLimit) && this.playLimit > 0 ? Math.floor(this.playLimit) : 0;
	}

	private get inheritedRecordingLanguage() {
		return inheritedRecordingLanguage(this);
	}

	private stopPlayback() {
		const audio = this.playback;
		this.playback = undefined;
		audio?.pause();
	}

	private startPlayback(recording: HTMLAudioElement, player: HTMLAudioElement) {
		if (!this.isConnected || this.editing || recording.parentElement !== this
			|| (this.maxPlays && !this.startedPlays.has(recording) && (this.plays.get(recording) ?? 0) >= this.maxPlays)) {
			player.pause();
			return;
		}
		if (this.playback !== player) this.stopPlayback();
		this.playback = player;
		this.playbackError = false;
	}

	private countPlayback(recording: HTMLAudioElement, player: HTMLAudioElement) {
		if (this.playback !== player || this.editing || this.startedPlays.has(recording)) return;
		this.startedPlays.add(recording);
		this.plays.set(recording, (this.plays.get(recording) ?? 0) + 1);
		this.requestUpdate();
	}

	private finishPlayback(recording: HTMLAudioElement, event: Event) {
		this.startedPlays.delete(recording);
		if (event.currentTarget !== this.playback) return;
		this.playback = undefined;
		if (event.type === "error") this.playbackError = true;
	}

	private toggleTranscription() {
		const source = this.recordings.audio;
		if (!this.isConnected || !this.editing || !source || !hasSource(source)) return;
		if (this.transcription) {
			this.transcription.cancel();
			return;
		}

		const view = this.ownerDocument.defaultView;
		const Recognition = supportsRecognitionTrack(view) ? speechRecognition(view) : undefined;
		const audio = this.ownerDocument.createElement("audio") as HTMLAudioElement & { captureStream?(): MediaStream };
		if (!Recognition || !audio.captureStream) {
			this.transcriptionError = this.msg("This browser cannot transcribe recordings automatically.");
			return;
		}

		// Use detached, muted playback so the author's audio controls stay independent.
		audio.muted = true;
		const crossOrigin = source.getAttribute("crossorigin");
		if (crossOrigin !== null) audio.setAttribute("crossorigin", crossOrigin);
		const src = source.getAttribute("src");
		if (src?.trim()) audio.src = src;
		else {
			for (const { src, type, media } of recordingSources(source)) {
				const candidate = this.ownerDocument.createElement("source");
				candidate.src = src;
				if (type !== null) candidate.type = type;
				if (media !== null) candidate.media = media;
				audio.append(candidate);
			}
		}

		const listeners = new AbortController();
		const { signal } = listeners;
		const originalTranscript = this.transcript;
		let recognition: SpeechRecognizer | undefined;
		let stream: MediaStream | undefined;
		let transcript = "";
		let idleTimer: number | undefined;
		const cleanup = () => {
			this.transcription = undefined;
			listeners.abort();
			window.clearTimeout(idleTimer);
			if (recognition) {
				recognition.onresult = recognition.onerror = recognition.onend = null;
			}
			audio.pause();
			stream?.getTracks().forEach(track => track.stop());
			audio.removeAttribute("src");
			audio.replaceChildren();
			audio.load();
		};
		const cancel = () => {
			cleanup();
			recognition?.abort();
		};
		const fail = (message: string) => {
			if (signal.aborted) return;
			this.transcriptionError = message;
			cancel();
		};
		const audioError = this.msg("The recording could not be played for transcription.");
		const serviceError = this.msg("Automatic transcription could not finish. Try again.");
		const noSpeech = this.msg("No speech was recognized in the recording.");
		const restartIdleTimer = () => {
			window.clearTimeout(idleTimer);
			idleTimer = window.setTimeout(() => fail(this.msg("Automatic transcription timed out. Try again.")), transcriptionIdleTimeout);
		};

		this.transcriptionError = "";
		this.transcription = { cancel };
		audio.addEventListener("error", () => fail(audioError), { signal });
		audio.lastElementChild?.addEventListener("error", () => fail(audioError), { signal });
		audio.addEventListener("timeupdate", () => {
			if (!audio.ended) restartIdleTimer();
		}, { signal });
		audio.addEventListener("ended", () => {
			restartIdleTimer();
			recognition?.stop();
		}, { signal });
		audio.addEventListener("canplay", () => {
			try {
				stream = audio.captureStream!();
				const track = stream.getAudioTracks()[0];
				if (!track || track.readyState !== "live") {
					fail(audioError);
					return;
				}

				recognition = new Recognition();
				recognition.lang = source.lang.trim() || this.inheritedRecordingLanguage;
				recognition.continuous = true;
				recognition.onresult = event => {
					transcript = finalTranscript(event.results);
				};
				recognition.onerror = event => fail(event.error === "no-speech" ? noSpeech : serviceError);
				recognition.onend = () => {
					if (signal.aborted) return;
					const finished = audio.ended;
					cleanup();
					if (!this.isConnected || !this.editing || this.recordings.audio !== source || this.transcript !== originalTranscript) return;
					if (!finished || !transcript) this.transcriptionError = finished ? noSpeech : serviceError;
					else if (transcript !== this.transcript) transaction(this, () => { this.transcript = transcript; });
				};
				recognition.start(track);
				// Chromium can wait for audio from the track before firing "start".
				if (!signal.aborted) {
					restartIdleTimer();
					void audio.play().catch(() => fail(audioError));
				}
			} catch {
				fail(serviceError);
			}
		}, { once: true, signal });
		restartIdleTimer();
		audio.load();
	}

	override connectedCallback() {
		super.connectedCallback();
		this.audioObserver = new MutationObserver(records => {
			const changes = records.filter(record => record.target instanceof Element && record.target.closest("audio")
				|| [...record.addedNodes, ...record.removedNodes].some(node => node instanceof HTMLAudioElement));
			if (!changes.length) return;
			this.transcription?.cancel();
			this.transcriptionError = "";
			if (changes.some(change => change.attributeName !== "lang")) {
				this.stopPlayback();
				this.plays.clear();
				this.startedPlays.clear();
				this.playbackError = false;
			}
			this.requestUpdate();
		});
		this.audioObserver.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "slot", "crossorigin", "type", "media", "lang"] });
	}

	override disconnectedCallback() {
		this.transcription?.cancel();
		this.pauseRecordings();
		this.audioObserver?.disconnect();
		this.audioObserver = undefined;
		super.disconnectedCallback();
	}

	protected override firstUpdated(changed: PropertyValues) {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected override updated(changed: PropertyValues) {
		super.updated(changed);
		if (changed.has("editable")) {
			this.pauseRecordings();
			this.startedPlays.clear();
		}
		if (!this.editing || changed.has("transcript")) this.transcription?.cancel();
		if (!this.editing) this.transcriptionError = "";
		const { audio, slow } = this.recordings;
		for (const [name, node] of [["recording", audio], ["slow-recording", slow]] as const) {
			const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
			if (slot && slot.assignedElements()[0] !== node) slot.assign(...(node ? [node] : []));
		}
	}

	checkValidity() {
		return !hasSource(this.recordings.audio) || !this.transcript?.trim() || Boolean(this.answer.trim());
	}

	checkAnswer(detailedFeedback = false) {
		this.graded = true;
		if (!hasSource(this.recordings.audio) || !this.transcript?.trim()) return Number.NaN;
		this.revealTranscript = detailedFeedback;
		const score = scoreDictation(this.answer, this.transcript, this, this.closest<HTMLElement>("[lang]")?.lang);
		return this.gradingMethod === "pass-fail" ? Number(score === 1) : score;
	}

	override showScore(score: number | undefined, submitted = score !== undefined) {
		super.showScore(score, submitted);
		if (!this.editing) this.graded = submitted;
	}

	private pauseRecordings() {
		this.stopPlayback();
		const { audio, slow } = this.recordings;
		audio?.pause();
		slow?.pause();
	}

	reset() {
		this.transcription?.cancel();
		this.transcriptionError = "";
		this.pauseRecordings();
		this.plays.clear();
		this.startedPlays.clear();
		for (const audio of this.renderRoot?.querySelectorAll("audio") ?? []) audio.currentTime = 0;
		this.playbackError = false;
		this.answer = "";
		this.graded = false;
		this.revealTranscript = false;
	}

	private Player(recording: HTMLAudioElement, slow = false) {
		const src = recording.getAttribute("src")?.trim();
		const sources = src ? [] : recordingSources(recording);
		const crossOrigin = recording.getAttribute("crossorigin");
		const limit = this.maxPlays;
		const remaining = Math.max(0, limit - (this.plays.get(recording) ?? 0));
		const label = slow ? this.msg("Slow recording") : this.msg("Dictation recording");
		const counterId = slow ? "slow-plays-left" : "plays-left";
		return html`<div class="recording">
			${slow ? html`<span>${label}</span>` : nothing}
			${keyed(JSON.stringify([src, sources, crossOrigin]), html`<audio controls preload="none"
				aria-label=${label} aria-describedby=${limit ? counterId : nothing} lang=${recording.lang || nothing}
				crossorigin=${crossOrigin ?? nothing} src=${src || nothing}
				@play=${(event: Event) => this.startPlayback(recording, event.currentTarget as HTMLAudioElement)}
				@playing=${(event: Event) => this.countPlayback(recording, event.currentTarget as HTMLAudioElement)}
				@ended=${(event: Event) => this.finishPlayback(recording, event)}
				@error=${(event: Event) => this.finishPlayback(recording, event)}>
				${sources.map(({ src, type, media }) => html`<source src=${src} type=${type ?? nothing} media=${media ?? nothing}>`)}
			</audio>`)}
			${limit ? html`<span class="plays-left" id=${counterId}>${remaining === 1 ? this.msg("1 play left") : this.msg(str`${remaining} plays left`)}</span>` : nothing}
		</div>`;
	}

	private setRecordingLanguage(recording: HTMLAudioElement, event: Event) {
		if (!this.isConnected || !this.editing || this.recordings.audio !== recording) return;
		const lang = (event.currentTarget as RecordingLanguagePicker).value || null;
		if (recording.getAttribute("lang") === lang) return;
		transaction(this, () => {
			if (lang === null) recording.removeAttribute("lang");
			else recording.lang = lang;
		});
	}

	protected renderAnswer() {
		const { audio, slow } = this.recordings;
		const editing = this.editing;
		const label = editing ? this.msg("Solution transcript") : this.msg("Type what you hear");
		const helper = editing ? this.msg("Add audio and enter the solution transcript.")
			: hasSource(audio) ? this.msg("Listen and type what you hear.") : this.msg("No recording available.");
		const status = editing
			? this.transcription ? this.msg("Transcribing recording…") : this.transcriptionError
			: this.playbackError ? this.msg("The recording could not be played.") : "";
		return html`<div class="dictation-response">
			${this.HelperRow(helper, html`
				${this.renderTolerance()}
				${audio ? html`<ww-language-picker class="recording-language edit-only" label=${this.msg("Recording language")}
					placeholder=${recordingLanguageName(this.inheritedRecordingLanguage, this.localize.getLocale())} .value=${live(audio.lang)}
					@change=${(event: Event) => this.setRecordingLanguage(audio, event)}></ww-language-picker>` : nothing}
				<sl-button class="transcribe edit-only" size="small" ?disabled=${!hasSource(audio)} @click=${this.toggleTranscription}>
					${this.transcription ? this.msg("Cancel transcription") : this.msg("Transcribe")}
				</sl-button>
			`, "dictation-helper")}
			<div class="dictation-status" role="status">${status}</div>
			<div class="recordings">
				${editing ? html`
					${audio ? html`<div class="recording"><slot name="recording"></slot></div>` : nothing}
					${slow ? html`<div class="recording"><span>${this.msg("Slow recording")}</span><slot name="slow-recording"></slot></div>` : nothing}`
				: html`
					${audio && hasSource(audio) ? this.Player(audio) : nothing}
					${slow && hasSource(slow) ? this.Player(slow, true) : nothing}`}
			</div>
			<textarea class="dictation-entry" rows="2" aria-label=${label} aria-describedby="dictation-helper"
				placeholder=${editing ? label : nothing} .value=${live(editing ? this.transcript ?? "" : this.answer)}
				autocapitalize="off" autocomplete="off" spellcheck="false" ?disabled=${!editing && this.graded}
				?readonly=${Boolean(this.transcription)}
				@input=${(event: Event) => {
					if (this.editing || this.graded) return;
					this.answer = (event.currentTarget as HTMLTextAreaElement).value;
					if (this.answer.trim()) this.showRequiredWarning(false);
				}}
				@change=${(event: Event) => {
					if (!this.isConnected || !this.editing) return;
					const value = (event.currentTarget as HTMLTextAreaElement).value;
					this.transcriptionError = "";
					if (value !== this.transcript) transaction(this, () => { this.transcript = value; });
				}}></textarea>
			${!editing && this.graded && this.revealTranscript && this.transcript?.trim()
				? html`<div><strong>${this.msg("Solution transcript")}</strong><div class="dictation-solution">${this.transcript}</div></div>`
				: nothing}
		</div>`;
	}
}
