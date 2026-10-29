import ImporterComponent from '@/components/Importer.svelte';
import { Context } from '@/services/context';

export function openImporter(ctx: Context) {
	ctx.stores.importerApp.update((store) => {
		if (!store.app) {
			store.app = ctx.game.createDialog(ctx, ImporterComponent, {
				title: 'Syrinscape Online',
				width: 760,
				height: 500,
				resizable: true,
				classes: ['syrin-dialog']
			});
		}
		store.app.render({ force: true });
		return store;
	});
}
