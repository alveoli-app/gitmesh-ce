<template>
  <div class="signals-contacts-page bg-black min-h-screen">
    <app-page-wrapper size="full-width" class="!bg-black">
      <div class="member-list-page !bg-black min-h-screen">
        <!-- Header -->
        <div class="mb-10">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">Signals - Contacts</h1>
              <p class="text-zinc-400">Manage your contacts and relationships through signals</p>
            </div>
          </div>
        </div>

        <!-- Member List Table -->
        <app-member-list-table
          v-model:pagination="pagination"
          :has-integrations="hasIntegrations"
          :total-members="totalMembers"
          :loading="loading"
          :rows="rows"
          @update-member-note="doUpdateMemberNote"
          @update-member-tags="doUpdateMemberTags"
          @update-member-organizations="doUpdateMemberOrganizations"
          @export-members="doExport"
          @reload="fetch"
        />
      </div>
    </app-page-wrapper>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import AppPageWrapper from '@/shared/layout/page-wrapper.vue';
import AppMemberListTable from '@/modules/member/components/list/member-list-table.vue';
import {
  mapActions,
  mapGetters,
  mapState,
} from '@/shared/vuex/vuex.helpers';

const { doFind, doUpdateMemberNote, doUpdateMemberTags, doUpdateMemberOrganizations, doExport } = mapActions('member');
const { hasIntegrations } = mapGetters('integration');
const { totalMembers, loading, rows } = mapState('member');

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
.signals-contacts-page {
  /* Community edition signals contacts page styles */
}
</style>