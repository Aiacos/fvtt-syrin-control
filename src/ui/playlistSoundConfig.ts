import { Context } from '@/services/context';
import PlaylistSoundConfigComponent from '@/components/config/playlist-sound/index.svelte';
import { SyrinPlaylistSoundFlags } from '@/sounds/playlist-sound';
import { prepareConfigForm } from './config';

export interface PlaylistSoundDetails {
	data: {
		flags:
			| {
					syrinscape: SyrinPlaylistSoundFlags | undefined;
			  }
			| undefined;
		name: string;
	};
}

export async function onPlaylistSoundConfig(
	ctx: Context,
	window: HTMLElement,
	details: PlaylistSoundDetails
) {
	if (details.data.flags?.syrinscape?.type !== 'mood') {
		return;
	}

	const form = prepareConfigForm(window);
	if (form === undefined) {
		return;
	}

	let component = new PlaylistSoundConfigComponent({
		target: form,
		props: {
			name: details.data.name,
			moodId: details.data.flags.syrinscape.mood
		},
		context: ctx.map()
	});

	ctx.utils.trace('on PlaylistSound config', { details, window, form, component });
}
