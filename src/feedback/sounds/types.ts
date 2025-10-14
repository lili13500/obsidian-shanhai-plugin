import type { Howl } from 'howler';

export interface Sounds {
	key: Howl;
	key2: Howl;
	enter: Howl;
	space: Howl;
	delete: Howl;
}

export interface Scheme {
	id: string;
	caption: string;
	sounds: {
		key: string;
		key2: string;
		enter: string;
		space: string;
		delete: string;
	};
}
