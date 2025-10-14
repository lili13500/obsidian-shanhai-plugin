import { Editor, MarkdownView, Plugin } from 'obsidian';
import { ShanhaiView, SHANHAI_VIEW_TYPE } from './view';
import { ShanhaiSettingTab } from './setting';
import { ISetting, PlayerData, Monster, MonsterTemplate } from './types';
import { DEFAULT_SETTINGS } from './config/settings';
import { THEME_CONFIG, TIER_CONFIG, UNIVERSAL_TREASURE_CONFIG } from './config/game-data';
import { EXPLOSION_PRESETS } from './config/effects-presets';
import { AudioPlayer } from './feedback/sounds/AudioPlayer';
import { explosion } from './feedback/effects/Explosion';
import { shakeScreen } from './feedback/effects/screen-shaker';
import { BattleReportModal, BattleStats } from './ui/BattleReportModal';
import { SelectMonsterModal } from './ui/SelectMonsterModal';
import { MONSTERS } from './config/monsters';
import { TITLE_ADJECTIVES, TITLE_NOUNS } from './config/titles';
import { t, TranslationKey } from './lang/translator';

export default class ShanhaiPlugin extends Plugin {
    settings: ISetting;
    playerData: PlayerData;
    activeMonster: Monster;
    audioPlayer: AudioPlayer;
    public soundsLoaded = false;
    private lastDocumentLength: number = 0;
    private keyHeld = false;
    private lastKeyDownSoundTimestamp: number = 0; // Add timestamp property

    // Game State Properties
    public comboCount: number = 0;
    private lastInputTimestamp: number = 0;
    private comboTimeout: NodeJS.Timeout | null = null;
    public isFlowState: boolean = false;
    private idleTimer: NodeJS.Timeout | null = null;
    private treasuresEarnedThisBattle: { [tier: number]: number } = {};
    private totalDamageDealtThisBattle: number = 0;
    private maxComboThisBattle: number = 0;
    private battleStartTime: number = 0;

    private generateTitle(monster: Monster): { title: string; star: number } {
        const adjective = TITLE_ADJECTIVES[Math.floor(Math.random() * TITLE_ADJECTIVES.length)];
        const noun = TITLE_NOUNS[Math.floor(Math.random() * TITLE_NOUNS.length)];
        const title = `${monster.name}${adjective}${noun}`;
        return { title, star: monster.tier };
    }

    public async rerollTitle(monster: Monster): Promise<{ title: string; star: number }> {
        const newTitle = this.generateTitle(monster);
        // Replace the last title
        if (this.playerData.unlockedTitles.length > 0) {
            this.playerData.unlockedTitles[this.playerData.unlockedTitles.length - 1] = { ...newTitle, unlockedAt: Date.now() };
        }
        await this.savePluginData();
        return newTitle;
    }

    async onload() {
        await this.loadPluginData();

        this.audioPlayer = new AudioPlayer(this.app, this.manifest.dir || '');
        this.audioPlayer.setVolume(this.settings.sound.volume);

        this.addSettingTab(new ShanhaiSettingTab(this.app, this));
        this.registerView(SHANHAI_VIEW_TYPE, (leaf) => new ShanhaiView(leaf, this));
        this.addRibbonIcon('swords', 'Shanhai View', () => this.activateView());

        this.addCommand({
            id: 'challenge-shanhai',
            name: t('challengeShanhai'),
            callback: () => {
                new SelectMonsterModal(this.app, this).open();
            }
        });

        this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange));
        this.registerDomEvent(this.app.workspace.containerEl, 'keydown', this.handleKeydown);
        this.registerDomEvent(this.app.workspace.containerEl, 'keyup', this.handleKeyup);
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (leaf?.view instanceof MarkdownView) {
                this.lastDocumentLength = leaf.view.editor.getValue().length;
            }
            this.resetIdleTimer();
        }));

        const activeEditor = this.app.workspace.activeEditor?.editor;
        if (activeEditor) {
            this.lastDocumentLength = activeEditor.getValue().length;
        }

        this.resetIdleTimer();
    }

    onunload() {
        this.audioPlayer?.unload();
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
    }

    async loadPluginData() {
        const loadedData = await this.loadData();

        const DEFAULT_PLAYER_DATA: PlayerData = {
            treasureTiers: [0, 0, 0, 0, 0, 0],
            currentTheme: 'farming',
            lastSaveTimestamp: Date.now(),
            unlockedTitles: [],
        };

        this.settings = { ...DEFAULT_SETTINGS, ...loadedData?.settings };
        this.playerData = { ...DEFAULT_PLAYER_DATA, ...loadedData?.playerData };

        const preset = EXPLOSION_PRESETS[this.settings.explosionPreset];
        if (preset) {
            const userEnable = this.settings.explosion.enable;
            this.settings.explosion = {
                enable: userEnable,
                maxExplosions: preset.config.maxExplosions ?? DEFAULT_SETTINGS.explosion.maxExplosions,
                size: preset.config.size ?? DEFAULT_SETTINGS.explosion.size,
                frequency: preset.config.frequency ?? DEFAULT_SETTINGS.explosion.frequency,
                explosionOrder: preset.config.explosionOrder ?? DEFAULT_SETTINGS.explosion.explosionOrder,
                gifMode: preset.config.gifMode ?? DEFAULT_SETTINGS.explosion.gifMode,
                duration: preset.config.duration ?? DEFAULT_SETTINGS.explosion.duration,
                offset: preset.config.offset ?? DEFAULT_SETTINGS.explosion.offset,
                backgroundMode: preset.config.backgroundMode ?? DEFAULT_SETTINGS.explosion.backgroundMode,
                imageList: preset.config.imageList ?? DEFAULT_SETTINGS.explosion.imageList,
            };
        }

        this.activeMonster = loadedData?.activeMonster || this.createDefaultMonster();

        // Migration for old data: if loaded monster has no battleStartTime, set it to now.
        if (!this.activeMonster.battleStartTime) {
            this.activeMonster.battleStartTime = Date.now();
        }

        const now = Date.now();
        const lastSave = this.playerData.lastSaveTimestamp || now;
        const idleTime = now - lastSave;
        if (idleTime > this.settings.flow.holdTime * 60 * 1000) {
            this.activeMonster.currentHp = this.activeMonster.maxHp;
            this.comboCount = 0;
            this.isFlowState = false;
        }
    }

    async savePluginData() {
        this.playerData.lastSaveTimestamp = Date.now();
        await this.saveData({
            settings: this.settings,
            playerData: this.playerData,
            activeMonster: this.activeMonster
        });
    }

    createDefaultMonster(): Monster {
        this.treasuresEarnedThisBattle = {};
        this.totalDamageDealtThisBattle = 0;
        this.maxComboThisBattle = 0;

        const defaultMonsterTemplate = MONSTERS[0];
        const monster: Monster = {
            ...defaultMonsterTemplate,
            currentHp: defaultMonsterTemplate.maxHp,
            battleStartTime: Date.now()
        };

        return monster;
    }

    resetIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        this.idleTimer = setTimeout(() => {
            this.regenerateMonsterHp();
        }, this.settings.flow.holdTime * 60 * 1000);
    }

    regenerateMonsterHp() {
        if (this.activeMonster.currentHp > 0 && this.activeMonster.currentHp < this.activeMonster.maxHp) {
            this.activeMonster.currentHp = Math.min(this.activeMonster.maxHp, this.activeMonster.currentHp + 1);
            this.updateView();
            this.showViewNotification(t('monsterIsRegenerating', this.activeMonster.name));
            this.idleTimer = setTimeout(() => this.regenerateMonsterHp(), 6000);
        } else {
            this.resetIdleTimer();
        }
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(SHANHAI_VIEW_TYPE)[0];
        if (!leaf) {
            leaf = workspace.getRightLeaf(false)!;
            await leaf.setViewState({ type: SHANHAI_VIEW_TYPE, active: true });
        }
        workspace.revealLeaf(leaf);
    }

    private handleKeyup = (evt: KeyboardEvent) => {
        this.keyHeld = false;
    }

    private handleKeydown = async (evt: KeyboardEvent) => {
        if (evt.isComposing) return; // Do not play sound during IME composition

        // Lazy load sounds on first keypress
        if (!this.soundsLoaded && this.settings.sound.isEnabled) {
            await this.audioPlayer.load(this.settings.sound.activeSoundPackId);
            this.soundsLoaded = true;
        }

        this.keyHeld = evt.repeat;
        if (!this.settings.sound.isEnabled) return;
        if (evt.ctrlKey || evt.metaKey || (evt.altKey && !evt.ctrlKey && !evt.metaKey)) return;
        this.audioPlayer.play(evt);
        this.lastKeyDownSoundTimestamp = Date.now(); // Record timestamp
    }

    private handleEditorChange = (editor: Editor, info: MarkdownView) => {
        const netChange = editor.getValue().length - this.lastDocumentLength;
        this.lastDocumentLength = editor.getValue().length;

        this.handleComboLogic(netChange);

        if (netChange > 0 && !this.keyHeld && netChange <= 10) {
            // Play sound for text input, including IME composition end
            // Check timestamp to prevent double sound on normal keypress
            if (Date.now() - this.lastKeyDownSoundTimestamp > 50) {
                this.playTestSound();
            }

            shakeScreen(this.app.workspace.containerEl, this.settings);
            explosion(editor, this.settings);
            this.handleGameLogic(netChange, editor);
        }
    };

    private resetCombo() {
        this.comboCount = 0;
        if (this.isFlowState) {
            this.isFlowState = false;
            this.showViewNotification(t('flowStateInterrupted'));
        }
        this.updateView();
    }

    private handleComboLogic(netChange: number) {
        this.resetIdleTimer();

        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
        }

        if (this.keyHeld || netChange > 10) {
            this.comboTimeout = setTimeout(() => this.resetCombo(), this.settings.flow.holdTime * 60 * 1000);
            return;
        }

        const now = Date.now();
        if (now - this.lastInputTimestamp < 50) {
            this.comboTimeout = setTimeout(() => this.resetCombo(), this.settings.flow.holdTime * 60 * 1000);
            return;
        }

        this.lastInputTimestamp = now;
        this.comboCount++;
        this.maxComboThisBattle = Math.max(this.maxComboThisBattle, this.comboCount);

        if (this.comboCount >= 20 && !this.isFlowState) {
            this.isFlowState = true;
            this.showViewNotification(t('flowStateActivated'));
        }

        this.updateView();

        this.comboTimeout = setTimeout(() => this.resetCombo(), this.settings.flow.holdTime * 60 * 1000);
    }

    private handleGameLogic(changeAmount: number, editor: Editor) {
        if (this.activeMonster.currentHp <= 0) return;

        let totalDamage = 0;
        let foundTreasure = false;

        for (let i = 0; i < changeAmount; i++) {
            for (const tierStr in TIER_CONFIG) {
                const tier = parseInt(tierStr);
                const tierConfig = TIER_CONFIG[tier];

                let bonusMultiplier = 1;
                if (this.isFlowState) {
                    if (this.comboCount >= 100) bonusMultiplier = 6;
                    else if (this.comboCount >= 80) bonusMultiplier = 5;
                    else if (this.comboCount >= 60) bonusMultiplier = 4;
                    else if (this.comboCount >= 40) bonusMultiplier = 3;
                    else if (this.comboCount >= 20) bonusMultiplier = 2;
                }

                const chance = tierConfig.chance * bonusMultiplier;

                if (Math.random() < chance) {
                    this.playerData.treasureTiers[tier] = (this.playerData.treasureTiers[tier] || 0) + 1;
                    this.treasuresEarnedThisBattle[tier] = (this.treasuresEarnedThisBattle[tier] || 0) + 1;
                    
                    let damage = 0;
                    if (typeof tierConfig.damage === 'number') {
                        damage = tierConfig.damage;
                    } else {
                        damage = Math.floor(Math.random() * (tierConfig.damage[1] - tierConfig.damage[0] + 1)) + tierConfig.damage[0];
                    }
                    totalDamage += damage;
                    this.totalDamageDealtThisBattle += damage;
                    foundTreasure = true;

                    const view = this.app.workspace.getLeavesOfType(SHANHAI_VIEW_TYPE)[0]?.view;
                    if (view instanceof ShanhaiView) {
                        const currentThemeId = this.playerData.currentTheme as keyof typeof THEME_CONFIG;
                        const theme = THEME_CONFIG[currentThemeId] || THEME_CONFIG.farming;
                        let info = (tier >= 3) ? UNIVERSAL_TREASURE_CONFIG[tier] : theme[tier === 2 ? 'tier_2' : 'tier_1'];
                        if (info) {
                            view.showCustomNotification(t('foundTreasure', info.emoji, t(info.nameKey as TranslationKey)));
                        }
                    }
                    break;
                }
            }
        }

        if (foundTreasure) {
            this.activeMonster.currentHp = Math.max(0, this.activeMonster.currentHp - totalDamage);
            this.convertTreasures();
            this.updateView();
            this.savePluginData();
        }

        if (this.activeMonster.currentHp <= 0) {
            const battleDuration = Math.floor((Date.now() - this.activeMonster.battleStartTime) / 1000);

            const newTitle = this.generateTitle(this.activeMonster);
            this.playerData.unlockedTitles.push({ ...newTitle, unlockedAt: Date.now() });

            for (const tierStr in this.treasuresEarnedThisBattle) {
                const tier = parseInt(tierStr);
                const count = this.treasuresEarnedThisBattle[tier];
                if (count > 0) {
                    this.playerData.treasureTiers[tier] = (this.playerData.treasureTiers[tier] || 0) + count;
                }
            }

            this.convertTreasures();
            this.savePluginData();
            this.updateView();

            const stats: BattleStats = {
                totalDamage: this.totalDamageDealtThisBattle,
                maxCombo: this.maxComboThisBattle,
                treasuresEarned: this.treasuresEarnedThisBattle,
                duration: battleDuration,
                playerData: this.playerData,
                monster: this.activeMonster, // Pass the defeated monster
                newTitle: newTitle
            };
            new BattleReportModal(this.app, this, stats).open();

            this.treasuresEarnedThisBattle = {};
            this.totalDamageDealtThisBattle = 0;
            this.maxComboThisBattle = 0;
        }
    }

    private convertTreasures() {
        for (let tier = 1; tier < 5; tier++) {
            const currentTierCount = this.playerData.treasureTiers[tier] || 0;
            if (currentTierCount >= 10) {
                const newHigherTierItems = Math.floor(currentTierCount / 10);
                const remainingCurrentTierItems = currentTierCount % 10;

                this.playerData.treasureTiers[tier] = remainingCurrentTierItems;
                this.playerData.treasureTiers[tier + 1] = (this.playerData.treasureTiers[tier + 1] || 0) + newHigherTierItems;
            }
        }
    }

    public updateView() {
        const leaf = this.app.workspace.getLeavesOfType(SHANHAI_VIEW_TYPE)[0];
        if (leaf && leaf.view instanceof ShanhaiView) {
            leaf.view.updateView();
        }
    }

    public showViewNotification(message: string) {
        const leaf = this.app.workspace.getLeavesOfType(SHANHAI_VIEW_TYPE)[0];
        if (leaf && leaf.view instanceof ShanhaiView) {
            leaf.view.showCustomNotification(message);
        }
    }

    public playTestSound() {
        if (!this.settings.sound.isEnabled || !this.audioPlayer) return;
        // Simulate a simple key press to play a standard sound
        this.audioPlayer.play({ key: 'a' } as KeyboardEvent);
    }
}
