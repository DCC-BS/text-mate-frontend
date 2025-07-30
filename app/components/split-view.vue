<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import { computed, onUnmounted, ref, type StyleValue, watch } from "vue";

interface SplitViewProps {
    aPaneStyle?: string;
    bPaneStyle?: string;
    splitViewStyle?: string;
    resizerStyle?: string;
    resizerInnerStyle?: string;
    isHorizontal?: boolean;
}

const props = withDefaults(defineProps<SplitViewProps>(), {
    aPaneStyle: "",
    bPaneStyle: "",
    splitViewStyle: "",
    resizerStyle: "",
    resizerInnerStyle: "",
    isHorizontal: false,
});

const defaultClickedResizerInnerStyle = "bg-blue-200";

const verticalSplitViewStyle = "flex w-full h-full";
const verticalAPaneStyle = "overflow-auto";
const verticalBPaneStyle = "overflow-auto";
const verticalResizerStyle =
    "w-[16px] cursor-col-resize relative pointer-events-auto flex justify-center";
const verticalResizerInnerStyle = "bg-gray-100 w-[2px] h-full";

const horizontalSplitViewStyle = "flex flex-col w-full h-full";
const horizontalAPaneStyle = "overflow-auto";
const horizontalBPaneStyle = "overflow-auto";
const horizontalResizerStyle =
    "h-[16px] cursor-row-resize relative pointer-events-auto flex items-center";
const horizontalResizerInnerStyle = "bg-gray-100 h-[2px] w-full";

const aPaneCssStyle = ref<StyleValue>();
const bPaneCssStyle = ref<StyleValue>();
const resizerIsSelected = ref(false);

watch(
    () => props.isHorizontal,
    () => {
        if (props.isHorizontal) {
            aPaneCssStyle.value = { height: "50%" };
            bPaneCssStyle.value = { height: "50%" };
        } else {
            aPaneCssStyle.value = { width: "50%" };
            bPaneCssStyle.value = { width: "50%" };
        }
    },
    { immediate: true },
);

const aPaneStyle = computed(() =>
    twMerge(
        props.isHorizontal ? horizontalAPaneStyle : verticalAPaneStyle,
        props.aPaneStyle,
    ),
);
const bPaneStyle = computed(() =>
    twMerge(
        props.isHorizontal ? horizontalBPaneStyle : verticalBPaneStyle,
        props.bPaneStyle,
    ),
);
const splitViewStyle = computed(() =>
    twMerge(
        props.isHorizontal ? horizontalSplitViewStyle : verticalSplitViewStyle,
        props.splitViewStyle,
    ),
);
const resizerStyle = computed(() =>
    twMerge(
        props.isHorizontal ? horizontalResizerStyle : verticalResizerStyle,
        props.resizerStyle,
    ),
);
const resizerInnerStyle = computed(() => {
    let styles = props.isHorizontal
        ? horizontalResizerInnerStyle
        : verticalResizerInnerStyle;
    if (resizerIsSelected.value) {
        styles = twMerge(styles, defaultClickedResizerInnerStyle);
    }

    return twMerge(styles, props.resizerInnerStyle);
});

const startResize = (e: MouseEvent) => {
    e.preventDefault();
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
    resizerIsSelected.value = true;
};

const resize = (e: MouseEvent) => {
    if (!e.target || !(e.target instanceof HTMLElement)) return;

    const container = e.target.closest(".split-view") as HTMLElement;

    if (props.isHorizontal) {
        const newHeight =
            ((e.clientY - container.offsetTop) / container.offsetHeight) * 100;
        const h = Math.min(Math.max(newHeight, 1), 99);
        aPaneCssStyle.value = { height: `${h}%` };
        bPaneCssStyle.value = { height: `${100 - h}%` };
    } else {
        const newWidth =
            ((e.clientX - container.offsetLeft) / container.offsetWidth) * 100;
        const w = Math.min(Math.max(newWidth, 1), 99);
        aPaneCssStyle.value = { width: `${w}%` };
        bPaneCssStyle.value = { width: `${100 - w}%` };
    }
};

const stopResize = () => {
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResize);
    resizerIsSelected.value = false;
};

onUnmounted(() => {
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResize);
});
</script>

<template>
    <div class="split-view" :class="splitViewStyle">
        <div :class="aPaneStyle" :style="aPaneCssStyle">
            <slot name="a" />
        </div>
        <div :class="resizerStyle" @mousedown="startResize">
            <div :class="resizerInnerStyle" />
        </div>
        <div :class="bPaneStyle" :style="bPaneCssStyle">
            <slot name="b" />
        </div>
    </div>
</template>
