import { Context } from '@/services/context';
import { SvelteDialog, SvelteDialogOptions } from './dialog';

// V13+ - Application V1 (`Dialog`) is deprecated, the window is an ApplicationV2 hosting a Svelte component.
const { ApplicationV2 } = (foundry as any).applications.api;

export class SvelteDialogImpl<T> extends ApplicationV2 implements SvelteDialog {
	componentConstructor: ConstructorOf<T>;
	component?: T;
	context: Context;
	// Inherited from ApplicationV2, which is untyped in the bundled foundry-vtt-types.
	declare render: SvelteDialog['render'];

	constructor(
		context: Context,
		componentConstructor: ConstructorOf<T>,
		options: SvelteDialogOptions
	) {
		super({
			classes: ['fvtt-syrin-control', ...(options.classes ?? [])],
			window: {
				title: options.title,
				resizable: options.resizable ?? false
			},
			position: {
				width: options.width ?? 'auto',
				height: options.height ?? 'auto'
			}
		});
		this.context = context;
		this.componentConstructor = componentConstructor;
	}

	// The content is owned by Svelte, there is no HTML for Foundry to render.
	async _renderHTML(): Promise<null> {
		return null;
	}

	_replaceHTML(_result: null, content: HTMLElement) {
		// Mount only once per opened window - re-rendering an open window just brings it to front.
		if (this.component !== undefined) {
			return;
		}
		this.component = new this.componentConstructor({
			target: content,
			context: this.context.map()
		});
	}

	_onClose(options: any) {
		(this.component as any)?.$destroy();
		this.component = undefined;
		super._onClose(options);
	}
}
