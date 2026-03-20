<template>
  <div class="players-page">
    <n-card>
      <template #header>
        在线玩家 ({{ players?.online ?? 0 }}/{{ players?.max ?? 0 }})
      </template>

      <n-data-table
        v-if="tableData.length > 0"
        :columns="columns"
        :data="tableData"
        :bordered="false"
      />
      
      <n-empty v-else description="暂无在线玩家" />
    </n-card>

    <n-modal v-model:show="showKickModal">
      <n-card
        style="width: 400px"
        title="踢出玩家"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <n-space vertical size="large">
          <p>确定要踢出玩家 {{ kickTarget }} 吗？</p>
          <n-input
            v-model:value="kickReason"
            placeholder="踢出原因（可选）"
            @keyup.enter="confirmKick"
          />
          <n-space justify="end">
            <n-button @click="showKickModal = false">取消</n-button>
            <n-button type="error" :loading="kicking" @click="confirmKick">确认</n-button>
          </n-space>
        </n-space>
      </n-card>
    </n-modal>

    <n-modal v-model:show="showBanModal">
      <n-card
        style="width: 400px"
        title="封禁玩家"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <n-space vertical size="large">
          <p>确定要封禁玩家 {{ banTarget }} 吗？封禁后该玩家将无法进入服务器。</p>
          <n-input
            v-model:value="banReason"
            placeholder="封禁原因（可选）"
            @keyup.enter="confirmBan"
          />
          <n-space justify="end">
            <n-button @click="showBanModal = false">取消</n-button>
            <n-button type="error" :loading="banning" @click="confirmBan">确认封禁</n-button>
          </n-space>
        </n-space>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { NDataTable, NButton, NModal, NInput, NSpace, NEmpty, useMessage, NCard } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useServerStatus } from '../composables/useServerStatus'
import { kickPlayer, banPlayer } from '../api/players'

const { players } = useServerStatus()
const message = useMessage()

const showKickModal = ref(false)
const kickTarget = ref('')
const kickReason = ref('')
const kicking = ref(false)

const showBanModal = ref(false)
const banTarget = ref('')
const banReason = ref('')
const banning = ref(false)

const tableData = computed(() => {
  return players.value?.list.map(name => ({ name })) ?? []
})

const columns: DataTableColumns<{ name: string }> = [
  {
    title: '玩家信息',
    key: 'name',
    render(row) {
      return h('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
        h('img', {
          src: `https://minotar.net/helm/${row.name}/32.png`,
          style: 'width: 32px; height: 32px; border-radius: 6px; image-rendering: pixelated; background: #000;',
          alt: row.name
        }),
        h('span', { style: 'font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: 15px;' }, row.name)
      ])
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, {
            type: 'warning',
            size: 'small',
            onClick: () => {
              kickTarget.value = row.name
              kickReason.value = ''
              showKickModal.value = true
            }
          }, { default: () => '踢出' }),
          h(NButton, {
            type: 'error',
            size: 'small',
            onClick: () => {
              banTarget.value = row.name
              banReason.value = ''
              showBanModal.value = true
            }
          }, { default: () => '封禁' })
        ]
      })
    }
  }
]

async function confirmKick() {
  kicking.value = true
  try {
    await kickPlayer(kickTarget.value, kickReason.value || undefined)
    message.success(`已踢出玩家 ${kickTarget.value}`)
    showKickModal.value = false
  } catch (err: any) {
    message.error(`踢出失败: ${err?.response?.data?.error || err.message}`)
  } finally {
    kicking.value = false
  }
}

async function confirmBan() {
  banning.value = true
  try {
    await banPlayer(banTarget.value, banReason.value || undefined)
    message.success(`已封禁玩家 ${banTarget.value}`)
    showBanModal.value = false
  } catch (err: any) {
    message.error(`封禁失败: ${err?.response?.data?.error || err.message}`)
  } finally {
    banning.value = false
  }
}
</script>

<style scoped>
.players-page {
  padding: 16px;
}
</style>
