import { TranslationKey } from "../lang/translator";

export const THEME_CONFIG: { [themeId: string]: Theme } = {
    farming: {
        name: '耕耘',
        tier_1: { nameKey: 'treasurePotato', emoji: '🥔' },
        tier_2: { nameKey: 'treasurePapaya', emoji: '🥭' },
    },
    mining: {
        name: '挖矿',
        tier_1: { nameKey: 'treasureStone', emoji: '🪨' },
        tier_2: { nameKey: 'treasureCopper', emoji: '🥉' },
    },
    sea: {
        name: '深海',
        tier_1: { nameKey: 'treasureFish', emoji: '🐟' },
        tier_2: { nameKey: 'treasurePearl', emoji: '⚪' },
    },
    cosmos: {
        name: '宇宙',
        tier_1: { nameKey: 'treasureStar', emoji: '⭐' },
        tier_2: { nameKey: 'treasureMoon', emoji: '🌕' },
    },
};

export const UNIVERSAL_TREASURE_CONFIG: { [tier: number]: TreasureInfo } = {
    3: { nameKey: "treasureGoldKey", emoji: "🔑" },
    4: { nameKey: "treasureMoneyBag", emoji: "💰" },
    5: { nameKey: "treasureCrown", emoji: "👑" },
};

// This is the new 'rule' configuration that will be used in the next step.
export const TIER_CONFIG: { [tier: number]: TierConfig } = {
    1: { chance: 0.1, damage: 1 },          // 10%
    2: { chance: 0.01, damage: [3, 5] },     // 1%
    3: { chance: 0.001, damage: [6, 10] },    // 0.1%
    4: { chance: 0.0001, damage: [11, 20] },   // 0.01%
    5: { chance: 0.00005, damage: [21, 50] },  // 0.005%
};

// --- Helper Types ---
export interface TreasureInfo {
    nameKey: TranslationKey;
    emoji: string;
}

interface Theme {
    name: string;
    tier_1: TreasureInfo;
    tier_2: TreasureInfo;
}

interface TierConfig {
    chance: number;
    damage: number | [number, number];
}