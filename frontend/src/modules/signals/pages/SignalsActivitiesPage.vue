<template>
  <div class="signals-activities-page bg-black min-h-screen">
    <app-page-wrapper size="narrow" class="!bg-black">
      <div class="activity-list-page !bg-black min-h-screen">
        <!-- Header -->
        <div class="mb-10">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">Signals - Activities</h1>
              <p class="text-zinc-400">Monitor and track activities through signals</p>
            </div>
          </div>
        </div>

        <!-- Activity List -->
        <app-activity-list
          @edit="edit($event)"
          @create="create()"
        />
      </div>
    </app-page-wrapper>

    <!-- Activity Form Drawer -->
    <app-activity-form-drawer
      v-model="isActivityFormDrawerOpen"
      :activity="activityToEdit"
      @reload="reload"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppPageWrapper from '@/shared/layout/page-wrapper.vue';
import AppActivityList from '@/modules/activity/components/activity-list.vue';
import AppActivityFormDrawer from '@/modules/activity/components/activity-form-drawer.vue';

const isActivityFormDrawerOpen = ref(false);
const activityToEdit = ref(null);

const edit = (activity) => {
  activityToEdit.value = activity;
  isActivityFormDrawerOpen.value = true;
};

const create = () => {
  activityToEdit.value = null;
  isActivityFormDrawerOpen.value = true;
};

const reload = () => {
  // Reload activity list
  window.location.reload();
};
</script>

<style scoped>
.signals-activities-page {
  /* Community edition signals activities page styles */
}
</style>