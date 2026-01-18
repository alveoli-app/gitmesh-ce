<template>
  <div
    class="bg-zinc-900 border border-zinc-800/50 rounded-xl p-5 transition-all duration-200 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 group relative overflow-hidden"
    :class="{ 'cursor-pointer': signal.url }"
    @click="onCardClick"
  >
    <!-- Hover Gradient Effect -->
    <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

    <!-- Header -->
    <div class="flex items-center justify-between mb-4 relative z-10">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
          <img
            :alt="platformOptions[signal.platform].label"
            :src="platformOptions[signal.platform].img"
            class="w-4 h-4"
          />
        </div>
        <div class="flex flex-col">
          <span class="text-zinc-100 text-sm font-medium leading-none mb-1">
            {{ platformOptions[signal.platform].label }}
          </span>
          <span v-if="signal.postedAt" class="text-zinc-200 text-xs">
            {{ formatDateToTimeAgo(signal.postedAt) }}
          </span>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" @click.stop>
        <!-- Thumbs Up -->
        <el-tooltip placement="top" content="Relevant">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            :class="isRelevant ? 'bg-green-500/10 text-green-500' : 'hover:bg-zinc-800 text-zinc-200 hover:text-zinc-300'"
            @click="onActionClick({ actionType: 'thumbs-up', shouldAdd: !isRelevant })"
          >
            <i :class="isRelevant ? 'ri-thumb-up-fill' : 'ri-thumb-up-line'"></i>
          </button>
        </el-tooltip>

        <!-- Thumbs Down -->
        <el-tooltip placement="top" content="Not relevant">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            :class="isNotRelevant ? 'bg-red-500/10 text-red-500' : 'hover:bg-zinc-800 text-zinc-200 hover:text-zinc-300'"
            @click="onActionClick({ actionType: 'thumbs-down', shouldAdd: !isNotRelevant })"
          >
            <i :class="isNotRelevant ? 'ri-thumb-down-fill' : 'ri-thumb-down-line'"></i>
          </button>
        </el-tooltip>

        <!-- Bookmark -->
        <el-tooltip placement="top" :content="bookmarkTooltip">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            :class="[
              isBookmarked ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-zinc-800 text-zinc-200 hover:text-zinc-300',
              isBookmarkedByTeam ? 'cursor-not-allowed opacity-50' : ''
            ]"
            @click="!isBookmarkedByTeam && onActionClick({ actionType: 'bookmark', shouldAdd: !isBookmarked })"
          >
            <i :class="isBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'"></i>
          </button>
        </el-tooltip>

        <!-- AI Reply -->
        <el-tooltip placement="top" :content="replyTooltip">
          <button
            v-if="areGeneratedRepliesActivated"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            :class="[
              isGenerateReplyAvailable ? 'hover:bg-zinc-800 text-zinc-200 hover:text-zinc-300' : 'opacity-30 cursor-not-allowed'
            ]"
            @click="onGenerateReplyClick"
          >
            <i class="ri-magic-line"></i>
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- Content -->
    <div class="relative z-10">
      <!-- Image -->
      <div
        v-if="signal.post.thumbnail"
        class="rounded-lg w-full overflow-hidden mb-4 aspect-video bg-zinc-800"
      >
        <app-image
          class="w-full h-full object-cover"
          :src="signal.post.thumbnail"
          :alt="signal.post.title"
        />
      </div>

      <!-- Text Content -->
      <div class="space-y-2">
        <a
          v-if="subreddit"
          class="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-medium hover:text-orange-400 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          :href="`https://www.reddit.com/${subreddit}`"
          @click.stop
        >
          {{ subreddit }}
        </a>

        <h3
          v-if="signal.post.title"
          class="text-zinc-100 font-medium text-base leading-snug group-hover:text-orange-400 transition-colors"
        >
          {{ signal.post.title }}
        </h3>

        <p class="text-zinc-400 text-sm leading-relaxed line-clamp-3">
          {{ signal.post.description }}
        </p>
      </div>
    </div>

    <!-- AI Reply Dialog -->
    <app-dialog
      v-model="replyDialogVisible"
      :title="DialogHeading"
      custom-class="signals-dialog"
    >
      <template #content>
        <div class="p-6">
          <div class="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6 flex gap-3">
            <i class="ri-information-line text-orange-500 mt-0.5"></i>
            <p class="text-orange-200 text-sm">
              This is an AI-generated draft. Please review and personalize it before posting to ensure it adds genuine value to the conversation.
            </p>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 relative group/copy">
            <div v-if="!generatedReply" class="animate-pulse space-y-3">
              <div class="h-4 bg-zinc-800 rounded w-3/4"></div>
              <div class="h-4 bg-zinc-800 rounded w-full"></div>
              <div class="h-4 bg-zinc-800 rounded w-5/6"></div>
            </div>
            
            <div v-else>
              <p class="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{{ generatedReply }}</p>
              
              <button
                class="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all opacity-0 group-hover/copy:opacity-100"
                @click="copyToClipboard(generatedReply)"
              >
                <i :class="replyInClipboard ? 'ri-check-line text-green-500' : 'ri-file-copy-line'"></i>
              </button>
            </div>
          </div>

          <div v-if="generatedReply" class="flex items-center justify-between mt-4">
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-200">Helpful?</span>
              <button
                class="p-1 hover:text-green-500 transition-colors"
                :class="generatedReplyThumbsUpFeedback ? 'text-green-500' : 'text-zinc-600'"
                @click="generatedReplyFeedback(generatedReply, 'thumbs-up')"
              >
                <i :class="generatedReplyThumbsUpFeedback ? 'ri-thumb-up-fill' : 'ri-thumb-up-line'"></i>
              </button>
              <button
                class="p-1 hover:text-red-500 transition-colors"
                :class="generatedReplyThumbsDownFeedback ? 'text-red-500' : 'text-zinc-600'"
                @click="generatedReplyFeedback(generatedReply, 'thumbs-down')"
              >
                <i :class="generatedReplyThumbsDownFeedback ? 'ri-thumb-down-fill' : 'ri-thumb-down-line'"></i>
              </button>
            </div>

            <a
              :href="signal.url"
              target="_blank"
              class="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"
            >
              Go to post <i class="ri-external-link-line"></i>
            </a>
          </div>
        </div>
      </template>
    </app-dialog>
  </div>
</template>

<script setup>
import {
  computed, defineProps, ref, watch, h,
} from 'vue';
import { useStore } from 'vuex';
import moment from 'moment';
import { formatDateToTimeAgo } from '@/utils/date';
import platformOptions from '@/modules/signals/constants/signals-platforms.json';
import { withHttp } from '@/utils/string';
import { mapGetters } from '@/shared/vuex/vuex.helpers';
import { SignalsService } from '@/modules/signals/services/signalsService';

const props = defineProps({
  signal: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
});

const store = useStore();
const { currentUser, currentTenant } = mapGetters('auth');

const signalsSettings = computed(
  () => currentUser?.value?.tenants.find(
    (tu) => tu.tenantId === currentTenant?.value.id,
  )?.settings.signals,
);

const generatedReply = ref('');
const replyDialogVisible = ref(false);
const replyInClipboard = ref(false);
const generatedReplyThumbsUpFeedback = ref(false);
const generatedReplyThumbsDownFeedback = ref(false);
const DialogHeading = h(
  'div',
  { class: 'flex items-center gap-2' },
  [
    h('i', { class: 'ri-magic-line text-orange-500 text-xl' }),
    h('span', { class: 'font-semibold text-lg' }, 'AI Reply Assistant'),
    h('span', { class: 'px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium' }, 'Beta'),
  ]
);

const isBookmarked = computed(() => props.signal.actions.some(
  (a) => a.type === 'bookmark' && !a.toRemove,
));
const isRelevant = computed(() => props.signal.actions.some(
  (a) => a.type === 'thumbs-up' && !a.toRemove,
));
const isNotRelevant = computed(() => props.signal.actions.some(
  (a) => a.type === 'thumbs-down' && !a.toRemove,
));
const isBookmarkedByUser = computed(() => {
  const bookmarkAction = props.signal.actions.find(
    (a) => a.type === 'bookmark',
  );
  return (
    !bookmarkAction?.actionById
    || bookmarkAction?.actionById === currentUser.value.id
  );
});

const isBookmarkedByTeam = computed(() => isBookmarked.value && !isBookmarkedByUser.value);

const bookmarkTooltip = computed(() => {
  if (isBookmarked.value && !isBookmarkedByUser.value) {
    return 'Bookmarked by team contact';
  }

  return isBookmarked.value ? 'Unbookmark' : 'Bookmark';
});

const areGeneratedRepliesActivated = computed(() => signalsSettings.value?.aiReplies || false);

const isGenerateReplyAvailable = computed(() => (
  props.signal.platform !== 'github'
    && props.signal.platform !== 'stackoverflow'
    && props.signal.platform !== 'youtube'
));

const replyTooltip = computed(() => {
  if (!isGenerateReplyAvailable.value) {
    return 'Not available for this source';
  }
  return 'Generate a reply idea';
});

watch(replyInClipboard, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      replyInClipboard.value = false;
    }, 3000);
  }
});

const copyToClipboard = async (reply) => {
  await navigator.clipboard.writeText(reply);
  replyInClipboard.value = true;

  await SignalsService.track({
    event: 'generatedReplyCopied',
    params: {
      title: props.signal.post.title,
      description: props.signal.post.description,
      url: props.signal.url,
      platform: props.signal.platform,
      reply,
    },
  });
};

const subreddit = computed(() => {
  if (props.signal.platform !== 'reddit') {
    return null;
  }

  const pattern = /.*reddit\.com(?<subreddit>\/r\/.[^\\/]*).*/gm;
  const matches = pattern.exec(props.signal.url);

  if (!matches?.groups.subreddit) {
    return null;
  }

  return matches.groups.subreddit.slice(1);
});

const onCardClick = async (e) => {
  if (!props.signal.url || e.target.closest('button') || e.target.closest('a')) {
    return;
  }

  window.open(withHttp(props.signal.url), '_blank');

  await SignalsService.track({
    event: 'postClicked',
    params: {
      url: props.signal.url,
      platform: props.signal.platform,
    },
  });
};

const generatedReplyFeedback = async (reply, type) => {
  if (type === 'thumbs-up') {
    if (generatedReplyThumbsUpFeedback.value) return;
    generatedReplyThumbsUpFeedback.value = true;
    generatedReplyThumbsDownFeedback.value = false;
  } else {
    if (generatedReplyThumbsDownFeedback.value) return;
    generatedReplyThumbsDownFeedback.value = true;
    generatedReplyThumbsUpFeedback.value = false;
  }
  await SignalsService.track({
    event: 'generatedReplyFeedback',
    params: {
      type,
      title: props.signal.post.title,
      description: props.signal.post.description,
      url: props.signal.url,
      platform: props.signal.platform,
      reply,
    },
  });
};

const onGenerateReplyClick = async () => {
  if (!isGenerateReplyAvailable.value) return;
  
  replyDialogVisible.value = true;
  if (generatedReply.value !== '') return;

  const savedReplies = JSON.parse(localStorage.getItem('signalsReplies')) || {};

  if (savedReplies && savedReplies[props.signal.url]) {
    generatedReply.value = savedReplies[props.signal.url];
    return;
  }

  const generated = await SignalsService.generateReply({
    title: props.signal.post.title,
    description: props.signal.post.description,
  });
  generatedReply.value = generated.reply;
  savedReplies[props.signal.url] = generated.reply;
  localStorage.setItem('signalsReplies', JSON.stringify(savedReplies));

  await SignalsService.track({
    event: 'generatedReply',
    params: {
      title: props.signal.post.title,
      description: props.signal.post.description,
      url: props.signal.url,
      platform: props.signal.platform,
      reply: generatedReply.value,
    },
  });
};

const onActionClick = async ({ actionType, shouldAdd }) => {
  const storeActionType = shouldAdd ? 'add' : 'delete';
  const action = shouldAdd
    ? { type: actionType, timestamp: moment() }
    : props.signal.actions.find((a) => a.type === actionType);

  store.dispatch('signals/doAddTemporaryPostAction', {
    index: props.index,
    storeActionType,
    action,
  });

  store.dispatch('signals/doAddActionQueue', {
    index: props.index,
    id: props.signal.id,
    post: props.signal,
    handler: () => store.dispatch('signals/doUpdatePostAction', {
      post: props.signal,
      index: props.index,
      storeActionType,
      actionType,
    }),
  });
};
</script>

<style lang="scss">
.signals-dialog {
  @apply rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl;
  
  .el-dialog__header {
    @apply p-6 border-b border-zinc-800 mr-0;
  }
  
  .el-dialog__body {
    @apply p-0;
  }
  
  .el-dialog__headerbtn {
    @apply top-6 right-6;
  }
}
</style>