import PlaylistComponent from '@/components/Playlist.svelte';
import PlayerVolumeComponent from '@/components/PlayerVolume.svelte';
import GMVolumeComponent from '@/components/GMVolume.svelte';
import { Context } from '@/services/context';
import { openImporter } from '@/ui/importer';
import { SyrinComponent } from '@/services/syrin';

// V13+ - Playlist actions are camelCase (`playlistPlay`), V12 used kebab-case (`playlist-play`).
const actionsToRemove = [
	'playlistMode',
	'playlistPlay',
	'playlistBackward',
	'playlistForward',
	'soundCreate',
	'soundRepeat'
];

/**
 * The PlaylistDirectory is an ApplicationV2 rendered in parts (`header`, `controls`, `directory`, `playing`, `footer`).
 * The hook is called for every (partial) render, so every injection here has to be idempotent.
 */
export async function onPlaylistTab(ctx: Context, tab: HTMLElement) {
	const controls = tab.querySelector('[data-application-part="controls"]');
	const volumeTarget =
		controls?.querySelector('ol, ul') ?? controls ?? tab.querySelector('.playlist-sounds');

	if (volumeTarget !== null) {
		ctx.syrin.renderComponent(
			ctx,
			SyrinComponent.PlayerVolume,
			PlayerVolumeComponent,
			volumeTarget
		);
	}

	if (!ctx.game.isGM()) {
		return;
	}

	if (volumeTarget !== null) {
		ctx.syrin.renderComponent(ctx, SyrinComponent.GMVolume, GMVolumeComponent, volumeTarget);
	}

	const target = tab.querySelector('.directory-list');
	if (target === null) {
		return;
	}

	ctx.syrin.renderComponent(ctx, SyrinComponent.Playlist, PlaylistComponent, target);

	const buttonsTarget = tab.querySelector('.header-actions, .action-buttons');
	if (buttonsTarget !== null && buttonsTarget.querySelector('.import-syrinscape') === null) {
		const importButton = document.createElement('button');
		importButton.type = 'button';
		importButton.className = 'import-syrinscape';
		importButton.dataset.test = 'syrin-import-btn';
		importButton.innerHTML = `<i class="fas fa-file-import"></i> ${ctx.game.localize(
			'playlist.importSoundsets'
		)}`;
		importButton.addEventListener('click', () => {
			openImporter(ctx);
		});
		buttonsTarget.append(importButton);
	}

	const playlists = ctx.game.getPlaylists();

	for (const item of Array.from(target.querySelectorAll<HTMLElement>('.directory-item'))) {
		const id = item.dataset.entryId ?? item.dataset.documentId;
		const playlist = id === undefined ? undefined : (playlists?.get(id) as any);
		if (playlist?.flags?.syrinscape === undefined) {
			continue;
		}

		ctx.utils.trace('Item', { item, playlist });
		for (const action of actionsToRemove) {
			item.querySelectorAll(`[data-action="${action}"]`).forEach((el: Element) => el.remove());
		}
	}
}
