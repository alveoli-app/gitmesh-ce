<template>
  <div class="py-6 px-6">
    <div v-if="signalsFeedSettings">
      <!-- Feed Settings Button -->
      <div class="mb-8">
        <el-button
          class="btn btn--full btn--md btn--primary shadow-lg shadow-orange-500/20"
          @click="settingsDrawerOpen = true"
        >
          <i class="ri-equalizer-line text-lg mr-2" /><span>Configure Feed</span>
        </el-button>
      </div>

      <!-- Active Filters Section -->
      <div class="space-y-8">
        <!-- Keywords -->
        <div
          v-if="
            keywords.length
              || exactKeywords.length
              || excludedKeywords.length
          "
        >
          <div class="flex items-center gap-2 mb-3 text-zinc-100 font-medium text-sm">
            <i class="ri-price-tag-3-line text-zinc-400"></i>
            Keywords
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="keyword in keywords"
              :key="keyword"
              class="signals-keyword"
            >
              {{ keyword }}
            </div>
            <div
              v-for="exactKeyword in exactKeywords"
              :key="exactKeyword"
              class="signals-keyword"
            >
              "{{ exactKeyword }}"
            </div>
            <div
              v-for="excludedKeyword in excludedKeywords"
              :key="excludedKeyword"
              class="signals-keyword excluded"
            >
              <el-tooltip
                placement="top"
                content="Excluded keyword"
              >
                <span>
                  {{ excludedKeyword }}
                </span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- Published date -->
        <div v-if="publishedDate">
          <div class="flex items-center gap-2 mb-3 text-zinc-100 font-medium text-sm">
            <i class="ri-calendar-line text-zinc-400"></i>
            Published date
          </div>
          <div class="text-zinc-400 text-sm bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 inline-block">
            {{ publishedDate }}
          </div>
        </div>

        <!-- Platforms -->
        <div v-if="platforms.length">
          <div class="flex items-center gap-2 mb-3 text-zinc-100 font-medium text-sm">
            <i class="ri-share-line text-zinc-400"></i>
            Platforms
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="platform in platforms"
              :key="platform"
              class="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2"
            >
              <img
                :alt="platformOptions[platform].label"
                :src="platformOptions[platform].img"
                class="w-4 h-4"
              />
              <span class="text-xs text-zinc-300">{{
                platformOptions[platform].label
              }}</span>
            </div>
          </div>
        </div>

        <!-- AI replies -->
        <div v-if="platforms.length">
          <div class="flex items-center gap-2 mb-3 text-zinc-100 font-medium text-sm">
            <i class="ri-robot-line text-zinc-400"></i>
            AI Assistant
          </div>
          <div class="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2">
            <span class="text-xs text-zinc-300">Auto-replies</span>
            <div class="flex items-center gap-2">
              <div
                class="w-2 h-2 rounded-full"
                :class="aiRepliesEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'"
              ></div>
              <span class="text-xs text-zinc-400">{{
                aiRepliesEnabled ? 'On' : 'Off'
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Digest settings -->
      <div class="mt-8 pt-8 border-t border-zinc-800">
        <signals-email-digest-card />
      </div>
      
      <signals-settings-drawer
        v-model="settingsDrawerOpen"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import platformOptions from '@/modules/signals/constants/signals-platforms.json';
import SignalsEmailDigestCard from './SignalsEmailDigestCard.vue';
import SignalsSettingsDrawer from './SignalsSettingsDrawer.vue';
import { mapGetters } from '@/shared/vuex/vuex.helpers';

const { currentUser, currentTenant } = mapGetters('auth');

const signalsSettings = computed(
  () => currentUser?.value?.tenants.find(
    (tu) => tu.tenantId === currentTenant?.value.id,
  )?.settings.signals,
);

const settingsDrawerOpen = ref(false);

const signalsFeedSettings = computed(() => signalsSettings.value?.feed);
const keywords = computed(
  () => signalsFeedSettings.value.keywords,
);

const exactKeywords = computed(
  () => signalsFeedSettings.value.exactKeywords,
);

const excludedKeywords = computed(
  () => signalsFeedSettings.value.excludedKeywords,
);

const platforms = computed(
  () => signalsFeedSettings.value.platforms,
);

const publishedDate = computed(
  () => signalsFeedSettings.value.publishedDate,
);

const aiRepliesEnabled = computed(() => signalsSettings.value?.aiReplies);
</script>

<style lang="scss" scoped>
.signals-settings-small-title {
  @apply mb-3 uppercase text-zinc-200 text-2xs font-semibold;
}

.signals-keyword {
  @apply text-xs text-white px-2 h-6 flex items-center bg-black border-zinc-700 border rounded-md;

  &.excluded {
    @apply text-zinc-200 line-through decoration-zinc-500;
  }
}
</style>