<template>
  <div class="announcements-page">
    <div class="header">
      <h2>公告管理</h2>
      <n-button type="primary" @click="openCreateModal">新建公告</n-button>
    </div>

    <n-data-table
      remote
      :data="tableData"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />

    <!-- 编辑/新建公告弹窗 -->
    <n-modal v-model:show="showModal" preset="card" :title="isEditMode ? '编辑公告' : '新建公告'" style="width: 600px;">
      <n-form ref="formRef" :model="formData" :rules="rules">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="formData.title" placeholder="请输入公告标题" />
        </n-form-item>
        <n-form-item label="内容" path="content">
          <n-input v-model:value="formData.content" type="textarea" :rows="4" placeholder="请输入公告内容" />
        </n-form-item>
        <n-form-item label="置顶" path="is_pinned">
          <n-switch v-model:value="formData.is_pinned" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 推送设置弹窗 -->
    <n-modal v-model:show="showBroadcastModal" preset="card" title="推送公告" style="width: 500px;">
      <div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.04);">
        <div style="font-weight: 600; margin-bottom: 4px;">{{ broadcastTarget?.title }}</div>
        <div style="color: #888; font-size: 13px;">{{ broadcastTarget?.content }}</div>
      </div>
      <n-form label-placement="left" label-width="80">
        <n-form-item label="显示方式">
          <n-radio-group v-model:value="broadcastMode">
            <n-space>
              <n-radio value="chat">聊天栏</n-radio>
              <n-radio value="title">屏幕标题</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="字体颜色">
          <n-space :size="8" align="center" :wrap="true">
            <div
              v-for="c in mcColors"
              :key="c.value"
              class="color-swatch"
              :class="{ active: broadcastColor === c.value }"
              :style="{ background: c.hex }"
              :title="c.label"
              @click="broadcastColor = c.value"
            />
          </n-space>
        </n-form-item>
        <n-form-item label="预览">
          <div style="padding: 8px 12px; border-radius: 6px; background: #1a1a1a; font-family: 'JetBrains Mono', monospace; font-size: 14px; width: 100%;">
            <span style="color: #fc3;">{{ broadcastMode === 'title' ? '' : '[公告] ' }}</span>
            <span :style="{ color: mcColors.find(c => c.value === broadcastColor)?.hex || '#fff' }">
              {{ broadcastTarget?.title }}{{ broadcastMode === 'title' ? '' : ': ' + broadcastTarget?.content }}
            </span>
          </div>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBroadcastModal = false">取消</n-button>
          <n-button type="info" :loading="broadcastLoading" @click="confirmBroadcast">推送到游戏</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, ref, reactive, onMounted } from 'vue'
import { NButton, NTag, NSpace, NPopconfirm, useMessage, NDataTable, NModal, NForm, NFormItem, NInput, NSwitch, NRadioGroup, NRadio } from 'naive-ui'
import type { FormInst, DataTableColumns } from 'naive-ui'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  broadcastAnnouncement
} from '../api/announcements'
import type { Announcement } from '../types'

const message = useMessage()

// Minecraft colors
const mcColors = [
  { label: '白色', value: 'white', hex: '#ffffff' },
  { label: '黄色', value: 'yellow', hex: '#ffff55' },
  { label: '金色', value: 'gold', hex: '#ffaa00' },
  { label: '浅绿', value: 'green', hex: '#55ff55' },
  { label: '深绿', value: 'dark_green', hex: '#00aa00' },
  { label: '浅蓝', value: 'aqua', hex: '#55ffff' },
  { label: '深蓝', value: 'blue', hex: '#5555ff' },
  { label: '浅紫', value: 'light_purple', hex: '#ff55ff' },
  { label: '深紫', value: 'dark_purple', hex: '#aa00aa' },
  { label: '红色', value: 'red', hex: '#ff5555' },
  { label: '深红', value: 'dark_red', hex: '#aa0000' },
  { label: '灰色', value: 'gray', hex: '#aaaaaa' },
  { label: '深灰', value: 'dark_gray', hex: '#555555' },
]

// Table State
const loading = ref(false)
const tableData = ref<Announcement[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40]
})

// Load Data
const loadData = async () => {
  loading.value = true
  try {
    const res = await getAnnouncements(pagination.page, pagination.pageSize)
    tableData.value = res.data.announcements
    pagination.itemCount = res.data.total
  } catch (error) {
    message.error('加载公告列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadData()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadData()
}

// Actions
const handleDelete = async (id: number) => {
  try {
    await deleteAnnouncement(id)
    message.success('删除成功')
    loadData()
  } catch (error) {
    message.error('删除失败')
  }
}

// Broadcast modal
const showBroadcastModal = ref(false)
const broadcastTarget = ref<Announcement | null>(null)
const broadcastColor = ref('white')
const broadcastMode = ref<'chat' | 'title'>('chat')
const broadcastLoading = ref(false)

const openBroadcastModal = (row: Announcement) => {
  broadcastTarget.value = row
  broadcastColor.value = 'white'
  broadcastMode.value = 'chat'
  showBroadcastModal.value = true
}

const confirmBroadcast = async () => {
  if (!broadcastTarget.value) return
  broadcastLoading.value = true
  try {
    await broadcastAnnouncement(broadcastTarget.value.id, {
      color: broadcastColor.value,
      mode: broadcastMode.value,
    })
    message.success('推送成功')
    showBroadcastModal.value = false
  } catch (error) {
    message.error('推送失败')
  } finally {
    broadcastLoading.value = false
  }
}

const openEditModal = (row: Announcement) => {
  isEditMode.value = true
  currentId.value = row.id
  formData.title = row.title
  formData.content = row.content
  formData.is_pinned = row.is_pinned
  showModal.value = true
}

const columns: DataTableColumns<Announcement> = [
  {
    title: '标题',
    key: 'title'
  },
  {
    title: '置顶',
    key: 'is_pinned',
    render(row) {
      return row.is_pinned ? h(NTag, { type: 'info' }, { default: () => '置顶' }) : ''
    }
  },
  {
    title: '创建时间',
    key: 'created_at',
    render(row) {
      return new Date(row.created_at).toLocaleString('zh-CN')
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => openEditModal(row)
            },
            { default: () => '编辑' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'info',
              onClick: () => openBroadcastModal(row)
            },
            { default: () => '推送' }
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row.id)
            },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
              default: () => '确定删除此公告吗？'
            }
          )
        ]
      })
    }
  }
]

// Modal State
const showModal = ref(false)
const isEditMode = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInst | null>(null)
const currentId = ref<number | null>(null)

const formData = reactive({
  title: '',
  content: '',
  is_pinned: false
})

const rules = {
  title: {
    required: true,
    message: '请输入公告标题',
    trigger: ['input', 'blur']
  },
  content: {
    required: true,
    message: '请输入公告内容',
    trigger: ['input', 'blur']
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  currentId.value = null
  formData.title = ''
  formData.content = ''
  formData.is_pinned = false
  showModal.value = true
}

const handleSubmit = (e: Event) => {
  e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      submitLoading.value = true
      try {
        if (isEditMode.value && currentId.value) {
          await updateAnnouncement(currentId.value, formData)
          message.success('更新成功')
        } else {
          await createAnnouncement(formData)
          message.success('创建成功')
        }
        showModal.value = false
        loadData()
      } catch (error) {
        message.error(isEditMode.value ? '更新失败' : '创建失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.announcements-page {
  padding: 24px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.header h2 {
  margin: 0;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);
}
.color-swatch:hover {
  transform: scale(1.15);
}
.color-swatch.active {
  border-color: var(--accent-color, #f472b6);
  box-shadow: 0 0 0 2px var(--accent-color, rgba(244, 114, 182, 0.4)), inset 0 0 0 1px rgba(0,0,0,0.2);
  transform: scale(1.15);
}
</style>
