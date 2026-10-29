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
