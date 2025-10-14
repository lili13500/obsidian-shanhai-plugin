import { App, Modal, Notice, moment } from "obsidian";
import { MONSTERS } from "../config/monsters";
import { Monster, MonsterTemplate } from "../types";
import ShanhaiPlugin from "../main";
import { t } from "../lang/translator";

export class SelectMonsterModal extends Modal {
    plugin: ShanhaiPlugin;

    constructor(app: App, plugin: ShanhaiPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("shanhai-select-monster-modal");

        contentEl.createEl("h1", { text: t('challengeShanhai') });

        // --- Custom Monster Button ---
        const customMonsterEl = contentEl.createDiv({ cls: "shanhai-monster-item shanhai-custom-monster-button" });
        customMonsterEl.setText(t('addCustomMonster'));
        customMonsterEl.addEventListener("click", () => {
            contentEl.addClass('shanhai-content-fading'); // Start fade out
            setTimeout(() => {
                this.drawCustomMonsterUI(); // Redraw UI after fade out
                contentEl.removeClass('shanhai-content-fading'); // Fade in new content
            }, 200); // Duration should match CSS transition
        });

        const themes: { [key: string]: MonsterTemplate[] } = {};
        MONSTERS.forEach(monster => {
            if (!themes[monster.theme]) {
                themes[monster.theme] = [];
            }
            themes[monster.theme].push(monster);
        });

        const THEME_NAMES: { [key: string]: string } = {
            farming: t('themeFarming'),
            mining: t('themeMining'),
            sea: t('themeSea'),
            cosmos: t('themeCosmos')
        };

        for (const themeId in themes) {
            const themeName = THEME_NAMES[themeId] || themeId;
            contentEl.createEl("h2", { text: themeName });
            const monsterListEl = contentEl.createDiv({ cls: "shanhai-monster-list" });
            themes[themeId].forEach(monster => {
                const monsterEl = monsterListEl.createDiv({ cls: "shanhai-monster-item" });
                const stars = '⭐'.repeat(monster.tier);
                
                const isEnglish = moment.locale().startsWith('en');
                const displayName = isEnglish && monster.en_name 
                    ? `${monster.en_name} (${monster.name})` 
                    : monster.name;

                monsterEl.setText(`${displayName} ${stars}`);
                monsterEl.addEventListener("click", () => {
                    const newMonster: Monster = {
                        ...monster,
                        currentHp: monster.maxHp,
                        battleStartTime: Date.now()
                    };
                    this.plugin.activeMonster = newMonster;
                    this.plugin.playerData.currentTheme = newMonster.theme;
                    this.plugin.savePluginData();
                    this.plugin.updateView();
                    this.close();
                });
            });
        }
    }

    private drawCustomMonsterUI() {
        const { contentEl } = this;
        contentEl.empty();
        this.modalEl.addClass('shanhai-custom-monster-modal-size'); // Add class to the modal itself

        contentEl.createEl("h1", { text: t('customizeYourOpponent') });

        const nameInput = contentEl.createEl("input", { 
            type: "text", 
            placeholder: t('monsterNamePlaceholder')
        });
        nameInput.addClass("shanhai-monster-name-input");

        contentEl.createEl("p", { text: t('selectStarRating'), cls: "shanhai-star-label" });
        const starContainer = contentEl.createDiv({ cls: "shanhai-star-container" });
        let selectedStar = 1;

        for (let i = 1; i <= 5; i++) {
            const starEl = starContainer.createEl("span", { text: "★" });
            starEl.dataset.starValue = String(i);
            if (i > selectedStar) {
                starEl.addClass("inactive");
            }
            starEl.addEventListener("click", () => {
                selectedStar = i;
                starContainer.childNodes.forEach((node, index) => {
                    const star = node as HTMLElement;
                    if (index < selectedStar) {
                        star.removeClass("inactive");
                    } else {
                        star.addClass("inactive");
                    }
                });
            });
        }

        contentEl.createEl("p", { text: t('selectTheme'), cls: "shanhai-star-label" });
        const THEME_NAMES: { [key: string]: string } = {
            farming: t('themeFarming'),
            mining: t('themeMining'),
            sea: t('themeSea'),
            cosmos: t('themeCosmos')
        };

        const themeButtonContainer = contentEl.createDiv({ cls: "shanhai-theme-buttons-container" });
        let selectedTheme = "";
        const themeButtons: HTMLElement[] = [];

        for (const themeId in THEME_NAMES) {
            const themeButton = themeButtonContainer.createEl("button", {
                text: THEME_NAMES[themeId],
                cls: "shanhai-theme-button"
            });
            themeButton.dataset.themeId = themeId;
            themeButtons.push(themeButton);

            themeButton.addEventListener("click", () => {
                selectedTheme = themeId;
                themeButtons.forEach(btn => {
                    btn.removeClass("active");
                });
                themeButton.addClass("active");
                validateInput();
            });
        }

        const challengeButton = contentEl.createEl("button", { text: t('startChallenge') });
        challengeButton.disabled = true;

        const validateInput = () => {
            challengeButton.disabled = !nameInput.value || !selectedTheme;
        };

        nameInput.addEventListener('input', validateInput);

        challengeButton.addEventListener("click", () => {
            const name = nameInput.value;
            const theme = selectedTheme;
            const hpMap = [50, 250, 500, 1000, 2000];
            const newMonster: Monster = {
                id: `custom-${Date.now()}`,
                name: name,
                tier: selectedStar,
                maxHp: hpMap[selectedStar - 1],
                currentHp: hpMap[selectedStar - 1],
                theme: theme,
                description: t('customMonsterDescription'),
                image: '',
                battleStartTime: Date.now()
            };

            this.plugin.activeMonster = newMonster;
            this.plugin.playerData.currentTheme = theme;
            this.plugin.savePluginData();
            this.plugin.updateView();
            this.close();
        });
    }

    onClose() {
        this.modalEl.removeClass('shanhai-custom-monster-modal-size');
        const { contentEl } = this;
        contentEl.empty();
    }
}