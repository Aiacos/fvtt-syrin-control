import { inject, singleton } from 'tsyringe';
import type { FVTTGame } from './game';
import { Stores } from './stores';
import { Utils } from './utils';
import { AmbientSound } from '@/models';
import { SocketCalls } from '@/socket';
import { Api } from './api';
import { Context } from './context';

export enum SyrinComponent {
	PlayerVolume,
	GMVolume,
	Playlist,
	Password
}

export interface LocalAmbient {
	moodId: number;
	volume: number;
}

/** How long the local volume stays faded after the ambient mood stopped: Syrinscape fades it out in a second. */
export const AMBIENT_FADE_OUT_MS = 2000;

/** A 0-100 setting to the 0-1 volume of Syrinscape. */
const toPlayer = (volume: number) =>
	Number.isFinite(volume) ? Math.min(Math.max(volume / 100, 0), 1) : 0.5;

@singleton()
export class Syrin {
	constructor(
		@inject('FVTTGame')
		private readonly game: FVTTGame,
		private readonly utils: Utils,
		private readonly api: Api,
		private readonly stores: Stores
	) {}

	renderComponent(ctx: Context, name: SyrinComponent, con: ConstructorOf<any>, target: Element) {
		// V13+ - The PlaylistDirectory hook fires on every partial render, but parts that are not re-rendered
		// keep their DOM (and the component mounted in it). A re-rendered part is a new element without the marker.
		const marker = 'data-syrin-' + SyrinComponent[name].toLowerCase();
		if (target.hasAttribute(marker)) {
			return;
		}
		target.setAttribute(marker, '');

		new con({
			target,
			context: ctx.map()
		});
	}

	/**
	 * Applies the saved volumes (0-100 settings) to the Syrinscape player (0-1), which otherwise starts at its own
	 * volumes. To be called once the player is active. The global and one-shot volumes belong to the Syrinscape
	 * session shared by everyone, so only the GM sets them.
	 */
	applyVolumes() {
		this.applyLocalVolume();
		if (!this.game.isGM()) {
			return;
		}
		this.api.changeMoodVolume(toPlayer(this.stores.globalVolume.get()));
		this.api.changeOneShotVolume(toPlayer(this.stores.oneshotsVolume.get()));
	}

	/**
	 * The mood of the ambient sounds is one for the whole session (the loudest pin among everyone's tokens), so the
	 * fade by distance is done with the local volume of each client, by the volume Foundry computes for its tokens.
	 */
	private activeAmbientMood: number | undefined = undefined;
	private localAmbients = new Map<string, LocalAmbient>();
	private lastLocalVolume: number | undefined = undefined;

	/** Sets (or removes) the volume of an ambient sound pin for the tokens of this client. */
	setLocalAmbient(key: string, ambient: LocalAmbient | undefined) {
		if (ambient === undefined) {
			this.localAmbients.delete(key);
		} else {
			this.localAmbients.set(key, ambient);
		}
		this.fadeLocalVolume();
	}

	/** Sets the ambient mood playing in the session (`undefined` when none, e.g. a playlist mood instead). */
	setActiveAmbientMood(moodId: number | undefined) {
		clearTimeout(this.restoreTimer);
		this.restoreTimer = undefined;
		// Syrinscape fades a stopped mood out: the faded local volume is kept meanwhile, or its tail would jump up.
		if (moodId === undefined && this.activeAmbientMood !== undefined) {
			this.restoreTimer = setTimeout(() => {
				this.restoreTimer = undefined;
				this.activeAmbientMood = undefined;
				this.fadeLocalVolume();
			}, AMBIENT_FADE_OUT_MS);
			return;
		}
		this.activeAmbientMood = moodId;
		this.fadeLocalVolume();
	}
	private restoreTimer: ReturnType<typeof setTimeout> | undefined = undefined;

	/** How loud the playing ambient mood is for this client (1 when there is none). */
	ambientFade(): number {
		const moodId = this.activeAmbientMood;
		if (moodId === undefined) {
			return 1;
		}
		let fade = 0;
		for (const ambient of this.localAmbients.values()) {
			// The pin flags may hold the id as a string
			if (Number(ambient.moodId) === Number(moodId)) {
				fade = Math.max(fade, ambient.volume);
			}
		}
		return fade;
	}

	/** Sends the local volume (the setting, 0-100, or `percent`) faded by the ambient sounds. */
	applyLocalVolume(percent: number = this.stores.playerVolume.get()) {
		this.lastLocalVolume = this.localVolume(percent);
		this.api.changePlayerVolume(this.lastLocalVolume);
	}

	private localVolume(percent: number): number {
		return Math.round(toPlayer(percent) * this.ambientFade() * 100) / 100;
	}

	// Called while tokens move: only a changed volume is sent, and only once the Syrinscape player exists
	// (`applyVolumes` sends it when it becomes active).
	private fadeLocalVolume() {
		if (!this.api.isPlayerActive()) {
			return;
		}
		if (this.localVolume(this.stores.playerVolume.get()) === this.lastLocalVolume) {
			return;
		}
		this.applyLocalVolume();
	}

	stopAll() {
		if (!this.game.isGM()) {
			this.game.socket!.executeAsGM(SocketCalls.StopAll);
			return;
		}

		this.utils.trace('Syrin | StopAll');

		this.game.callHookAll('moodChange', undefined);
	}

	setMood(moodId: number) {
		if (!this.game.isGM()) {
			const key = moodId;
			this.game.socket!.executeAsGM(SocketCalls.PlayMood, key);
			return;
		}

		this.utils.trace('Syrin | Set Mood', { moodId });
		this.game.callHookAll('moodChange', moodId);
	}

	playAmbientSound(id: string, sound: AmbientSound) {
		if (!this.game.isGM()) {
			const key = id + sound.userId;
			this.game.socket?.executeAsGM(SocketCalls.PlayAmbient, key, sound);
			return;
		}
		this.utils.trace('Syrin | Set Ambient Sound', { id, sound });
		this.stores.possibleAmbientSounds.update((p) => ({ ...p, [id]: sound }));
	}

	stopAmbientSound(id: string, userId: string) {
		if (!this.game.isGM()) {
			this.game.socket?.executeAsGM(SocketCalls.StopAmbient, id + userId, userId);
			return;
		}
		this.utils.trace('Syrin | Stop Ambient Sound', { id, userId });
		this.stores.possibleAmbientSounds.update((p) => {
			delete p[id];
			return p;
		});
	}

	async playElement(id: number) {
		if (!this.game.isGM()) {
			const key = id;
			await this.game.socket!.executeAsGM(SocketCalls.PlayElement, key);
			return;
		}
		await this.api.playElement(id);
	}

	async stopElement(id: number) {
		if (!this.game.isGM()) {
			const key = id;
			await this.game.socket!.executeAsGM(SocketCalls.StopElement, key);
			return;
		}
		await this.api.stopElement(id);
	}
}
