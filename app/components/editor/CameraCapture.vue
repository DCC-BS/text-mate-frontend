<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";

const props = defineProps<{
    /** Whether the capture dialog is open. */
    open: boolean;
}>();

const emit = defineEmits<{
    "update:open": [open: boolean];
    /** Emitted with the captured photo when the user accepts it. */
    captured: [file: File];
}>();

/** Quality of the captured JPEG (canvas → blob encoding). */
const JPEG_QUALITY = 0.92;

/**
 * Two-step flow: live camera view first, then a frozen preview the user
 * accepts or retakes. Only an accepted photo is uploaded.
 */
type CaptureState = "camera" | "preview";

const state = ref<CaptureState>("camera");
const isStarting = ref(false);
const cameraError = ref(false);
const videoRef = ref<HTMLVideoElement>();
/** The captured photo awaiting accept/retake; drives the preview URL. */
const capturedBlob = ref<Blob>();
const previewUrl = ref<string>();
const stream = ref<MediaStream>();

/** Camera capture needs the MediaDevices API; hidden when unavailable. */
const isCaptureSupported = computed(
    () => import.meta.client && Boolean(navigator.mediaDevices?.getUserMedia),
);

/** Fullscreen dialog on phone-sized screens, dialog on larger ones. */
const isFullscreen = useMediaQuery("(max-width: 639px)");

const { t } = useI18n();

/**
 * Requests the rear camera (falling back to any camera) and starts the
 * live preview.
 */
async function startCamera(): Promise<void> {
    stopCamera();
    cameraError.value = false;
    isStarting.value = true;
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 2560 },
                height: { ideal: 1440 },
            },
            audio: false,
        });
        stream.value = mediaStream;
        await nextTick();
        const video = videoRef.value;
        if (video) {
            video.srcObject = mediaStream;
            await video.play();
        }
    } catch {
        cameraError.value = true;
    } finally {
        isStarting.value = false;
    }
}

/** Stops all tracks and detaches the live preview. */
function stopCamera(): void {
    for (const track of stream.value?.getTracks() ?? []) {
        track.stop();
    }
    stream.value = undefined;
    const video = videoRef.value;
    if (video) {
        video.srcObject = null;
    }
}

/** Grabs the current video frame as a JPEG blob and shows the preview. */
function capturePhoto(): void {
    const video = videoRef.value;
    if (!video?.videoWidth || !video.videoHeight) {
        return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
        return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob(
        (blob) => {
            if (!blob) {
                return;
            }
            capturedBlob.value = blob;
            previewUrl.value = URL.createObjectURL(blob);
            stopCamera(); // Free the camera while the user reviews the shot.
            state.value = "preview";
        },
        "image/jpeg",
        JPEG_QUALITY,
    );
}

/** Hands the accepted photo to the upload flow and closes the dialog. */
function acceptPhoto(): void {
    const blob = capturedBlob.value;
    if (!blob) {
        return;
    }
    const fileName = `camera-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
    emit("captured", new File([blob], fileName, { type: "image/jpeg" }));
    close();
}

/** Discards the current shot and returns to the live camera. */
function retakePhoto(): void {
    releasePreview();
    state.value = "camera";
    startCamera();
}

/** Frees the captured blob and its preview URL. */
function releasePreview(): void {
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = undefined;
    }
    capturedBlob.value = undefined;
}

/** Closes the dialog and releases camera and preview resources. */
function close(): void {
    stopCamera();
    releasePreview();
    state.value = "camera";
    cameraError.value = false;
    emit("update:open", false);
}

// Start/stop the camera with the dialog and release it on unmount.
watch(
    () => props.open,
    (open) => {
        if (open) {
            state.value = "camera";
            cameraError.value = false;
            startCamera();
        } else {
            stopCamera();
            releasePreview();
        }
    },
);
onUnmounted(() => {
    stopCamera();
    releasePreview();
});
</script>

<template>
    <UModal
        v-if="isCaptureSupported"
        :open="open"
        :fullscreen="isFullscreen"
        :dismissible="false"
        :ui="{ content: 'bg-gray-50 dark:bg-gray-900' }"
        @update:open="emit('update:open', $event)"
    >
        <template #content>
            <div class="flex flex-col h-full w-full overflow-hidden">
                <!-- Header -->
                <div
                    class="flex justify-between items-center p-3 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700"
                >
                    <span class="text-sm font-medium truncate">
                        {{ t("upload.cameraTitle") }}
                    </span>
                    <UButton
                        icon="i-lucide-x"
                        variant="ghost"
                        color="neutral"
                        :aria-label="t('upload.close')"
                        data-testid="cameraCaptureClose"
                        @click="close"
                    />
                </div>

                <!-- Live camera / frozen preview / error -->
                <div
                    class="flex-1 min-h-0 relative flex items-center justify-center bg-black"
                >
                    <video
                        v-show="state === 'camera' && !cameraError"
                        ref="videoRef"
                        class="w-full h-full object-contain"
                        playsinline
                        muted
                    />

                    <img
                        v-if="state === 'preview' && previewUrl"
                        :src="previewUrl"
                        :alt="t('upload.cameraPreviewAlt')"
                        class="w-full h-full object-contain"
                    >

                    <div
                        v-if="isStarting && state === 'camera'"
                        class="absolute inset-0 flex items-center justify-center"
                    >
                        <UIcon
                            name="i-lucide-loader-circle"
                            class="animate-spin text-3xl text-white"
                        />
                    </div>

                    <div
                        v-if="cameraError"
                        class="flex flex-col items-center gap-3 p-6 text-center text-white"
                    >
                        <UIcon name="i-lucide-camera-off" class="text-3xl" />
                        <p>{{ t("upload.cameraError") }}</p>
                        <UButton
                            :label="t('upload.cameraRetry')"
                            color="neutral"
                            variant="soft"
                            @click="startCamera"
                        />
                    </div>
                </div>

                <!-- Controls -->
                <div
                    class="flex items-center justify-center gap-4 p-4 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700"
                >
                    <template v-if="state === 'camera'">
                        <UButton
                            icon="i-lucide-camera"
                            size="xl"
                            :disabled="isStarting || cameraError"
                            :aria-label="t('upload.cameraCapture')"
                            data-testid="cameraCaptureShutter"
                            @click="capturePhoto"
                        >
                            {{ t("upload.cameraCapture") }}
                        </UButton>
                    </template>
                    <template v-else>
                        <UButton
                            icon="i-lucide-rotate-ccw"
                            color="neutral"
                            variant="soft"
                            data-testid="cameraCaptureRetake"
                            @click="retakePhoto"
                        >
                            {{ t("upload.cameraRetake") }}
                        </UButton>
                        <UButton
                            icon="i-lucide-check"
                            color="success"
                            data-testid="cameraCaptureAccept"
                            @click="acceptPhoto"
                        >
                            {{ t("upload.cameraAccept") }}
                        </UButton>
                    </template>
                </div>
            </div>
        </template>
    </UModal>
</template>
