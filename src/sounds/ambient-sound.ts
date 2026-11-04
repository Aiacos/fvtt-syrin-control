import { Context } from '@/services/context';
import { ElementSoundFlags, MoodSoundFlags } from '@/sounds';

export type SyrinAmbientSoundFlags = ElementSoundFlags | MoodSoundFlags;

export interface AmbientSoundProvider {
	/**
	 * Foundry syncs one ambient sound per audio path (the pin closest to a listener, or the first one): the pins of
	 * the same Syrinscape mood or element share a path, so they have to be tracked by path, not by document id.
	 * Otherwise a pin that stops being the closest one is never synced again and keeps playing.
	 */
	key(): string | null;
	ctx(): Context;
}

// Foundry syncs while tokens move (every animation frame): the volume is rounded so that only real changes are sent.
const roundVolume = (volume: number) => Math.round(volume * 100) / 100;

export class AmbientSound {
	flags: SyrinAmbientSoundFlags;
	provider: AmbientSoundProvider;
	// What the GM was last told about this pin: unknown at first (it may still have it from before a reload).
	lastReported: number | 'stopped' | undefined = undefined;

	constructor(data: any, provider: AmbientSoundProvider) {
		this.flags = data.flags.syrinscape;
		this.provider = provider;
		this.provider.ctx().utils.trace('Creating an ambient sound', { data, flags: this.flags });
	}

	/**
	 * @param isAudible Whether a listener (a token of this client) is in the area of the sound.
	 * @param volume The volume Foundry computes for the closest listener (0-1): the document volume, attenuated with
	 * the distance from the center (with the easing of the sound) and 1 right on it.
	 */
	async sync(isAudible: boolean, volume: number): Promise<void> {
		const ctx = this.provider.ctx();
		const key = this.provider.key();
		if (key === null) {
			return;
		}
		const audible = isAudible && volume > 0;
		const rounded = roundVolume(volume);

		// The local fade follows this client's own tokens, so it does not need the GM.
		if (this.flags.type === 'mood') {
			ctx.syrin.setLocalAmbient(
				key,
				audible ? { moodId: this.flags.mood, volume: rounded } : undefined
			);
		}

		if (!ctx.api.isPlayerActive()) {
			return;
		}

		const userId = ctx.game.userId() ?? '';
		if (!audible) {
			if (this.lastReported !== 'stopped') {
				this.lastReported = 'stopped';
				ctx.syrin.stopAmbientSound(key, userId);
			}
			return;
		}

		if (this.lastReported === rounded) {
			return;
		}
		this.lastReported = rounded;

		switch (this.flags.type) {
			case 'mood': {
				ctx.syrin.playAmbientSound(key, {
					kind: 'mood',
					volume: rounded,
					moodId: this.flags.mood,
					userId
				});
				break;
			}
			case 'element': {
				ctx.syrin.playAmbientSound(key, {
					kind: 'element',
					volume: rounded,
					elementId: this.flags.element,
					userId
				});
				break;
			}
		}
	}
}
