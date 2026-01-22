<template>
  <app-page-wrapper>
    <div class="pb-6">
      <h4 class="mb-1 mt-8">
        Welcome to GitMesh !! ദ്ദി (˵ •̀ ᴗ - ˵ ) ✧
      </h4>
    </div>
    <div class="flex flex-wrap -mx-2.5">
      <div class="w-full lg:w-2/3 px-2.5">
        <cr-quickstart-guides />
      </div>
      <div class="w-full lg:w-1/3 px-2.5">
        <cr-quickstart-widgets />
      </div>
    </div>
  </app-page-wrapper>
</template>

<script setup lang="ts">
import CrQuickstartGuides from '@/modules/quickstart/components/quickstart-guides.vue';
import CrQuickstartWidgets from '@/modules/quickstart/components/quickstart-widgets.vue';
</script>

<script lang="ts">
export default {
  name: 'AppQuickstartPage',
};
</script>
