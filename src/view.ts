import { ItemView, WorkspaceLeaf, Notice, moment } from "obsidian";
import ShanhaiPlugin from "./main";
import { SelectMonsterModal } from "./ui/SelectMonsterModal";
import { THEME_CONFIG, UNIVERSAL_TREASURE_CONFIG } from "./config/game-data";
import { MONSTERS } from "./config/monsters"; // Import MONSTERS

import { HonorsModal } from "./ui/HonorsModal";
import { t, TranslationKey } from "./lang/translator";

export const SHANHAI_VIEW_TYPE = "shanhai-view";

export class ShanhaiView extends ItemView {
    private plugin: ShanhaiPlugin;

    // UI Groups
    private treasuresContainerEl: HTMLDivElement;
    private combatContainerEl: HTMLDivElement;
    private victoryContainerEl: HTMLDivElement;
    private emptyStateContainerEl: HTMLDivElement; // New Empty State container
    private notificationEl: HTMLDivElement;
    private comboContainerEl: HTMLDivElement; // Combo display
    private flowTimerBarEl: HTMLDivElement; // Flow timer bar

    // Combat Elements
    private monsterNameEl: HTMLElement;
    private hpTextEl: HTMLElement;
    private hpBarEl: HTMLElement;

    private notificationTimeout: NodeJS.Timeout | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ShanhaiPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return SHANHAI_VIEW_TYPE;
    }

    getDisplayText() {
        return "Shanhai";
    }

    getIcon() {
        return "swords";
    }

    async onOpen() {
        const container = this.contentEl;
        container.empty();
        container.addClass("shanhai-view-container");

        // --- Create Buttons Container ---
        const buttonContainer = container.createDiv({ cls: "shanhai-button-container" });

        const challengeButton = buttonContainer.createEl("button", { text: t('challengeNewMonster'), cls: "shanhai-challenge-button" });
        challengeButton.addEventListener("click", () => {
            new SelectMonsterModal(this.app, this.plugin).open();
        });

        const honorsButton = buttonContainer.createEl("button", { text: t('hallOfHonor') });
        honorsButton.addEventListener("click", () => {
            new HonorsModal(this.app, this.plugin).open();
        });

        // --- Create Game Info Containers ---
        this.treasuresContainerEl = container.createDiv({ cls: "shanhai-treasures-container" });
        this.combatContainerEl = container.createDiv({ cls: "shanhai-combat-container" });
        this.victoryContainerEl = container.createDiv({ cls: "shanhai-victory-container", attr: { style: "display: none;" } });
        this.notificationEl = container.createDiv({ cls: "shanhai-notification" });
        this.comboContainerEl = container.createDiv({ cls: "shanhai-combo-container" }); // Create the element
        this.flowTimerBarEl = container.createDiv({ cls: "shanhai-flow-timer-bar" }); // Create timer bar as a sibling

        // --- Create Empty State Container ---
        this.emptyStateContainerEl = container.createDiv({ cls: "shanhai-empty-state-container", attr: { style: "display: none;" } });
        this.emptyStateContainerEl.createEl("p", { text: t('noMonsterChallenge') });
        const emptyStateButton = this.emptyStateContainerEl.createEl("button", { text: t('selectMonsterToStart') });
        emptyStateButton.addEventListener("click", () => {
            new SelectMonsterModal(this.app, this.plugin).open();
        });

        // --- Populate Static Elements ---
        this.monsterNameEl = this.combatContainerEl.createEl("h3", { cls: "shanhai-monster-name" });
        this.hpTextEl = this.combatContainerEl.createEl("p", { cls: "shanhai-hp-text" });
        const hpBarContainer = this.combatContainerEl.createEl("div", { cls: "shanhai-hp-bar-container" });
        this.hpBarEl = hpBarContainer.createEl("div", { cls: "shanhai-hp-bar" });

        this.victoryContainerEl.createEl("h2", { text: t('victory'), cls: "shanhai-victory-title" });

        // Initial view update
        this.updateView();
    }

    async onClose() {
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
    }

    updateView() {
        const playerData = this.plugin.playerData;
        const monster = this.plugin.activeMonster;

        if (!playerData || !monster) return; // Guard against missing data

        // Check for the default monster state
        const isDefaultInitialMonster = monster.id === MONSTERS[0].id && monster.currentHp === monster.maxHp;

        if (isDefaultInitialMonster) {
            this.emptyStateContainerEl.style.display = "flex";
            this.treasuresContainerEl.style.display = "none";
            this.combatContainerEl.style.display = "none";
            this.victoryContainerEl.style.display = "none";
            this.comboContainerEl.style.display = "none";
        } else {
            this.emptyStateContainerEl.style.display = "none";
            this.treasuresContainerEl.style.display = "block";

            // 2. Update combat/victory UI
            if (monster.currentHp > 0) {
                this.combatContainerEl.style.display = "block";
                this.victoryContainerEl.style.display = "none";

                const isEnglish = moment.locale().startsWith('en');
                const displayName = isEnglish && monster.en_name 
                    ? `${monster.en_name} (${monster.name})` 
                    : monster.name;
                this.monsterNameEl.setText(displayName);

                // Set tooltip for English description
                this.monsterNameEl.title = ''; // Clear previous title
                if (isEnglish && monster.en_description) {
                    this.monsterNameEl.title = monster.en_description;
                }

                this.hpTextEl.setText(`${monster.currentHp} / ${monster.maxHp}`);
                const hpPercentage = (monster.currentHp / monster.maxHp) * 100;
                this.hpBarEl.style.width = `${hpPercentage}%`;
            } else {
                this.combatContainerEl.style.display = "none";
                this.victoryContainerEl.style.display = "block";
            }
        }

        const currentThemeId = playerData.currentTheme as keyof typeof THEME_CONFIG;
        const theme = THEME_CONFIG[currentThemeId] || THEME_CONFIG.farming;

        // 1. Dynamically update treasures display from tiers
        this.treasuresContainerEl.empty();

        for (let tier = 1; tier <= 5; tier++) {
            const count = playerData.treasureTiers[tier] || 0;
            let info;

            // Universal treasures (Tier 3+)
            if (tier >= 3) {
                info = UNIVERSAL_TREASURE_CONFIG[tier];
            } 
            // Theme-specific treasures (Tier 1 & 2)
            else if (theme && (tier === 1 || tier === 2)) {
                const tierKey = `tier_${tier}` as 'tier_1' | 'tier_2';
                info = theme[tierKey];
            }

            if (info) {
                const el = this.treasuresContainerEl.createDiv({ cls: "shanhai-treasure-item" });
                el.setText(`${info.emoji} ${t(info.nameKey as TranslationKey)}: ${count}`);
            }
        }

        // 3. Update Combo display
        if (this.plugin.comboCount > 1 && monster.currentHp > 0) { // Only show combo if monster is alive
            const comboText = this.plugin.comboCount > 100 ? '100+' : `x${this.plugin.comboCount}`;
            this.comboContainerEl.setText(comboText);
            this.comboContainerEl.style.display = 'block';

            // Reset and start timer bar animation
            this.flowTimerBarEl.classList.remove('is-active');
            void this.flowTimerBarEl.offsetWidth; // Trigger a reflow to restart the animation
            this.flowTimerBarEl.style.animationDuration = `${this.plugin.settings.flow.holdTime * 60}s`;
            this.flowTimerBarEl.classList.add('is-active');

            // Remove all previous combo-tier classes
            this.comboContainerEl.className = 'shanhai-combo-container';

            // Add a class for color-coding based on combo count
            if (this.plugin.comboCount >= 100) this.comboContainerEl.addClass('combo-tier-5');
            else if (this.plugin.comboCount >= 80) this.comboContainerEl.addClass('combo-tier-4');
            else if (this.plugin.comboCount >= 60) this.comboContainerEl.addClass('combo-tier-3');
            else if (this.plugin.comboCount >= 40) this.comboContainerEl.addClass('combo-tier-2');
            else if (this.plugin.comboCount >= 20) this.comboContainerEl.addClass('combo-tier-1');

        } else {
            this.comboContainerEl.style.display = 'none';
            this.flowTimerBarEl.classList.remove('is-active');
        }
    }

    public showCustomNotification(message: string) {
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        this.notificationEl.setText(message);
        this.notificationEl.addClass("is-visible");
        this.notificationTimeout = setTimeout(() => {
            this.notificationEl.removeClass("is-visible");
        }, 2000);
    }
}