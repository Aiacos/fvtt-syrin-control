export interface SvelteDialog {
	render(options?: any): Promise<unknown>;
}

export interface SvelteDialogOptions {
	title: string;
	width?: number;
	height?: number | 'auto';
	resizable?: boolean;
	classes?: string[];
}
