<template>
  <query-renderer
    v-if="cubejsApi && cubejsToken && computedQuery"
    :cube-api="cubejsApi"
    :query="computedQuery"
  >
    <template #default="{ resultSet }">
      <div v-if="loadingData(resultSet)">
        <slot name="loading" />
      </div>
      <div v-else>
        <slot name="default" :result-set="resultSet" />
      </div>
    </template>
  </query-renderer>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import { QueryRenderer } from '@cubejs-client/vue3';

export default {
  name: 'AppCubeRender',
  components: {
    QueryRenderer,
  },
  props: {
    query: {
      required: true,
      type: Object,
    },
    loading: {
      required: false,
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapGetters('widget', ['cubejsToken', 'cubejsApi']),
    computedQuery() {
      // Clone query to avoid mutating the prop
      const widgetQuery = { ...this.query, filters: [...(this.query.filters || [])] };
      
      // Only add Members filters for Members cube queries
      // (Organizations and other cubes don't have a join to Members)
      const measureCube = widgetQuery.measures?.[0]?.split('.')[0];
      
      if (measureCube === 'Members') {
        const isTeamMemberFilter = {
          member: 'Members.isTeamMember',
          operator: 'equals',
          values: ['0'],
        };
        const isBot = {
          member: 'Members.isBot',
          operator: 'equals',
          values: ['0'],
        };
        
        widgetQuery.filters.push(isTeamMemberFilter);
        widgetQuery.filters.push(isBot);
      }

      return widgetQuery;
    },
  },
  async created() {
    if (this.cubejsApi === null) {
      await this.getCubeToken();
    }
  },
  methods: {
    ...mapActions({
      getCubeToken: 'widget/getCubeToken',
    }),
    loadingData(resultSet) {
      return (
        !resultSet
        || resultSet.loadResponse === undefined
        || this.loading
      );
    },
  },
};
</script>

<style scoped></style>
