import { App, PluginSettingTab, Setting } from "obsidian";
import type ShanhaiPlugin from "./main";
import { EXPLOSION_PRESETS } from "./config/effects-presets";
import { triggerExplosion } from "./feedback/effects/Explosion"; // Import the new function
import { THEME_CONFIG } from "./config/game-data";
import { t } from "./lang/translator";

export class ShanhaiSettingTab extends PluginSettingTab {
    plugin: ShanhaiPlugin;

    constructor(app: App, plugin: ShanhaiPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // --- Explosion Settings ---
        const explosionDetails = containerEl.createEl('details', { attr: { open: true } });
        explosionDetails.createEl('summary', { text: t('cursorEffects') });

        new Setting(explosionDetails)
            .setName(t('enableEffects'))
            .addToggle(toggle => 
                toggle
                    .setValue(this.plugin.settings.explosion.enable)
                    .onChange(async (value) => {
                        this.plugin.settings.explosion.enable = value;
                        await this.plugin.savePluginData();
                    })
            );

        new Setting(explosionDetails)
            .setName(t('effectPreset'))
            .setDesc(t('effectPresetDesc'))
            .addDropdown(dropdown => {
                EXPLOSION_PRESETS.forEach((preset, index) => {
                    dropdown.addOption(String(index), preset.type);
                });
                dropdown.setValue(String(this.plugin.settings.explosionPreset))
                    .onChange(async (value) => {
                        const presetIndex = Number(value);
                        const preset = EXPLOSION_PRESETS[presetIndex];
                        if (!preset) return;

                        const isEnabled = this.plugin.settings.explosion.enable;
                        this.plugin.settings.explosionPreset = presetIndex;
                        this.plugin.settings.explosion = {
                            enable: isEnabled,
                            maxExplosions: preset.config.maxExplosions ?? this.plugin.settings.explosion.maxExplosions,
                            size: preset.config.size ?? this.plugin.settings.explosion.size,
                            frequency: preset.config.frequency ?? this.plugin.settings.explosion.frequency,
                            explosionOrder: preset.config.explosionOrder ?? this.plugin.settings.explosion.explosionOrder,
                            gifMode: preset.config.gifMode ?? this.plugin.settings.explosion.gifMode,
                            duration: preset.config.duration ?? this.plugin.settings.explosion.duration,
                            offset: preset.config.offset ?? this.plugin.settings.explosion.offset,
                            backgroundMode: preset.config.backgroundMode ?? this.plugin.settings.explosion.backgroundMode,
                            imageList: preset.config.imageList ?? this.plugin.settings.explosion.imageList,
                        };
                        await this.plugin.savePluginData();
                        this.display();
                    });
            })
            .addButton(button => {
                button
                    .setButtonText(t('preview'))
                    .setCta()
                    .onClick(() => {
                        const rect = button.buttonEl.getBoundingClientRect();
                        // Trigger explosion at the button's location
                        triggerExplosion(document.body, rect.left + (rect.width / 2), rect.top + (rect.height / 2), this.plugin.settings);
                    });
            });

        new Setting(explosionDetails)
            .setName(t('effectSize'))
            .addSlider(slider =>
                slider.setLimits(1, 100, 1).setValue(this.plugin.settings.explosion.size).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.explosion.size = value; await this.plugin.savePluginData(); })
            );

        new Setting(explosionDetails)
            .setName(t('effectFrequency'))
            .addSlider(slider =>
                slider.setLimits(1, 100, 1).setValue(this.plugin.settings.explosion.frequency).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.explosion.frequency = value; await this.plugin.savePluginData(); })
            );

        new Setting(explosionDetails)
            .setName(t('effectDuration'))
            .addSlider(slider =>
                slider.setLimits(100, 5000, 100).setValue(this.plugin.settings.explosion.duration).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.explosion.duration = value; await this.plugin.savePluginData(); })
            );

        new Setting(explosionDetails)
            .setName(t('verticalOffset'))
            .addSlider(slider =>
                slider.setLimits(0, 1, 0.01).setValue(this.plugin.settings.explosion.offset).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.explosion.offset = value; await this.plugin.savePluginData(); })
            );

        new Setting(explosionDetails)
            .setName(t('maxEffects'))
            .addSlider(slider =>
                slider.setLimits(1, 100, 1).setValue(this.plugin.settings.explosion.maxExplosions).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.explosion.maxExplosions = value; await this.plugin.savePluginData(); })
            );

        new Setting(explosionDetails)
            .setName(t('triggerOrder'))
            .addDropdown(dropdown => {
                dropdown.addOption('random', t('random')).addOption('sequential', t('sequential')).setValue(this.plugin.settings.explosion.explosionOrder || 'random')
                    .onChange(async (value) => { this.plugin.settings.explosion.explosionOrder = value as 'random' | 'sequential'; await this.plugin.savePluginData(); });
            });

        new Setting(explosionDetails)
            .setName(t('backgroundMode'))
            .addDropdown(dropdown => {
                dropdown.addOption('mask', t('mask')).addOption('image', t('image')).setValue(this.plugin.settings.explosion.backgroundMode)
                    .onChange(async (value) => { this.plugin.settings.explosion.backgroundMode = value as 'mask' | 'image'; await this.plugin.savePluginData(); });
            });

        // --- Flow Settings ---
        const flowDetails = containerEl.createEl('details', { attr: { open: true } });
        flowDetails.createEl('summary', { text: t('flowSettings') });

        new Setting(flowDetails)
            .setName(t('flowTime'))
            .setDesc(t('flowTimeDesc'))
            .addSlider(slider => {
                slider.setLimits(1, 10, 1).setValue(this.plugin.settings.flow.holdTime).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.flow.holdTime = value; await this.plugin.savePluginData(); });
            });

        // --- Screen Shake Settings ---
        const shakeDetails = containerEl.createEl('details', { attr: { open: true } });
        shakeDetails.createEl('summary', { text: t('screenShake') });

        new Setting(shakeDetails)
            .setName(t('enableShake'))
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.shakeScreen.enable)
                    .onChange(async (value) => { this.plugin.settings.shakeScreen.enable = value; await this.plugin.savePluginData(); })
            );

        new Setting(shakeDetails)
            .setName(t('shakeIntensity'))
            .addSlider(slider =>
                slider.setLimits(1, 100, 1).setValue(this.plugin.settings.shakeScreen.intensity).setDynamicTooltip()
                    .onChange(async (value) => { this.plugin.settings.shakeScreen.intensity = value; await this.plugin.savePluginData(); })
            );

        // --- Sound Settings ---
        const soundDetails = containerEl.createEl('details', { attr: { open: true } });
        soundDetails.createEl('summary', { text: t('soundSettings') });

        new Setting(soundDetails)
            .setName(t('enableSound'))
            .addToggle(toggle => 
                toggle.setValue(this.plugin.settings.sound.isEnabled)
                    .onChange(async (value) => { this.plugin.settings.sound.isEnabled = value; await this.plugin.savePluginData(); })
            );

        new Setting(soundDetails)
            .setName(t('volume'))
            .addSlider(slider => 
                slider.setLimits(0, 100, 1).setValue(this.plugin.settings.sound.volume).setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.sound.volume = value;
                        if (this.plugin.audioPlayer) {
                            this.plugin.audioPlayer.setVolume(value);
                        }
                        await this.plugin.savePluginData();
                    })
            )
            .addButton(button => {
                button
                    .setButtonText(t('test'))
                    .setCta()
                    .onClick(() => {
                        this.plugin.playTestSound();
                    });
            });

        new Setting(soundDetails)
            .setName(t('soundPack'))
            .addDropdown(async dropdown => {
                if (!this.plugin.audioPlayer) return;
                const soundPacks = await this.plugin.audioPlayer.getInstalledSoundPacks();
                Object.keys(soundPacks).forEach(packId => {
                    dropdown.addOption(packId, soundPacks[packId]);
                });
                dropdown.setValue(this.plugin.settings.sound.activeSoundPackId)
                    .onChange(async (value) => {
                        this.plugin.settings.sound.activeSoundPackId = value;
                        await this.plugin.savePluginData();
                        this.plugin.soundsLoaded = false;
                    });
            });

        // --- Support Me ---
        const supportDetails = containerEl.createEl('details');
        supportDetails.createEl('summary', { text: '支持开发者 (Support Me)' });
        const supportDiv = supportDetails.createDiv('support-me');
        supportDiv.createEl('p', { text: '如果你觉得这个插件对你有帮助，欢迎通过微信扫码请我喝杯咖啡。非常感谢你的支持！' });
        supportDiv.createEl('p', { text: 'If you find this plugin helpful, feel free to buy me a coffee via WeChat Pay. Your support is greatly appreciated!' });
        
        const qrImg = supportDiv.createEl('img');
        // @ts-ignore
        qrImg.src = this.app.vault.adapter.getResourcePath(this.plugin.manifest.dir + '/assets/wechat-pay.png');
        qrImg.alt = 'WeChat Pay QR Code';
        qrImg.style.maxWidth = '200px';
        qrImg.style.display = 'block';
        qrImg.style.margin = '0 auto';
    }
}