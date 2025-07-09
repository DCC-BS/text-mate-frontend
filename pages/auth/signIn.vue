<script setup lang="ts">
// Remember to disable the middleware protection from your page!
definePageMeta({
    auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: "/" },
    layout: "auth",
});

const { signIn } = useAuth();
const { t } = useI18n();

// Add reactive state for loading animation
const isLoading = ref(true);
const loadingText = ref(t("auth.connecting"));

// Simulate loading states for better UX
const loadingStates = [
    t("auth.connecting"),
    t("auth.authenticating"),
    t("auth.redirecting"),
];

let currentStateIndex = 0;

onMounted(() => {
    // Cycle through loading states
    const loadingInterval = setInterval(() => {
        currentStateIndex = (currentStateIndex + 1) % loadingStates.length;
        loadingText.value = loadingStates[currentStateIndex];
    }, 1000);

    setTimeout(() => {
        signIn("azure-ad");
    }, 1500);

    // Cleanup interval after 10 seconds
    setTimeout(() => {
        clearInterval(loadingInterval);
    }, 10000);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 relative overflow-hidden">
    <!-- Animated background elements -->
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
      <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
      <div class="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
      <!-- Logo/Brand area -->
      <div class="mb-12 text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg mb-6 animate-bounce">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-gray-800 mb-2">{{ t("auth.welcomeBack") }}</h1>
        <p class="text-gray-600">{{ t("auth.signInToContinue") }}</p>
      </div>

      <!-- Loading card -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md w-full border border-white/20">
        <div class="text-center">
          <!-- Loading text with animation -->
          <h2 class="text-2xl font-semibold text-gray-800 mb-4 animate-pulse">
            {{ loadingText }}
          </h2>
          
          <!-- Description -->
          <p class="text-gray-600 mb-6 leading-relaxed">
            {{ t("auth.azureAdDescription") }}
          </p>

          <!-- Progress dots -->
          <div class="flex justify-center space-x-2">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-200"></div>
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-400"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom animation delays */
.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-400 {
  animation-delay: 0.4s;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Custom bounce animation for progress dots */
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

/* Glassmorphism effect enhancement */
.bg-white\/80 {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Smooth transitions */
* {
  transition: all 0.3s ease;
}
</style>