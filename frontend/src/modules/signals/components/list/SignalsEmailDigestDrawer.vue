<template>
  <app-drawer
    v-model="drawerModel"
    title="Email Digest"
    size="600px"
  >
    <template #beforeTitle>
      <i
        class="ri-mail-open-line text-xl h-6 text-white flex items-center mr-3"
      />
    </template>
    <template #content>
      <div class="pb-8">
        <!-- active header -->
        <div
          class="bg-zinc-900 px-6 py-4 -mx-6 flex justify-between -mt-5"
        >
          <div>
            <h5 class="text-sm font-medium mb-1">
              Active
            </h5>
            <p class="text-2xs text-zinc-200">
              If active, you will receive an email with up
              to 10 most relevant results from Signals,
              based on your settings.
            </p>
          </div>
          <div>
            <el-switch v-model="form.active" />
          </div>
        </div>
        <div :class="{ 'opacity-50': !form.active }">
          <el-form
            label-position="top"
            class="form pt-6 pb-10"
            @submit.prevent="doSubmit"
          >
            <app-form-item
              class="col-span-2 mb-6"
              :validation="$v.email"
              label="Email"
              :required="true"
              :error-messages="{
                required: 'This field is required',
                email: 'Enter valid email',
              }"
            >
              <el-input
                ref="focus"
                v-model="form.email"
                :disabled="!form.active"
                @blur="$v.email.$touch"
                @change="$v.email.$touch"
              />
            </app-form-item>
            <app-form-item class="mb-6" label="Frequency">
              <el-radio-group
                v-model="form.frequency"
                :disabled="!form.active"
              >
                <el-radio
                  label="daily"
                  size="large"
                  class="frequency-radio !flex items-start mb-3"
                >
                  <h6
                    class="text-sm leading-5 font-medium mb-1"
                  >
                    Daily
                  </h6>
                  <p
                    class="text-2xs leading-4.5 text-zinc-200"
                  >
                    From Monday to Friday (results from
                    previous day)
                  </p>
                </el-radio>
                <el-radio
                  label="weekly"
                  size="large"
                  class="frequency-radio !flex items-start"
                >
                  <h6
                    class="text-sm leading-5 font-medium mb-1"
                  >
                    Weekly
                  </h6>
                  <p
                    class="text-2xs leading-4.5 text-zinc-200"
                  >
                    Every Monday (results from previous
                    week)
                  </p>
                </el-radio>
              </el-radio-group>
            </app-form-item>
            <app-form-item class="mb-6" label="Time">
              <div class="w-36">
                <el-time-select
                  v-model="form.time"
                  start="00:00"
                  step="00:30"
                  end="23:59"
                  placeholder="Select time"
                  format="HH:mm"
                  :disabled="!form.active"
                  :clearable="false"
                />
              </div>
            </app-form-item>

            <el-checkbox
              v-model="form.updateResults"
              class="filter-checkbox"
              :disabled="!form.active"
            >
              <span class="text-sm text-white">Update email results based on your current
                feed settings</span>
            </el-checkbox>
          </el-form>
          <hr />
          <!-- Results summary -->
          <div v-if="results">
            <h4
              class="text-base font-semibold text-white py-6"
            >
              Results summary
            </h4>
            <!-- update feed warning -->
            <div
              v-if="displayFeedWarning"
              class="bg-yellow-900/20 border border-yellow-900/50 rounded-md py-2.5 px-3 flex items-center justify-between mb-4"
            >
              <div class="flex items-center">
                <i
                  class="text-base ri-alert-fill text-yellow-500 mr-2"
                />
                <p class="text-2xs leading-5">
                  Current feed settings don't match the
                  digest results
                </p>
              </div>
              <p
                class="text-xs text-yellow-600 font-medium cursor-pointer"
                @click="updateFeed()"
              >
                Update
              </p>
            </div>
            <section
              class="pt-3 pb-1 border-b border-zinc-700"
            >
              <h6
                class="text-2xs font-medium leading-4.5 text-zinc-200 pb-2"
              >
                Keywords
              </h6>
              <div class="flex flex-wrap">
                <div
                  v-for="semantic of results.keywords"
                  :key="semantic"
                  class="border border-zinc-700 mr-2 mb-2 rounded-md py-0.5 px-2 text-xs leading-5"
                >
                  {{ semantic }}
                </div>
                <div
                  v-for="exact of results.exactKeywords"
                  :key="exact"
                  class="border border-zinc-700 mr-2 mb-2 rounded-md py-0.5 px-2 text-xs leading-5"
                >
                  {{ exact }}
                </div>
              </div>
            </section>
            <section
              class="pt-3 pb-1 border-b border-zinc-700"
            >
              <h6
                class="text-2xs font-medium leading-4.5 text-zinc-200 pb-2"
              >
                Platforms
              </h6>
              <div class="flex flex-wrap">
                <div
                  v-for="platform of results.platforms"
                  :key="platform"
                  class="border border-zinc-700 mr-2 mb-2 rounded-md py-0.5 px-2 text-xs leading-5"
                >
                  {{ platformOptions[platform].label }}
                </div>
              </div>
            </section>
            <section class="pt-3 pb-1">
              <h6
                class="text-2xs font-medium leading-4.5 text-zinc-200 pb-2"
              >
                Date published
              </h6>
              <div class="text-xs leading-5">
                {{ results.publishedDate }}
              </div>
            </section>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div style="flex: auto">
        <el-button
          class="btn btn--md btn--transparent mr-3"
          @click="handleCancel"
        >
          Cancel
        </el-button>
        <el-button
          type="primary"
          class="btn btn--md btn--primary"
          :loading="loadingUpdateSettings"
          :disabled="
            $v.$invalid
              || (!hasFormChanged && !hasElementChanged)
          "
          @click="doSubmit()"
        >
          Update
        </el-button>
      </div>
    </template>
  </app-drawer>
</template>

<script setup>
import {
  ref,
  computed,
  reactive,
  defineEmits,
  defineProps,
  onMounted,
  watch,
} from 'vue';
import { email, required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import moment from 'moment';
import AppDrawer from '@/shared/drawer/drawer.vue';
import {
  mapActions,
  mapGetters,
  mapState,
} from '@/shared/vuex/vuex.helpers';
import Message from '@/shared/message/message';
import platformOptions from '@/modules/signals/constants/signals-platforms.json';
import AppFormItem from '@/shared/form/form-item.vue';
import formChangeDetector from '@/shared/form/form-change';
import elementChangeDetector from '@/shared/form/element-change';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const { currentUser, currentTenant } = mapGetters('auth');

const signalsSettings = computed(
  () => currentUser?.value?.tenants.find(
    (tu) => tu.tenantId === currentTenant?.value.id,
  )?.settings.signals,
);

const { doUpdateSettings } = mapActions('signals');
const { loadingUpdateSettings } = mapState('signals');

const emit = defineEmits(['update:modelValue']);

const rules = {
  email: {
    required,
    email,
  },
};

const form = reactive({
  active: false,
  email: '',
  frequency: 'daily',
  time: '09:00',
  updateResults: true,
});
const { hasFormChanged, formSnapshot } = formChangeDetector(form);

const feed = ref(null);
const { elementSnapshot, hasElementChanged } = elementChangeDetector(feed);

const $v = useVuelidate(rules, form);

const drawerModel = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

const results = computed(() => {
  if (!form.updateResults) {
    if (currentUser.value && feed.value) {
      return feed.value;
    }
  }
  return signalsSettings.value.feed;
});

const displayFeedWarning = computed(() => {
  if (form.updateResults) {
    return false;
  }
  if (signalsSettings.value.feed && feed.value) {
    return (
      JSON.stringify(signalsSettings.value.feed)
      !== JSON.stringify(feed.value)
    );
  }
  return false;
});

const updateFeed = () => {
  feed.value = signalsSettings.value.feed ?? null;
};

const fillForm = (user) => {
  form.active = signalsSettings.value.emailDigestActive || false;
  form.email = signalsSettings.value.emailDigest?.email || user.email;
  form.frequency = signalsSettings.value.emailDigest?.frequency || 'daily';
  form.time = signalsSettings.value.emailDigest?.time
    ? moment
      .utc(
        signalsSettings.value.emailDigest?.time,
        'HH:mm',
      )
      .local()
      .format('HH:mm')
    : '09:00';
  form.updateResults = !signalsSettings.value.emailDigest
    ? true
    : signalsSettings.value.emailDigest?.matchFeedSettings;
  formSnapshot();
  feed.value = signalsSettings.value?.emailDigest?.feed
    || signalsSettings.value?.feed
    || null;
  elementSnapshot();
};
const doSubmit = async () => {
  $v.value.$touch();
  if (!$v.value.$invalid) {
    const data = {
      email: form.email,
      frequency: form.frequency,
      time: moment(form.time, 'HH:mm')
        .utc()
        .format('HH:mm'),
      matchFeedSettings: form.updateResults,
      feed: !form.updateResults ? feed.value : undefined,
    };
    doUpdateSettings({
      data: {
        ...signalsSettings.value,
        emailDigestActive: form.active,
        emailDigest: data,
      },
      fetchNewResults: false,
    }).then(() => {
      Message.success(
        'Email Digest settings successfully updated',
      );
      emit('update:modelValue', false);
    });
  }
};

const handleCancel = () => {
  emit('update:modelValue', false);
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      fillForm(currentUser.value);
    }
  },
);

onMounted(() => {
  fillForm(currentUser.value);
});
</script>

<style lang="scss">
.frequency-radio {
  .el-radio__input {
    @apply pt-1;
  }
}
</style>