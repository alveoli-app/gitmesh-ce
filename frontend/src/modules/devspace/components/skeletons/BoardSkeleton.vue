<template>
  <div class="board-skeleton">
    <div class="skeleton-filters">
      <el-skeleton :rows="1" animated />
    </div>
    <div class="skeleton-columns">
      <div v-for="col in 5" :key="col" class="skeleton-column">
        <el-skeleton animated>
          <template #template>
            <div class="skeleton-column-header">
              <el-skeleton-item variant="h3" style="width: 40%" />
              <el-skeleton-item variant="text" style="width: 30px; height: 24px; border-radius: 12px;" />
            </div>
            <div v-for="card in 3" :key="card" class="skeleton-card">
              <el-skeleton-item variant="text" style="width: 80%; margin-bottom: 8px;" />
              <el-skeleton-item variant="text" style="width: 60%; margin-bottom: 8px;" />
              <div class="skeleton-card-footer">
                <el-skeleton-item variant="circle" style="width: 24px; height: 24px;" />
                <el-skeleton-item variant="text" style="width: 40px;" />
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-skeleton {
  padding: 20px;
}

.skeleton-filters {
  margin-bottom: 24px;
}

.skeleton-columns {
  display: grid;
  grid-template-columns: repeat(5, minmax(280px, 1fr));
  gap: 16px;
  overflow-x: auto;
}

.skeleton-column {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
}

.skeleton-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.skeleton-card {
  background: var(--el-bg-color);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.skeleton-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

@media (max-width: 1024px) {
  .skeleton-columns {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .skeleton-columns {
    grid-template-columns: 1fr;
  }
}
</style>
