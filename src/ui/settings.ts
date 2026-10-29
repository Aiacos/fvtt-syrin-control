export async function onSettings(window: HTMLElement) {
	const authTokenField = window.querySelector<HTMLInputElement>(
		'input[name="fvtt-syrin-control.authToken"]'
	);

	authTokenField?.setAttribute('type', 'password');
}
