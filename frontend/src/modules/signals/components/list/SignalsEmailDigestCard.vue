<template>
  <div
    v-if="!isEmailDigestConfiguredOnce"
    class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
  >
    <div class="flex items-center gap-3 mb-3">
      <div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
        <i class="ri-mail-send-line text-lg text-orange-500" />
      </div>
      <span class="text-zinc-100 font-medium text-sm">Email Digest</span>
    </div>

    <p class="text-xs text-zinc-400 leading-relaxed mb-5">
      Receive the 10 most relevant results from Signals automatically in your inbox.
    </p>

    <el-button
      class="btn btn--primary btn--full btn--sm shadow-lg shadow-orange-500/20"
      @click="isEmailDigestDrawerOpen = true"
    >
      Activate Digest
    </el-button>
  </div>

  <div
    v-else
    class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center group hover:border-zinc-700 transition-colors"
  >
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
        <i class="ri-mail-check-line text-zinc-400 group-hover:text-zinc-200 transition-colors" />
      </div>
      <div class="flex flex-col">
        <span class="text-zinc-200 font-medium text-xs mb-0.5">Email Digest</span>
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full" :class="isEmailDigestActivated ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'"></div>
          <span
            class="text-2xs"
            :class="isEmailDigestActivated ? 'text-zinc-300' : 'text-zinc-200'"
          >{{ isEmailDigestActivated ? 'Active' : 'Inactive' }}</span>
        </div>
      </div>
    </div>

    <el-button
      class="btn btn--transparent !h-8 !w-8 hover:bg-zinc-800"
      @click="isEmailDigestDrawerOpen = true"
    >
      <i class="ri-settings-3-line text-zinc-400 hover:text-zinc-200" />
    </el-button>
  </div>

  <signals-email-digest-drawer
    v-model="isEmailDigestDrawerOpen"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import { mapGetters } from '@/shared/vuex/vuex.helpers';
import SignalsEmailDigestDrawer from './SignalsEmailDigestDrawer.vue';

const { currentUser, currentTenant } = mapGetters('auth');

const signalsSettings = computed(
  () => currentUser.value?.tenants.find(
    (tu) => tu.tenantId === currentTenant.value.id,
  )?.settings.signals,
);

const isEmailDigestDrawerOpen = ref(false);

const isEmailDigestConfiguredOnce = computed(
  () => !!Object.keys(signalsSettings.value.emailDigest || {})
    .length,
);

const isEmailDigestActivated = computed(
  () => signalsSettings.value?.emailDigestActive,
);
</script>