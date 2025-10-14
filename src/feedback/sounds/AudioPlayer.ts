import { App } from "obsidian";
import { SchemeHelper } from "./SchemeHelper";
import type { Sounds, Scheme } from "./types";
import { KEY_SOUND_MAP } from "./keySoundMap";

export class AudioPlayer {
    private sounds: Sounds | null = null;
    private schemeHelper: SchemeHelper;
    private app: App;
    private pluginDir: string;

    constructor(app: App, pluginDir: string) {
        this.app = app;
        this.pluginDir = pluginDir;
        this.schemeHelper = new SchemeHelper(this.app, this.pluginDir);
    }

    async load(soundPackId: string) {
        this.unload(); // Unload previous sounds first

        const scheme = await this.schemeHelper.getScheme(soundPackId);
        if (!scheme) {
            console.error(`[Shanhai] Sound pack '${soundPackId}' not found. Cannot load sounds.`);
            return;
        }

        this.sounds = await this.schemeHelper.loadScheme(scheme);
    }

    setVolume(volume: number) {
        if (!this.sounds) return;
        const vol = Math.max(0, Math.min(1, volume / 100));
        for (const key in this.sounds) {
            (this.sounds as any)[key].volume(vol);
        }
    }

    play(event: KeyboardEvent) {
        if (!this.sounds) return;

        const soundName = KEY_SOUND_MAP[event.code];
        if (soundName && this.sounds[soundName]) {
            this.sounds[soundName].play();
        } else {
            // Play one of the two general key sounds for any other key
            const keySound = Math.random() < 0.5 ? this.sounds.key : this.sounds.key2;
            if (keySound) {
                keySound.play();
            }
        }
    }

    unload() {
        if (this.sounds) {
            for (const key in this.sounds) {
                (this.sounds as any)[key].unload();
            }
            this.sounds = null;
        }
    }

    // Method to be used by the settings tab to populate the dropdown
    public getInstalledSoundPacks(): Promise<Record<string, string>> {
        return this.schemeHelper.getInstalledSchemes();
    }
}