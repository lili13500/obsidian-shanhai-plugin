/**
 * The IExplosion and parts of the ISetting interfaces are inspired by or adapted from
 * the obsidian-power-mode project (https://github.com/zhouhua/obsidian-power-mode),
 * which is licensed under the MIT License.
 * Copyright (c) 2023 zhouhua
 */

export interface IExplosion {
    enable: boolean;
    maxExplosions: number;
    size: number;
    frequency: number;
    explosionOrder: 'random' | 'sequential';
    gifMode: 'continue' | 'restart';
    duration: number;
    offset: number;
    backgroundMode: 'mask' | 'image';
    imageList: string[];
    customStyle?: Partial<CSSStyleDeclaration>;
}

export interface ISetting {
    sound: {
        isEnabled: boolean;
        volume: number;
        activeSoundPackId: string;
    };
    shakeScreen: {
        enable: boolean;
        intensity: number;
        recoverTime: number;
        shakeWindow?: boolean;
    };
    combo: {
        enable: boolean;
        timeout: number;
        showExclamation: boolean;
        precisionInput: boolean;
    };
    explosion: IExplosion;
    explosionPreset: number;
    useCustom: boolean;
    customEffect?: Partial<IExplosion>;
    flow: IFlow;
}

export interface IFlow {
    holdTime: number; // in minutes
}


export interface PlayerData {
    treasureTiers: number[];
    currentTheme: string;
    lastSaveTimestamp: number;
    unlockedTitles: { title: string; star: number; unlockedAt: number; }[];
}

// For the static list of monster definitions
export interface MonsterTemplate {
    id: string;
    name: string;
    en_name?: string;
    en_description?: string;
    maxHp: number;
    tier: number;
    theme: string;
    description: string;
    image: string;
}

// For an active monster instance in the game
export interface Monster extends MonsterTemplate {
    currentHp: number;
    battleStartTime: number;
}