import { mocked, Mocked } from '@/mock';
import fs from 'fs';
import path from 'path';
import { PlaylistDetails, onPlaylistConfig } from './playlistConfig';

describe('Playlist config', () => {
	let mock: Mocked;
	let html: string;
	let details: PlaylistDetails;

	beforeEach(async () => {
		mock = mocked();

		html = fs.readFileSync(path.resolve(__dirname, '../../jest/fixtures/playlist.html'), 'utf8');
		document.body.innerHTML = html;

		details = {
			data: {
				name: 'Playlist',
				sorting: 'a',
				flags: {
					syrinscape: {
						soundset: '1234'
					}
				}
			}
		};
	});

	it('does nothing when flag is not set', async () => {
		let window = document.querySelector<HTMLElement>('.app')!;
		details.data.flags = undefined;
		await onPlaylistConfig(mock.ctx, window, details);

		expect(document.body.innerHTML).not.toContain('syrin');
	});

	it('sets padding', async () => {
		let window = document.querySelector<HTMLElement>('.app')!;
		await onPlaylistConfig(mock.ctx, window, details);

		expect(document.querySelector('.app .window-content')).toHaveAttribute('style', 'padding: 0;');
	});

	it('renders component', async () => {
		let window = document.querySelector<HTMLElement>('.app')!;
		await onPlaylistConfig(mock.ctx, window, details);

		expect(document.body.innerHTML).toContain('syrin');
	});
});
