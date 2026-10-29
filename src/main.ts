import 'reflect-metadata';
import 'syrinscape';
import { container } from 'tsyringe';
import { initSettings, onCloseSettings } from './settings';

import { onPlaylistTab } from './ui/playlist';
import { openElements } from './ui/elements';
import { onSettings } from './ui/settings';

import { MODULE } from './services/utils';
import { resolve } from './services/context';
import { FVTTGameImpl } from './services/game';
import { RawApiImpl } from './services/raw';
import { createProxies } from './proxies';
import { setupSocket } from './socket';
import { onPlaylistConfig } from './ui/playlistConfig';
import { onAmbientSoundConfig } from './ui/ambientSoundConfig';
import { onPlaylistSoundConfig } from './ui/playlistSoundConfig';
import { migrations } from './migrations';

Hooks.once('init', function () {
	console.log('SyrinControl | Initializing...');

	container.register('FVTTGame', {
		useClass: FVTTGameImpl
	});
	container.register('RawApi', {
		useClass: RawApiImpl
	});
	const ctx = resolve();
	initSettings(ctx);
	const proxies = createProxies(ctx);
	CONFIG.PlaylistSound.documentClass = proxies.PlaylistSoundProxy;
	CONFIG.Playlist.documentClass = proxies.PlaylistProxy;
	CONFIG.AmbientSound.objectClass = proxies.AmbientSoundProxy;

	// CONFIG.debug.hooks = true;
	if (!ctx.game.hasActiveModule('socketlib')) {
		ctx.utils.error(
			"The `socketlib` module isn't enabled, but it's required for SyrinControl to operate properly"
		);

		Hooks.once('ready', () => {
			if (ctx.game.isGM()) {
				(foundry as any).applications.api.DialogV2.prompt({
					window: { title: ctx.game.localize('dependencies.socketlib.title') },
					content: `<p>${ctx.game.localize('dependencies.socketlib.text')}</p>`,
					ok: {
						icon: 'fas fa-check',
						label: ctx.game.localize('dependencies.ok')
					}
				});
			}
		});
	}

	Hooks.on('renderPlaylistDirectory', async (_: any, html: HTMLElement) => {
		await onPlaylistTab(ctx, html);
	});

	// V13+ - Scene controls are records keyed by name, tools use `onChange` instead of `onClick`.
	Hooks.on('getSceneControlButtons', (controls: any) => {
		if (!ctx.game.isGM()) {
			return;
		}

		const group = controls.sounds;
		if (group === undefined) {
			return;
		}

		group.tools[MODULE + 'Elements'] = {
			name: MODULE + 'Elements',
			order: Object.keys(group.tools).length,
			title: 'Syrinscape: Elements',
			icon: 'fas fa-drum',
			button: true,
			onChange: () => {
				openElements(ctx);
			}
		};
	});

	// Hooks.on(MODULE + 'soundsetChange', async function (soundsetId: number): Promise<void> {
	// 	if (!ctx.game.isGM()) {
	// 		return;
	// 	}

	// });

	Hooks.on(MODULE + 'moodChange', async function (moodId: number | undefined): Promise<void> {
		if (!ctx.game.isGM()) {
			return;
		}
		ctx.utils.trace('on mood change');

		ctx.stores.nextPlaylistMood.set(moodId);
	});

	Hooks.on('renderSettingsConfig', async (_: any, html: HTMLElement) => {
		await onSettings(html);
	});

	// V13+ - Document sheets are ApplicationV2, the data comes from the sheet document.
	Hooks.on('renderPlaylistConfig', async (app: any, html: HTMLElement) => {
		await onPlaylistConfig(ctx, html, { data: app.document });
	});
	Hooks.on('renderPlaylistSoundConfig', async (app: any, html: HTMLElement) => {
		await onPlaylistSoundConfig(ctx, html, { data: app.document });
	});
	Hooks.on('renderAmbientSoundConfig', async (app: any, html: HTMLElement) => {
		await onAmbientSoundConfig(ctx, html, { data: app.document });
	});

	Hooks.on('closeSettingsConfig', async () => {
		if (!ctx.game.isGM()) {
			return;
		}
		await onCloseSettings(ctx);
	});

	Hooks.once('ready', async () => {
		const socketPromise = setupSocket(ctx);
		await socketPromise;

		// Patching the drop data method, because flags are not passed into the ambient sound.
		// Instead of copying Foundry's implementation, the preview data is enriched with the playlist sound flags.
		const SoundsLayer = (foundry as any).canvas.layers.SoundsLayer;
		const originalOnDropData = SoundsLayer.prototype._onDropData;
		SoundsLayer.prototype._onDropData = async function (event: DragEvent, data: any) {
			const playlistSound =
				data?.type === 'PlaylistSound'
					? await (PlaylistSound.implementation as any).fromDropData(data)
					: undefined;
			if (playlistSound?.flags?.syrinscape === undefined) {
				return originalOnDropData.call(this, event, data);
			}

			const originalCreatePreview = this._createPreview;
			this._createPreview = (soundData: any, options: any) =>
				originalCreatePreview.call(
					this,
					{ ...soundData, flags: playlistSound.toObject().flags },
					options
				);
			try {
				return await originalOnDropData.call(this, event, data);
			} finally {
				delete this._createPreview;
			}
		};

		ctx.stores.nextMood.subscribe((next) => {
			ctx.utils.trace('Subscribe | next mood: ', next);
			if (next !== undefined) {
				ctx.api.playMood(next);
			} else {
				ctx.api.stopMood();
			}
		});
		await ctx.api.onInit();
		if (!ctx.game.isGM()) {
			ctx.utils.info('Ready but not a GM...');
			return;
		}
		ctx.utils.info('Migrating...');
		for (const migration of migrations) {
			migration(ctx);
		}
		ctx.utils.info('Ready...');
	});
});
