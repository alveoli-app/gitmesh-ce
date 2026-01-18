<template>
  <div class="signals-organizations-page bg-black min-h-screen">
    <app-page-wrapper size="full-width" class="!bg-black">
      <div class="member-list-page !bg-black min-h-screen">
        <!-- Header -->
        <div class="mb-10">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">Signals - Organizations</h1>
              <p class="text-zinc-400">Manage organizations and company relationships through signals</p>
            </div>
          </div>
        </div>

        <!-- Organization List Table -->
        <app-organization-list-table
          v-model:pagination="pagination"
          :has-organizations="totalOrganizations > 0"
          :total-organizations="totalOrganizations"
          :loading="loading"
          :rows="rows"
          @update-organization-note="doUpdateOrganizationNote"
          @update-organization-tags="doUpdateOrganizationTags"
          @export-organizations="doExport"
          @reload="fetch"
        />
      </div>
    </app-page-wrapper>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import AppPageWrapper from '@/shared/layout/page-wrapper.vue';
import AppOrganizationListTable from '@/modules/organization/components/list/organization-list-table.vue';
import {
  mapActions,
  mapGetters,
  mapState,
} from '@/shared/vuex/vuex.helpers';

const { doFind, doUpdateOrganizationNote, doUpdateOrganizationTags, doExport } = mapActions('organization');
const { totalOrganizations, loading, rows } = mapState('organization');

const pagination = ref({
  currentPage: 1,
  pageSize: 20,
});

const fetch = async (reload = false) => {
  await doFind({
    reload,
    pagination: pagination.value,
  });
};

onMounted(() => {
  fetch();
});
</script>

<style scoped>
.signals-organizations-page {
  /* Community edition signals organizations page styles */
}
</style>