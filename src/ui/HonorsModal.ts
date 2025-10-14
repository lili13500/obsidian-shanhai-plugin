import { App, Modal } from "obsidian";
import ShanhaiPlugin from "../main";
import { t } from "../lang/translator";

export class HonorsModal extends Modal {
    plugin: ShanhaiPlugin;

    constructor(app: App, plugin: ShanhaiPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("shanhai-honors-modal");

        contentEl.createEl("h1", { text: t('unlockedTitles') });

        // Add stats container
        contentEl.createDiv({ cls: "shanhai-honors-stats" });

        const titles = this.plugin.playerData.unlockedTitles;

        if (titles.length === 0) {
            contentEl.createEl("p", { text: t('noTitlesYet') });
            this.updateStats(); // Update stats to show "0"
            return;
        }

        titles.sort((a, b) => b.star - a.star);

        const cloudContainer = contentEl.createDiv({ cls: "shanhai-cloud-container" });

        titles.forEach(title => {
            this.createTitleSpan(cloudContainer, title);
        });

        this.updateStats(); // Initial stats calculation
    }

    private updateStats() {
        const statsContainer = this.contentEl.querySelector(".shanhai-honors-stats");
        if (!statsContainer) return;

        const titles = this.plugin.playerData.unlockedTitles;
        const counts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        titles.forEach(title => {
            if (counts[title.star] !== undefined) {
                counts[title.star]++;
            }
        });

        const statsHtml = Object.keys(counts).map(starStr => {
            const star = parseInt(starStr);
            return `<span class="stats-star-${star}">${t('starRating', star, counts[star])}</span>`;
        }).join(" | ");

        statsContainer.innerHTML = statsHtml;
    }

    private createTitleSpan(container: HTMLElement, title: any) {
        const titleSpan = container.createEl("span", { text: title.title });
        titleSpan.addClass(`star-${title.star}`);
        titleSpan.dataset.unlockedAt = new Date(title.unlockedAt).toLocaleString();
        let initialRotation = Math.random() * 90 - 45;
        titleSpan.style.transform = `rotate(${initialRotation}deg)`;

        // Drag and Rotate Logic
        titleSpan.onmousedown = (e_down) => {
            e_down.preventDefault();
            const initialX = e_down.clientX;
            const initialY = e_down.clientY;
            const initialTop = titleSpan.offsetTop;
            const initialLeft = titleSpan.offsetLeft;

            const onMouseMove = (e_move: MouseEvent) => {
                const deltaX = e_move.clientX - initialX;
                const deltaY = e_move.clientY - initialY;

                // Move the element
                titleSpan.style.left = `${initialLeft + deltaX}px`;
                titleSpan.style.top = `${initialTop + deltaY}px`;

                // Rotate based on horizontal movement
                const rotation = initialRotation + deltaX * 0.1; // Adjust sensitivity
                titleSpan.style.transform = `rotate(${rotation}deg)`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        // Add delete button
        const deleteBtn = titleSpan.createEl("div", { cls: "shanhai-title-delete-btn", text: "×" });
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            const titleIndex = this.plugin.playerData.unlockedTitles.findIndex(t => t.title === title.title && t.unlockedAt === title.unlockedAt);
            if (titleIndex > -1) {
                this.plugin.playerData.unlockedTitles.splice(titleIndex, 1);
                this.plugin.savePluginData();
            }

            titleSpan.remove();
            this.updateStats(); // Update stats after deletion
        });

        // Initial Position
        let top = Math.random() * 80 + 10; // Avoid edges
        let left = Math.random() * 80 + 10;
        if (title.star === 5) {
            top = 40 + (Math.random() * 20 - 10);
            left = 40 + (Math.random() * 20 - 10);
        }
        titleSpan.style.top = `${top}%`;
        titleSpan.style.left = `${left}%`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}