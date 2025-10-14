import type { Editor } from 'obsidian';
import { random } from 'lodash';
import { isUrl } from '../utils';
import type { ISetting } from '../../types';

let count = -1;
const activeExplosions: { el: HTMLElement; clock: NodeJS.Timeout; }[] = [];

/**
 * Triggers an explosion effect at a specific location within a given container.
 * This is the core logic, decoupled from the editor.
 */
export function triggerExplosion(container: HTMLElement, x: number, y: number, setting: ISetting) {
    count++;
    const { enable } = setting.explosion;
    const {
        frequency = 1,
        backgroundMode = 'image',
        maxExplosions = 1,
        size = 1,
        imageList = [],
        explosionOrder = 'random',
        duration = 1000,
        offset = 0,
        customStyle,
        gifMode = 'continue',
    } = setting.useCustom ? (setting.customEffect || {}) : setting.explosion;

    if (!enable || count % frequency !== 0 || imageList.length === 0) {
        return;
    }

    const el = container.createDiv({
        cls: ['power-mode-explosion', 'power-mode-explosion-' + backgroundMode],
        attr: {
            style: `left:${x}px;top:${y}px;width:${size}ch;height:${size}rem;`,
        },
    });

    const clock = setTimeout(() => {
        el.remove();
        const index = activeExplosions.findIndex(item => item.el === el);
        if (index > -1) {
            activeExplosions.splice(index, 1);
        }
    }, duration);

    activeExplosions.push({ el, clock });

    while (maxExplosions > 0 && activeExplosions.length > maxExplosions) {
        const deleteOne = activeExplosions.shift();
        if (deleteOne) {
            deleteOne.el.remove();
            clearTimeout(deleteOne.clock);
        }
    }

    let [url] = imageList;
    switch (explosionOrder) {
        case 'random':
            url = imageList[random(0, imageList.length - 1)];
            break;
        case 'sequential':
            url = imageList[count % imageList.length];
            break;
        default:
            url = imageList[explosionOrder] || imageList[0];
            break;
    }
    el.style.marginTop = `${-(offset || 0) * size}rem`;

    if (gifMode === 'restart') {
        if (isUrl(url)) {
            let separate = '?';
            if (url.includes('?')) {
                separate = '&';
            }
            url += separate + 't=' + String(Date.now());
        } else {
            url = url.replace('base64,', `t=${Date.now()};base64,`);
        }
    }

    if (backgroundMode === 'image') {
        el.style.backgroundImage = `url(${url})`;
    } else {
        el.style.webkitMaskImage = `url(${url})`;
        el.style.maskImage = `url(${url})`;
    }

    if (customStyle) {
        const keys = Object.keys(customStyle) as (keyof Omit<CSSStyleDeclaration, 'length' | 'parentRule'>)[];
        keys.forEach(key => (el.style[key as any] = customStyle[key as any]!));
    }
}

/**
 * The original function, now a wrapper around triggerExplosion.
 * It gets the necessary parameters from the editor and calls the core logic.
 */
export function explosion(editor: Editor, setting: ISetting) {
    const editorAny = editor as any;
    const pos = editorAny.getCursor();
    const coord = editorAny.coordsAtPos(pos, true);
    const { left, top } = coord;
    const container = editorAny.containerEl;
    const scroll = editor.getScrollInfo();

    triggerExplosion(container, left, top - scroll.top, setting);
}
