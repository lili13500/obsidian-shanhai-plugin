import { App, Modal } from "obsidian";
import ShanhaiPlugin from "../main";
import { THEME_CONFIG, UNIVERSAL_TREASURE_CONFIG } from "../config/game-data";
import { PlayerData, Monster } from "../types";
import { t, TranslationKey } from "../lang/translator";

export interface BattleStats {

    totalDamage: number;

    maxCombo: number;

    treasuresEarned: { [tier: number]: number };

    duration: number; // in seconds

    playerData: PlayerData;

    monster: Monster;

    newTitle?: { title: string; star: number; };

}

export class BattleReportModal extends Modal {
    stats: BattleStats;
    plugin: ShanhaiPlugin;
    private rerollCount = 0;
    private readonly maxRerolls = 5;

    constructor(app: App, plugin: ShanhaiPlugin, stats: BattleStats) {
        super(app);
        this.plugin = plugin;
        this.stats = stats;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("shanhai-battle-report");

        // Title
        contentEl.createEl("h1", { text: t('battleVictory') });

        // --- New Title Section ---
        if (this.stats.newTitle) {
            const titleContainer = contentEl.createDiv({ cls: "new-title-container" });
            titleContainer.createEl("p", { text: t('unlockedNewTitle') });
            const titleEl = titleContainer.createEl("h2", { text: this.stats.newTitle.title });
            titleEl.addClass(`star-${this.stats.newTitle.star}`); // Add star class for styling
            const starsEl = titleContainer.createEl("p", { text: "⭐".repeat(this.stats.newTitle.star), cls: "title-stars" });

            const rerollButton = titleContainer.createEl("button", { text: t('reroll', this.maxRerolls - this.rerollCount) });
            rerollButton.addEventListener("click", async () => {
                if (this.rerollCount < this.maxRerolls) {
                    this.rerollCount++;
                    const newTitle = await this.plugin.rerollTitle(this.stats.monster);
                    titleEl.setText(newTitle.title);
                    titleEl.className = `star-${newTitle.star}`;
                    starsEl.setText("⭐".repeat(newTitle.star));
                    rerollButton.setText(t('reroll', this.maxRerolls - this.rerollCount));
                    if (this.rerollCount >= this.maxRerolls) {
                        rerollButton.disabled = true;
                        rerollButton.setText(t('noMoreRerolls'));
                    }
                }
            });
        }

        // --- Stats Container ---
        const statsContainer = contentEl.createDiv({ cls: "stats-container" });

        // Left Side (Core Stats)
        const coreStatsEl = statsContainer.createDiv();
        coreStatsEl.createEl("p", { text: t('battleDuration', this.formatDuration(this.stats.duration)) });
        coreStatsEl.createEl("p", { text: t('totalDamageDealt', this.stats.totalDamage) });
        coreStatsEl.createEl("p", { text: t('maxCombo', this.stats.maxCombo) });

        // Right Side (Rewards)
        const rewardsEl = statsContainer.createDiv();
        rewardsEl.createEl("h3", { text: t('rewardsThisTime') });

        const currentThemeId = this.stats.playerData.currentTheme as keyof typeof THEME_CONFIG;
        const theme = THEME_CONFIG[currentThemeId] || THEME_CONFIG.farming;

        for (const tierStr in this.stats.treasuresEarned) {
            const tier = parseInt(tierStr);
            const count = this.stats.treasuresEarned[tier];
            if (count > 0) {
                let info = (tier >= 3) ? UNIVERSAL_TREASURE_CONFIG[tier] : theme[tier === 2 ? 'tier_2' : 'tier_1'];
                if (info) {
                    const rewardLine = rewardsEl.createEl("p");
                    rewardLine.setText(`${info.emoji} ${t(info.nameKey as TranslationKey)} x${count}`);
                }
            }
        }
        
        rewardsEl.createEl("h3", { text: t('doubleRewards'), cls: "reward-bonus" });
        for (const tierStr in this.stats.treasuresEarned) {
            const tier = parseInt(tierStr);
            const count = this.stats.treasuresEarned[tier];
            if (count > 0) {
                let info = (tier >= 3) ? UNIVERSAL_TREASURE_CONFIG[tier] : theme[tier === 2 ? 'tier_2' : 'tier_1'];
                if (info) {
                    const rewardLine = rewardsEl.createEl("p", {cls: "reward-bonus"});
                    rewardLine.setText(`${info.emoji} ${t(info.nameKey as TranslationKey)} x${count}`);
                }
            }
        }

        // --- Close Button ---
        const closeButton = contentEl.createEl("button", { text: t('continue') });
        closeButton.addEventListener("click", () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private formatDuration(totalSeconds: number): string {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return t('durationMinutesSeconds', minutes, seconds);
    }
}
