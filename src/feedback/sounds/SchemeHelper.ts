import type { Scheme, Sounds } from './types';
import { App, normalizePath } from 'obsidian';
import { Howl } from 'howler';

// A silent audio clip to use as a fallback.
const SILENT_AUDIO = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Type guard to check if an object is a valid manifest structure.
function isValidManifest(obj: any): obj is Record<keyof Scheme['sounds'] | 'id' | 'caption', string> {
	if (!obj || typeof obj !== 'object') return false;
	const soundKeys: (keyof Scheme['sounds'])[] = ['key', 'key2', 'space', 'enter', 'delete'];
	const requiredKeys = ['id', 'caption', ...soundKeys];
	return requiredKeys.every(key => typeof obj[key] === 'string');
}


export class SchemeHelper {
	app: App;
	pluginDir: string;

	constructor(app: App, pluginDir: string) {
		this.app = app;
		this.pluginDir = pluginDir;
	}

	private async getBase64URL(path: string): Promise<string> {
		try {
			const fileExists = await this.app.vault.adapter.exists(path);
			if (!fileExists) {
				console.error(`[Shanhai] Sound file not found at path: ${path}. Using silent audio as fallback.`);
				return SILENT_AUDIO;
			}
			const data = await this.app.vault.adapter.readBinary(path);
			const blob = new Blob([data], { type: 'audio/wav' });
			const buffer = await blob.arrayBuffer();
			const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
			return 'data:audio/wav;base64,' + b64;
		} catch (error) {
			console.error(`[Shanhai] Failed to read or encode sound file at ${path}:`, error);
			return SILENT_AUDIO; // Fallback to silent audio on any error.
		}
	}

	async loadScheme(scheme: Scheme): Promise<Sounds> {

		const [keyStr, key2Str, enterStr, spaceStr, deleteStr] = await Promise.all([
			this.getBase64URL(scheme.sounds.key),
			this.getBase64URL(scheme.sounds.key2),
			this.getBase64URL(scheme.sounds.enter),
			this.getBase64URL(scheme.sounds.space),
			this.getBase64URL(scheme.sounds.delete),
		]);

		const sounds: Sounds = {
			key: new Howl({ src: keyStr, preload: true }),
			key2: new Howl({ src: key2Str, preload: true }),
			enter: new Howl({ src: enterStr, preload: true }),
			space: new Howl({ src: spaceStr, preload: true }),
			delete: new Howl({ src: deleteStr, preload: true }),
		};

		return sounds;
	}

	async getScheme(name: string): Promise<Scheme | undefined> {
		if (name === 'default') {
            // The default sounds are not file-based, so we return a placeholder.
			return {
				id: 'default',
				caption: '默认音效',
				sounds: { key: '', key2: '', space: '', enter: '', delete: '' }
			};
		}

		const schemePath = normalizePath(`${this.pluginDir}/assets/sounds/${name}`);
		const manifestPath = normalizePath(`${schemePath}/manifest.json`);

		try {
			if (!(await this.app.vault.adapter.exists(manifestPath))) {
				console.warn(`[Shanhai] Manifest file not found for scheme '${name}' at ${manifestPath}`);
				return undefined;
			}

			const manifestContent = await this.app.vault.adapter.read(manifestPath);
			const manifest = JSON.parse(manifestContent);

			if (!isValidManifest(manifest)) {
				console.error(`[Shanhai] Invalid manifest structure for scheme '${name}':`, manifest);
				return undefined;
			}

			return {
				id: manifest.id,
				caption: manifest.caption,
				sounds: {
					key: normalizePath(`${schemePath}/${manifest.key}`),
					key2: normalizePath(`${schemePath}/${manifest.key2}`),
					space: normalizePath(`${schemePath}/${manifest.space}`),
					enter: normalizePath(`${schemePath}/${manifest.enter}`),
					delete: normalizePath(`${schemePath}/${manifest.delete}`),
				},
			};
		} catch (error) {
			console.error(`[Shanhai] Error reading or parsing manifest for scheme '${name}':`, error);
			return undefined;
		}
	}

	async getInstalledSchemes(): Promise<Record<string, string>> {
		const resourcePath = normalizePath(`${this.pluginDir}/assets/sounds`);
		if (!(await this.app.vault.adapter.exists(resourcePath))) {
			return { 'default': '默认音效' };
		}

		const paths = await this.app.vault.adapter.list(resourcePath);
		const schemePromises = paths.folders.map(async (folderPath): Promise<[string, string] | null> => {
			const manifestPath = normalizePath(`${folderPath}/manifest.json`);
			try {
				if (await this.app.vault.adapter.exists(manifestPath)) {
					const manifestContent = await this.app.vault.adapter.read(manifestPath);
					const manifest = JSON.parse(manifestContent);

					if (manifest && typeof manifest.id === 'string' && typeof manifest.caption === 'string') {
						return [manifest.id, manifest.caption];
					}
					console.warn(`[Shanhai] Invalid or incomplete manifest at ${manifestPath}. Skipping.`);
				}
			} catch (error) {
				console.error(`[Shanhai] Failed to process manifest at ${manifestPath}:`, error);
			}
			return null;
		});

		const resolvedSchemes = (await Promise.all(schemePromises)).filter((s): s is [string, string] => s !== null);
        const schemes = Object.fromEntries(resolvedSchemes);
		return schemes;
	}
}
