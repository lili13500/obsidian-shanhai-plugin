import type { Sounds } from "./types";

// This map is a simplified version of the one found in the reference project.
// It maps KeyboardEvent.code values to the sound names in our Sounds interface.
export const KEY_SOUND_MAP: Partial<Record<string, keyof Sounds>> = {
    "Enter": "enter",
    "NumpadEnter": "enter",
    "Space": "space",
    "Backspace": "delete",
    "Delete": "delete",
    "ArrowLeft": "key2",
    "ArrowRight": "key2",
    "ArrowUp": "key2",
    "ArrowDown": "key2",
    "Tab": "key2",
    "Escape": "key2",
}
