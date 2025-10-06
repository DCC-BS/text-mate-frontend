<script setup lang="ts">
interface AutocompleteSuggestion {
    text: string;
    type: "word" | "phrase" | "correction";
    description?: string;
}

interface Props {
    suggestions: AutocompleteSuggestion[];
    isVisible: boolean;
    selectedIndex: number;
    position: { x: number; y: number };
}

interface Emits {
    (e: "select", suggestion: AutocompleteSuggestion): void;
    (e: "hide"): void;
    (e: "navigate", direction: "up" | "down" | number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const containerRef = ref<HTMLElement>();

// Handle keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
    if (!props.isVisible) return;

    switch (event.key) {
        case "ArrowDown":
            event.preventDefault();
            emit("navigate", "down");
            break;
        case "ArrowUp":
            event.preventDefault();
            emit("navigate", "up");
            break;
        case "Enter":
        case "Tab":
            event.preventDefault();
            if (
                props.selectedIndex >= 0 &&
                props.selectedIndex < props.suggestions.length
            ) {
                const selectedSuggestion =
                    props.suggestions[props.selectedIndex];
                if (selectedSuggestion) {
                    emit("select", selectedSuggestion);
                }
            }
            break;
        case "Escape":
            event.preventDefault();
            emit("hide");
            break;
    }
};

// Handle mouse click on suggestion
const selectSuggestion = (suggestion: AutocompleteSuggestion) => {
    emit("select", suggestion);
};

// Position the popup
const popupStyle = computed(() => ({
    left: `${props.position.x}px`,
    top: `${props.position.y}px`,
    display: props.isVisible ? "block" : "none",
}));

// Get icon for suggestion type
const getSuggestionIcon = (type: AutocompleteSuggestion["type"]) => {
    switch (type) {
        case "word":
            return "i-lucide-type";
        case "phrase":
            return "i-lucide-message-square";
        case "correction":
            return "i-lucide-sparkles";
        default:
            return "i-lucide-lightbulb";
    }
};

// Close on click outside
const handleClickOutside = (event: MouseEvent) => {
    if (
        containerRef.value &&
        !containerRef.value.contains(event.target as Node)
    ) {
        emit("hide");
    }
};

onMounted(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <div
        ref="containerRef"
        class="autocomplete-popup fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm overflow-hidden"
        :style="popupStyle"
        v-if="isVisible"
    >
        <div class="max-h-48 overflow-y-auto">
            <div
                v-for="(suggestion, index) in suggestions"
                :key="index"
                class="autocomplete-suggestion px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{
                    'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500': index === selectedIndex
                }"
                @click="selectSuggestion(suggestion)"
                @mouseenter="$emit('navigate', index)"
            >
                <UIcon
                    :name="getSuggestionIcon(suggestion.type)"
                    class="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ suggestion.text }}
                    </div>
                    <div
                        v-if="suggestion.description"
                        class="text-xs text-gray-500 dark:text-gray-400 truncate"
                    >
                        {{ suggestion.description }}
                    </div>
                </div>
                <div class="text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {{ suggestion.type }}
                </div>
            </div>
        </div>
        
        <div class="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div class="text-xs text-gray-500 dark:text-gray-400">
                Use arrow keys to navigate, Enter to select, Esc to close
            </div>
        </div>
    </div>
</template>

<style scoped>
.autocomplete-popup {
    min-width: 200px;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
}

.autocomplete-suggestion {
    border-left: 2px solid transparent;
}

.autocomplete-suggestion:hover {
    border-left-color: #3b82f6;
}
</style>
