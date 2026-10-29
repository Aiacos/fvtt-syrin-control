import { Context } from '@/services/context';
import PlaylistConfigComponent from '@/components/config/playlist/index.svelte';
import { SyrinPlaylistFlags } from '@/sounds/playlist';
import { prepareConfigForm } from './config';

export interface PlaylistDetails {
	data: {
		name: string;
		sorting: 'a' | 'm';
		flags:
			| {
					syrinscape: SyrinPlaylistFlags;
			  }
			| undefined;
	};
}
export async function onPlaylistConfig(
	ctx: Context,
	window: HTMLElement,
	details: PlaylistDetails
) {
	if (details.data.flags?.syrinscape === undefined) {
		return;
	}
	const form = prepareConfigForm(window);
	if (form === undefined) {
		return;
	}

	let component = new PlaylistConfigComponent({
		target: form,
		props: {
			name: details.data.name,
			sorting: details.data.sorting,
			soundsetId: details.data.flags.syrinscape.soundset
		},
		context: ctx.map()
	});

	ctx.utils.trace('on Playlist config', { details, window, form, component });
}
