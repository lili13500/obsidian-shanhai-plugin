import type { ISetting, IExplosion } from '../types';
import { EXPLOSION_PRESETS } from './effects-presets';

const DEFAULT_EXPLOSION: IExplosion = {
    enable: true,
    maxExplosions: 3,
    size: 10,
    frequency: 1,
    explosionOrder: 'random',
    gifMode: 'continue',
    duration: 400,
    offset: 0.25,
    backgroundMode: 'mask',
    imageList: [],
};

export const DEFAULT_SETTINGS: ISetting = {
    sound: {
        isEnabled: true,
        volume: 0.5,
        activeSoundPackId: 'cherry-mx-blue',
    },
    shakeScreen: {
        enable: false,
        intensity: 5,
        recoverTime: 500,
    },
    combo: {
        enable: true,
        timeout: 2000,
        showExclamation: true,
        precisionInput: false,
    },
    flow: {
        holdTime: 5, // Default 5 minutes
    },
    explosion: DEFAULT_EXPLOSION,
    explosionPreset: 0, // Use index 0 for 'confetti'
    useCustom: false,
    customEffect: DEFAULT_EXPLOSION,
};
