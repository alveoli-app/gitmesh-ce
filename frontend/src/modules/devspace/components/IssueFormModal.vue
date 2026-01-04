<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Create New Issue"
    width="600px"
    destroy-on-close
  >
    <el-form label-position="top" :model="form" ref="formRef" :rules="rules">
      <el-form-item label="Title" prop="title">
        <el-input v-model="form.title" placeholder="Issue title..." />
      </el-form-item>
      
      <el-form-item label="Description" prop="description">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="4" 
          placeholder="Describe the issue..."
        />
      </el-form-item>
      
      <el-row :gutter="20">
        <el-col :span="12">
           <el-form-item label="Priority" prop="priority">
             <el-select v-model="form.priority" style="width: 100%">
               <el-option label="Low" value="low" />
               <el-option label="Medium" value="medium" />
               <el-option label="High" value="high" />
             </el-select>
           </el-form-item>
        </el-col>
        <el-col :span="12">
            <el-form-item label="Estimate (Hours)" prop="estimatedHours">
              <el-input-number v-model="form.estimatedHours" :min="0" :step="0.5" style="width: 100%" />
            </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:modelValue', false)">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">Create Issue</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: Boolean,
  projectId: String
});

const emit = defineEmits(['update:modelValue', 'success']);
const store = useStore();

const loading = ref(false);
const formRef = ref(null);

const form = reactive({
  title: '',
  description: '',
  priority: 'medium',
  estimatedHours: null
});

const rules = {
  title: [{ required: true, message: 'Please enter a title', trigger: 'blur' }]
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (!props.projectId) {
        ElMessage.error('No project selected');
        return;
      }
      
      loading.value = true;
      try {
        await store.dispatch('issues/createIssue', {
          projectId: props.projectId,
          data: { ...form }
        });
        ElMessage.success('Issue created successfully');
        emit('success');
        emit('update:modelValue', false);
      } catch (error) {
        console.error('Failed to create issue:', error);
        
        // Provide more specific error messages
        if (error.response?.status === 404) {
          ElMessage.error('Issue creation service not available. Please check your tenant configuration.');
        } else if (error.message?.includes('tenant context')) {
          ElMessage.error('Please ensure you are logged in and have selected a workspace.');
        } else {
          ElMessage.error(error.message || 'Failed to create issue');
        }
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>
