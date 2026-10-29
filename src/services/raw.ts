import { ApiElement, ApiMood, ApiSoundset, ApiStatus } from '@/models';
import type { FVTTGame } from './game';
import { Utils } from './utils';
import { inject, singleton } from 'tsyringe';
import { SocketCalls } from '@/socket';
// import { AudioContext } from '@lib/headlessPlayer.39eb2733bd1782ae3719';

export type PlayerState = 'active' | 'inactive';

export interface RawApi {
	onInit(): Promise<void>;

	getState(): PlayerState;
	changePlayerVolume(volume: number): void;
	changeMoodVolume(volume: number): void;
	changeOneShotVolume(volume: number): void;
	playerJoined(name: string): string | null;

	stopMood(): Promise<void>;
	playMood(id: number): Promise<void>;
	playElement(id: number): Promise<void>;
	stopElement(id: number): Promise<void>;
	getMood(moodId: number): Promise<ApiMood | undefined>;
	getMoods(soundsetId: string): Promise<ApiMood[]>;
	getElements(soundsetId: string): Promise<ApiElement[]>;
	getSoundsets(): Promise<ApiSoundset[]>;
	getGlobalElements(): Promise<ApiElement[]>;
}

// Syrinscape throttles bursts of requests (e.g. importing many soundsets) with a `429` that has no CORS headers,
// so the browser reports it as a CORS failure and the fetch rejects with a `TypeError` instead of a response.
export const MAX_CONCURRENT_REQUESTS = 2;
export const RETRY_DELAYS_MS = [5_000, 15_000, 60_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PlayerJoinedCallback = (name: string) => string | null;
type UnauthorisedCallback<T> = () => T;

@singleton()
export class RawApiImpl implements RawApi {
	wasInitialized: boolean = false;
	playerState: PlayerState = 'inactive';
	playerJoinedCallback: PlayerJoinedCallback | undefined;
	activeRequests: number = 0;
	waitingRequests: (() => void)[] = [];
	constructor(
		@inject('FVTTGame')
		private readonly game: FVTTGame,
		private readonly utils: Utils
	) {}
	async onInit(): Promise<void> {
		if (this.wasInitialized) {
			return;
		}
		this.wasInitialized = true;
		const { game, utils } = this;
		const raw = this;
		const audioContext = await game.getAudioContext();
		if (audioContext === undefined) {
			return;
		}

		return new Promise((resolve) => {
			syrinscape.player.init({
				async configure() {
					// utils.trace("RAW Headless | Syrinscape | audio context", (audioContext === undefined), { audioContext });
					syrinscape.log.getLogger('audioSystem').setLevel('error');
					syrinscape.log.getLogger('sampleSpawnSystem').setLevel('error');
					syrinscape.log.getLogger('elementSpawnSystem').setLevel('error');
					syrinscape.log.getLogger('audioEffectSystem').setLevel('error');
					syrinscape.config.audioContext = audioContext;

					if (game.isGM()) {
						syrinscape.config.token = utils.getAuth();
						raw.playerJoinedCallback = (name: string) => {
							utils.info(`Player ${name} joined`);
							return syrinscape.config.sessionId;
						};
					} else {
						utils.info('Waiting for session...');
						const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
						const backoff = [100, 500, 1 * 1000];
						let i = 0;
						while (true) {
							try {
								const newSessionId = await game.socket?.executeAsGM(
									SocketCalls.PlayerJoined,
									game.getPlayerName()
								);
								if (newSessionId === null || newSessionId === undefined) {
									throw new String('Session not found');
								}
								syrinscape.config.sessionId = newSessionId;
								break;
							} catch (err) {
								utils.error(err);
								let ms = backoff[i];
								if (i < backoff.length - 1) {
									i++;
								}
								await sleep(ms);

								continue;
							}
						}
						// syrinscape.config.sessionId = utils.getSessionId();
					}

					syrinscape.config.deviceName = game.getPlayerName();
					utils.info('Connecting to the session ', syrinscape.config.sessionId);
					// utils.trace("RAW Headless | Syrinscape | Init Configure", { syrinscape });

					// if (game.isGM()) {
					// 	syrinscape.player.syncSystem.events.onChangeMood.addListener(async (event) => {
					// 		utils.trace('RAW Headless | Syrinscape | On Change mood', { event });
					// 		game.callHookAll('moodChange', event.pk);
					// 	});
					// 	syrinscape.player.syncSystem.events.onChangeSoundset.addListener(async (event) => {
					// 		game.callHookAll('soundsetChange', event.pk);
					// 	});
					// }
					resolve();
				},

				async onActive() {
					// utils.trace("RAW Headless | Syrinscape | On Active", { syrinscape });
					raw.playerState = 'active';
					// const gainNode = audioContext.createGain();
					// syrinscape.events.startElement.addListener((event) => {
					// 	utils.warn("RAW Headless | Syrinscape | On Element Start", { event });
					// 	const elementId = event.detail.elementId;
					// 	// const elements = syrinscape.player.elementSystem.getElementsWithElementId(elementId)
					// 	// .map(([_key, val]) => val)
					// 	// .flat();
					// 	// utils.warn("RAW Headless | Syrinscape | On Element Start | elements ", { elements });
					// 	// elements.forEach(element => {
					// 	game.callHookAll('elementStarts', elementId);
					// 	// })
					// });
					// syrinscape.events.stopElement.addListener((event) => {
					// 	utils.warn("RAW Headless | Syrinscape | On Element Stop", { event });
					// 	const elementId = event.detail.elementId;
					// 	game.callHookAll('elementStops', elementId);
					// });
				},

				async onInactive() {
					// utils.trace("RAW Headless | Syrinscape | On Inactive", { syrinscape });
					raw.playerState = 'inactive';
				}
			});
		});
	}

	playerJoined(name: string) {
		if (this.playerJoinedCallback === undefined) {
			return null;
		}
		return this.playerJoinedCallback(name);
	}

	getState(): PlayerState {
		return this.playerState;
	}

	changePlayerVolume(volume: number): void {
		// this.utils.trace("RAW Headless | Syrinscape | Change Local Volume", { volume });
		syrinscape.player.audioSystem.setLocalVolume(volume);
	}

	changeMoodVolume(volume: number): void {
		// this.utils.trace("RAW Headless | Syrinscape | Change Global Mood Volume", { volume });
		syrinscape.player.controlSystem.setGlobalVolume(volume);
	}

	changeOneShotVolume(volume: number): void {
		// this.utils.trace("RAW Headless | Syrinscape | Change Oneshot Volume", { volume });
		syrinscape.player.controlSystem.setOneshotVolume(volume);
	}

	async getCurrentlyPlaying(): Promise<ApiStatus | undefined> {
		return await this.apiCall('getCurrentlyPlaying', 'state/', () => undefined);
	}

	async stopMood(): Promise<void> {
		return await this.apiCallFF('stopMood', 'stop-all/');
	}

	async playMood(id: number): Promise<void> {
		return await this.apiCallFF('playMood', `moods/${id}/play/`);
	}

	async playElement(id: number): Promise<void> {
		return await this.apiCallFF('playMood', `elements/${id}/play/`);
	}

	async stopElement(id: number): Promise<void> {
		return await this.apiCallFF('playMood', `elements/${id}/stop/`);
	}

	async getMood(moodId: number): Promise<ApiMood | undefined> {
		return await this.apiCall('getMood', `moods/${moodId}/`, () => undefined);
	}

	async getMoods(soundsetId: string): Promise<ApiMood[]> {
		return await this.apiCall('getMoods', `moods/?soundset__uuid=${soundsetId}`, () => []);
	}

	async getElements(soundsetId: string): Promise<ApiElement[]> {
		return await this.apiCall('getElements', `elements/?soundset__uuid=${soundsetId}`, () => []);
	}

	async getSoundsets(): Promise<ApiSoundset[]> {
		return await this.apiCall('getSoundsets', `soundsets/`, () => []);
	}

	async getGlobalElements(): Promise<ApiElement[]> {
		return await this.apiCall('getGlobalElements', `global-elements/`, () => []);
	}

	async apiCall<T>(name: string, url: string, onUnauthorised: UnauthorisedCallback<T>): Promise<T> {
		const utils = this.utils;
		if (!this.game.isGM() || !utils.hasAuth()) return onUnauthorised();

		const authToken = utils.getAuth();
		const address = utils.getAddress();
		const headers = new Headers();
		headers.append('authorization', 'Token ' + authToken);

		return await this.limited(() => this.fetchWithRetry(`${address}/${url}`, { headers }))
			.then(this.handleErr)
			.then((res) => res.json())
			.catch(this.catchErr(name));
	}

	async limited<T>(request: () => Promise<T>): Promise<T> {
		if (this.activeRequests >= MAX_CONCURRENT_REQUESTS) {
			// The slot is handed over by the finishing request, so `activeRequests` stays unchanged.
			await new Promise<void>((resolve) => this.waitingRequests.push(resolve));
		} else {
			this.activeRequests++;
		}
		try {
			return await request();
		} finally {
			const next = this.waitingRequests.shift();
			if (next !== undefined) {
				next();
			} else {
				this.activeRequests--;
			}
		}
	}

	async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
		for (let attempt = 0; ; attempt++) {
			const canRetry = attempt < RETRY_DELAYS_MS.length;
			try {
				const res = await fetch(url, init);
				if (res.status !== 429 || !canRetry) {
					return res;
				}
				const retryAfter = Number(res.headers.get('retry-after'));
				await sleep(retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAYS_MS[attempt]);
			} catch (e) {
				if (!(e instanceof TypeError) || !canRetry) {
					throw e;
				}
				this.utils.trace('RAW | Request failed, retrying', { url, attempt, e });
				await sleep(RETRY_DELAYS_MS[attempt]);
			}
		}
	}

	/**
	 * Api call that does not return anything (Fire and forget)
	 * */
	async apiCallFF(name: string, url: string): Promise<void> {
		const utils = this.utils;
		if (!this.game.isGM() || !utils.hasAuth()) return;

		const authToken = utils.getAuth();
		const address = utils.getAddress();
		const headers = new Headers();
		headers.append('authorization', 'Token ' + authToken);

		await fetch(`${address}/${url}`, { headers }).catch(this.catchErr(name));
	}

	catchErr<T>(api: string): (e: any) => T[] {
		let game = this.game;
		return function <T>(e: any): T[] {
			console.error('SyrinControl | RAW | ' + api + ' | Catched error', {
				error: JSON.stringify(e)
			});
			game.notifyError('errors.apiError', { api, error: e.message });
			return [];
		};
	}

	async handleErr(res: Response): Promise<Response> {
		if (!res.ok) {
			if (res.statusText.length > 0) {
				throw Error(res.statusText);
			} else {
				let err = await res.text();
				throw Error(err);
			}
		}
		return res;
	}
}
