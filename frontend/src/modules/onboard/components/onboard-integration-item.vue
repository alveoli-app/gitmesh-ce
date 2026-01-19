<template>
  <div 
    class="group relative w-full h-full flex flex-col bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 shadow-2xl"
    :class="{ 'ring-1 ring-orange-500/20 bg-orange-500/[0.02]': integration.onboard?.highlight }"
  >
    <div class="flex justify-between items-center px-3 py-1 border-b border-zinc-900 bg-black/50">
      <span class="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.2em]">MOD_ID: {{ integration.id }}</span>
      <div class="flex gap-1">
        <span class="w-1 h-1 bg-zinc-800"></span>
        <span class="w-1 h-1 bg-zinc-800"></span>
      </div>
    </div>

    <div 
      class="absolute left-0 top-[26px] bottom-0 w-[2px] transition-all duration-500 group-hover:w-[3px]"
      :class="[statusColor, isDone ? 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' : '']"
    ></div>

    <div class="p-5 flex flex-col h-full relative overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(234,88,12,0.03)_50%,transparent_100%)] -translate-y-full group-hover:animate-[scan_4s_linear_infinite] pointer-events-none"></div>

      <div class="flex items-start gap-4 mb-4 relative z-10">
        <div class="relative shrink-0">
          <div class="w-12 h-12 flex items-center justify-center bg-black border border-zinc-800 group-hover:border-zinc-700 transition-colors rounded-none p-2.5 shadow-inner">
            <img 
              :alt="integration.name" 
              :src="integration.image" 
              class="w-full h-full object-contain transition-all duration-300 filter grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100"
              :class="{ 'invert-icon': integration.id === 'github' }" 
            />
          </div>
          
          <div class="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black border border-zinc-800 flex items-center justify-center">
            <div class="w-1 h-1" :class="[statusBgColor, isDone ? 'animate-pulse' : '']"></div>
          </div>
        </div>

        <div class="flex flex-col pt-1">
          <div class="flex items-center gap-2">
            <h3 class="text-white font-sans text-xs font-black tracking-[0.15em] uppercase italic">
              {{ integration.name }}
            </h3>
            <span v-if="integration.premium" class="px-1 py-0.5 bg-orange-500/10 border border-orange-500/20 text-[8px] text-orange-500 font-mono font-bold uppercase tracking-tighter">
              ENHANCED
            </span>
          </div>
          <span class="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">Integration_Module</span>
        </div>
      </div>

      <div class="relative mb-6 flex-grow">
        <p class="text-zinc-400 text-[10px] font-mono leading-relaxed border-l border-zinc-800 pl-4 py-1 italic">
          {{ integration.onboard?.description || 'Awaiting module initialization and data-link parameters.' }}
        </p>
      </div>

      <div class="mt-auto pt-4 border-t border-zinc-900 flex flex-col gap-4 relative z-10">
        
        <div class="font-mono text-[9px] uppercase tracking-[0.2em] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span v-if="isDone" class="text-emerald-500 flex items-center gap-2">
              <span class="flex h-1.5 w-1.5 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span> 
              LINK_ACTIVE
            </span>
            <span v-else-if="isError" class="text-red-500 flex items-center gap-2 font-bold">
              <i class="ri-error-warning-fill text-xs"></i> PROTOCOL_ERR
            </span>
            <span v-else-if="isNoData" class="text-zinc-500 flex items-center gap-2">
              <i class="ri-pulse-line text-xs"></i> NULL_DATA
            </span>
            <span v-else-if="isWaitingForAction" class="text-orange-500 flex items-center gap-2 font-bold">
              <i class="ri-alert-line text-xs"></i> REQ_ACTION
            </span>
            <span v-else-if="isSyncing" class="text-zinc-400 flex items-center gap-2">
              <i class="ri-loader-4-line animate-spin text-xs"></i> 
              <span v-if="progressData && progressData.hasRun && progressData.progress > 0">
                SYNCING {{ progressData.progress }}%
              </span>
              <span v-else>SYNCING</span>
            </span>
            <span v-else-if="isConnected" class="text-emerald-400 flex items-center gap-2">
              <i class="ri-checkbox-circle-line text-xs"></i> READY
            </span>
            <span v-else class="text-zinc-700 flex items-center gap-2">
              <span class="w-1.5 h-1.5 border border-zinc-800"></span> OFFLINE
            </span>
          </div>

          <span class="text-zinc-800 text-[8px]">v.2.5.0</span>
        </div>

        <!-- Progress Details -->
        <div v-if="isSyncing && progressData && progressData.hasRun" class="font-mono text-[8px] text-zinc-500 border-l-2 border-zinc-800 pl-2">
          <div v-if="progressData.stats && progressData.stats.total > 0" class="flex items-center gap-2">
            <span class="text-zinc-600">STREAMS:</span>
            <span class="text-zinc-400">{{ progressData.stats.processed }}/{{ progressData.stats.total }}</span>
          </div>
          <div v-if="progressData.statusMessage" class="mt-1 text-zinc-600 italic">
            {{ progressData.statusMessage }}
          </div>
          <div v-if="progressData.isStuck" class="mt-1 text-orange-500 flex items-center gap-1">
            <i class="ri-alert-line"></i>
            <span>WARNING: NO_PROGRESS_DETECTED</span>
          </div>
        </div>

        <app-integration-connect
          :integration="integration"
          @invite-colleagues="emit('inviteColleagues')"
        >
          <template #default="{ connect, connected, settings, hasSettings }">
            <div class="flex items-center gap-2">
              
              <div v-if="!connected || !isConnected || hasSettings" class="flex-1 flex items-center gap-2">
                
                <button
                  v-if="!connected"
                  class="flex-1 h-8 bg-orange-600 hover:bg-orange-500 text-black transition-all font-mono text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                  @click="() => onConnect(connect)"
                >
                  <div class="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                  <span>INITIALIZE_LINK</span>
                  <i class="ri-arrow-right-line group-hover/btn:translate-x-1 transition-transform"></i>
                </button>

                <button
                  v-else-if="!isConnected"
                  class="flex-1 h-8 border border-red-900/50 text-red-500 hover:bg-red-500 hover:text-black transition-all font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center"
                  :disabled="loadingDisconnect"
                  @click="handleDisconnect"
                >
                   <i v-if="loadingDisconnect" class="ri-loader-4-line animate-spin mr-2"></i>
                   <span v-else>TERMINATE_LINK</span>
                </button>

              </div>

              <button
                v-if="hasSettings"
                class="h-8 w-8 flex items-center justify-center border border-zinc-800 bg-black text-zinc-500 hover:text-orange-500 hover:border-orange-500/50 transition-all shadow-lg"
                @click="settings"
              >
                <i class="ri-settings-5-line text-sm"></i>
              </button>

            </div>
          </template>
        </app-integration-connect>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import AppIntegrationConnect from '@/modules/integration/components/integration-connect.vue';
import { IntegrationService } from '@/modules/integration/integration-service';

const store = useStore();
const emit = defineEmits(['allowRedirect', 'inviteColleagues']);
const props = defineProps({
  integration: {
    type: Object,
    default: () => {},
  },
});

const loadingDisconnect = ref(false);
const progressData = ref(null);
let progressInterval = null;

const ERROR_BANNER_WORKING_DAYS_DISPLAY = 7;

const isCurrentDateAfterGivenWorkingDays = (date, workingDays) => {
  if (!date || !workingDays) return false;
  const targetDate = new Date(date);
  const diffDays = Math.ceil(Math.abs(new Date() - targetDate) / (1000 * 60 * 60 * 24));
  return diffDays > workingDays;
};

const fetchProgress = async () => {
  console.log('[PROGRESS DEBUG] fetchProgress called for:', props.integration.id);
  console.log('[PROGRESS DEBUG] Conditions - isConnected:', isConnected.value, 'isDone:', isDone.value, 'isError:', isError.value);
  console.log('[PROGRESS DEBUG] Integration status:', props.integration.status);
  
  if (!isConnected.value || isDone.value || isError.value) {
    console.log('[PROGRESS DEBUG] Skipping fetch - conditions not met');
    return;
  }
  
  try {
    console.log('[PROGRESS DEBUG] Calling API for integration:', props.integration.id);
    const data = await IntegrationService.getProgress(props.integration.id);
    console.log('[PROGRESS DEBUG] API Response:', data);
    
    // Only update if we got valid data
    if (data && typeof data === 'object') {
      progressData.value = data;
      console.log('[PROGRESS DEBUG] Progress data updated:', progressData.value);
    } else {
      console.log('[PROGRESS DEBUG] Invalid data received:', data);
    }
  } catch (error) {
    console.error('[PROGRESS DEBUG] Error fetching progress:', error);
    console.debug('Integration progress not available yet:', error.message);
  }
};

onMounted(() => {
  console.log('[PROGRESS DEBUG] Component mounted for:', props.integration.id);
  console.log('[PROGRESS DEBUG] Integration object:', props.integration);
  console.log('[PROGRESS DEBUG] Mount conditions - isConnected:', isConnected.value, 'isDone:', isDone.value, 'isError:', isError.value);
  
  // Fetch progress immediately if in progress
  if (isConnected.value && !isDone.value && !isError.value) {
    console.log('[PROGRESS DEBUG] Starting progress polling');
    fetchProgress();
    // Poll every 10 seconds
    progressInterval = setInterval(fetchProgress, 10000);
  } else {
    console.log('[PROGRESS DEBUG] NOT starting progress polling - conditions not met');
  }
});

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
});

// --- Computed States ---
const isConnected = computed(() => props.integration.status !== undefined);
const isSyncing = computed(() => 
  props.integration.status === 'mapping' || 
  props.integration.status === 'in-progress' ||
  props.integration.status === 'processing'
);
const isDone = computed(() => 
  props.integration.status === 'done' || 
  (props.integration.status === 'error' && !isCurrentDateAfterGivenWorkingDays(props.integration.updatedAt, ERROR_BANNER_WORKING_DAYS_DISPLAY))
);
const isError = computed(() => 
  props.integration.status === 'error' && 
  isCurrentDateAfterGivenWorkingDays(props.integration.updatedAt, ERROR_BANNER_WORKING_DAYS_DISPLAY)
);
const isNoData = computed(() => props.integration.status === 'no-data');
const isWaitingForAction = computed(() => props.integration.status === 'pending-action');

// --- Visual Logic ---
const statusColor = computed(() => {
  if (isDone.value) return 'bg-emerald-500';
  if (isError.value || isNoData.value) return 'bg-red-600';
  if (isWaitingForAction.value) return 'bg-orange-500';
  if (isSyncing.value) return 'bg-blue-500';
  if (isConnected.value) return 'bg-emerald-500';
  return 'bg-zinc-900'; 
});

const statusBgColor = computed(() => {
   if (isDone.value) return 'bg-emerald-500';
   if (isError.value) return 'bg-red-500';
   return 'bg-zinc-800';
});

// --- Actions ---
const handleDisconnect = () => {
  loadingDisconnect.value = true;
  store.dispatch('integration/doDestroy', props.integration.id).finally(() => {
    loadingDisconnect.value = false;
  });
};

const onConnect = (connect) => {
  emit('allowRedirect', true);
  connect();
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;600;700;900&display=swap');

.font-sans { font-family: 'Inter', sans-serif; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

@keyframes scan {
  from { transform: translateY(-100%); }
  to { transform: translateY(200%); }
}

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.invert-icon {
  filter: invert(1) brightness(2);
}

:deep(.el-popper) {
    border-radius: 0px !important;
}
</style>