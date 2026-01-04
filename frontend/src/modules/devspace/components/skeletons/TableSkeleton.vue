<template>
  <div class="table-skeleton">
    <div class="skeleton-toolbar">
      <el-skeleton :rows="1" animated style="width: 100%;" />
    </div>
    <div class="skeleton-table">
      <el-table
        :data="skeletonData"
        style="width: 100%"
        :show-header="true"
      >
        <el-table-column width="55">
          <template #default>
            <el-skeleton-item variant="circle" style="width: 16px; height: 16px;" />
          </template>
        </el-table-column>
        <el-table-column label="ID" width="100">
          <template #default>
            <el-skeleton-item variant="text" style="width: 70%;" />
          </template>
        </el-table-column>
        <el-table-column label="Title" min-width="200">
          <template #default>
            <el-skeleton-item variant="text" style="width: 85%;" />
          </template>
        </el-table-column>
        <el-table-column label="Status" width="120">
          <template #default>
            <el-skeleton-item variant="text" style="width: 60px; height: 24px; border-radius: 4px;" />
          </template>
        </el-table-column>
        <el-table-column label="Priority" width="100">
          <template #default>
            <el-skeleton-item variant="text" style="width: 50px;" />
          </template>
        </el-table-column>
        <el-table-column label="Assignee" width="120">
          <template #default>
            <el-skeleton-item variant="circle" style="width: 24px; height: 24px;" />
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const skeletonData = ref(Array(10).fill({}))
</script>

<style scoped>
.table-skeleton {
  padding: 20px;
}

.skeleton-toolbar {
  margin-bottom: 16px;
}

.skeleton-table {
  background: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
}
</style>
