<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import { NDataTable, NTag, NButton, NPopconfirm, NSpace, NText, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getPlugins, enablePlugin, disablePlugin } from '../api/plugins'
import type { PluginInfo } from '../types'

const message = useMessage()
const plugins = ref<PluginInfo[]>([])
const loading = ref(false)

const enabledCount = computed(() => plugins.value.filter(p => p.enabled).length)
const disabledCount = computed(() => plugins.value.filter(p => !p.enabled).length)

async function fetchPlugins() {
  loading.value = true
  try {
    const { data } = await getPlugins()
    plugins.value = data.plugins
  } catch (err: any) {
    message.error('获取插件列表失败')
  } finally {
    loading.value = false
  }
}

async function togglePlugin(plugin: PluginInfo) {
  try {
    if (plugin.enabled) {
      await disablePlugin(plugin.fileName)
      message.success(`插件 ${plugin.name} 已禁用，需要重启MC服务器才能生效`)
    } else {
      await enablePlugin(plugin.fileName)
      message.success(`插件 ${plugin.name} 已启用，需要重启MC服务器才能生效`)
    }
    await fetchPlugins()
  } catch (err: any) {
    message.error(`操作失败: ${err?.response?.data?.error || err.message}`)
  }
}

const columns: DataTableColumns<PluginInfo> = [
  { title: '插件名', key: 'name' },
  { title: '文件名', key: 'fileName' },
  {
    title: '状态',
    key: 'enabled',
    render(row) {
      return h(NTag, { type: row.enabled ? 'success' : 'error', size: 'small' },
        { default: () => row.enabled ? '已启用' : '已禁用' })
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(NPopconfirm, {
        onPositiveClick: () => togglePlugin(row)
      }, {
        trigger: () => h(NButton, {
          size: 'small',
          type: row.enabled ? 'warning' : 'success',
        }, { default: () => row.enabled ? '禁用' : '启用' }),
        default: () => `确定要${row.enabled ? '禁用' : '启用'}插件 ${row.name} 吗？此操作需要重启MC服务器才能生效。`
      })
    }
  }
]

onMounted(fetchPlugins)
</script>

<template>
  <NSpace vertical :size="16">
    <NSpace justify="space-between" align="center">
      <NText strong style="font-size: 18px;">插件管理</NText>
      <NText depth="3">共 {{ plugins.length }} 个插件，{{ enabledCount }} 个已启用，{{ disabledCount }} 个已禁用</NText>
    </NSpace>
    <NDataTable :columns="columns" :data="plugins" :loading="loading" :bordered="true" />
  </NSpace>
</template>
