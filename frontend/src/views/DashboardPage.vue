<template>
  <div class="dashboard-page">
    <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <h2 style="margin: 0; font-size: 28px; font-weight: 600;">系统概览</h2>
      </div>
      <n-tag :type="rconTagType" round size="large" style="padding: 0 16px;">
        <template #icon>
          <n-icon :component="PulseOutline" />
        </template>
        {{ rconLabel }}
      </n-tag>
    </div>

    <n-grid x-gap="24" y-gap="24" cols="1 s:2 m:4" responsive="screen">
      <n-gi>
        <n-card class="stat-card">
          <div class="stat-header">
            <n-icon size="24" color="#f472b6" :component="SpeedometerOutline" />
            <span class="stat-title">TPS</span>
          </div>
          <n-statistic v-if="tps">
            <template #default>
              <n-text :type="tpsColor" style="font-size: 36px; font-weight: 700; line-height: 1;">
                {{ tps.tps1m.toFixed(1) }}
              </n-text>
            </template>
            <template #label>最近1分钟</template>
          </n-statistic>
          <div v-else class="loading-state">获取中...</div>
          <div v-if="tps" class="stat-footer">
            5m: {{ tps.tps5m.toFixed(1) }} | 15m: {{ tps.tps15m.toFixed(1) }}
          </div>
          <div v-else class="stat-footer">-</div>
        </n-card>
      </n-gi>
      
      <n-gi>
        <n-card class="stat-card">
          <div class="stat-header">
            <n-icon size="24" color="#3b82f6" :component="PeopleOutline" />
            <span class="stat-title">在线玩家</span>
          </div>
          <n-statistic v-if="players" :value="players.online">
            <template #default>
              <span style="font-size: 36px; font-weight: 700; line-height: 1;">{{ players.online }}</span>
            </template>
            <template #suffix>
              <span style="font-size: 20px; color: var(--text-color-3, #888);">/ {{ players.max }}</span>
            </template>
          </n-statistic>
          <div v-else class="loading-state">获取中...</div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card class="stat-card">
          <div class="stat-header">
            <n-icon size="24" color="#f59e0b" :component="HardwareChipOutline" />
            <span class="stat-title">资源使用率</span>
          </div>
          <div v-if="memory || cpu !== null" style="display: flex; flex-direction: column; gap: 16px; margin-top: 4px;">
            <div v-if="memory">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 6px;">
                <span>内存 ({{ memory.used }}M / {{ memory.total }}M)</span>
                <span>{{ memoryPercent }}%</span>
              </div>
              <n-progress 
                type="line" 
                :percentage="memoryPercent" 
                :show-indicator="false"
                processing 
                status="warning"
              />
            </div>
            
            <div v-if="cpu !== null">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 6px;">
                <span>系统 CPU</span>
                <span>{{ Math.round(cpu.system) }}%</span>
              </div>
              <n-progress 
                type="line" 
                :percentage="Math.round(cpu.system)" 
                :show-indicator="false"
                processing 
                status="info"
              />
            </div>
          </div>
          <div v-else class="loading-state">获取中...</div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card class="stat-card">
          <div class="stat-header">
            <n-icon size="24" color="#8b5cf6" :component="ServerOutline" />
            <span class="stat-title">服务器状态</span>
          </div>
          <n-statistic>
            <template #default>
              <n-text :type="rconTagType" style="font-size: 28px; font-weight: 700; line-height: 1.2;">
                {{ rconLabel }}
              </n-text>
            </template>
          </n-statistic>
          <div style="margin-top: 16px;">
            <n-popconfirm
              @positive-click="handleRestart"
              positive-text="确定重启"
              negative-text="取消"
            >
              <template #trigger>
                <n-button type="error" size="small" block :loading="restarting" :disabled="rconStatus !== 'connected'">
                  <template #icon><n-icon :component="RefreshOutline" /></template>
                  快速重启
                </n-button>
              </template>
              确定要重启服务器吗？所有在线玩家将被断开连接。
            </n-popconfirm>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid cols="1" style="margin-top: 24px;">
      <n-gi>
        <n-card title="服务器延迟" class="content-card" :segmented="{ content: true }" size="small">
          <template #header-extra>
            <n-icon size="20" :component="WifiOutline" />
          </template>
          
          <div v-if="loadingUptime" class="empty-state">获取中...</div>
          <div v-else-if="uptimeError" class="empty-state">延迟数据不可用</div>
          <div v-else>
            <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
              <div style="flex: 1 1 400px; display: flex; flex-direction: column; gap: 16px;">
                <div v-for="(monitor, index) in uptimeMonitors" :key="monitor.id" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--command-input-bg, rgba(255, 255, 255, 0.03)); border-radius: 8px; border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <span style="font-weight: 600; font-size: 16px; color: var(--body-color, #fff);">{{ monitor.name }}</span>
                      <n-tag :type="monitor.status === 1 ? 'success' : 'error'" size="small" round>
                        {{ monitor.status === 1 ? 'UP' : 'DOWN' }}
                      </n-tag>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-color-3, #888);">
                      <span>24h可用率: {{ (monitor.uptime1d * 100).toFixed(1) }}%</span>
                      <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">{{ monitor.hostname || '' }}</span>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div :style="{ fontSize: '28px', fontWeight: 700, lineHeight: 1, color: index === 0 ? '#f472b6' : '#3b82f6' }">
                      {{ monitor.responseTime }}<span style="font-size: 14px; font-weight: normal; margin-left: 4px;">ms</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style="flex: 1 1 400px; height: 190px;">
                <v-chart :option="chartOption" autoresize />
              </div>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid x-gap="24" y-gap="24" cols="1 m:2" responsive="screen" style="margin-top: 24px;">
      <n-gi>
        <n-card title="在线玩家列表" class="content-card" :segmented="{ content: true }" size="small">
          <template #header-extra>
            <n-icon size="20" :component="PeopleOutline" />
          </template>
          <template v-if="!players">
            <div class="empty-state">获取中...</div>
          </template>
          <template v-else-if="players.list.length === 0">
            <n-empty description="暂无在线玩家" />
          </template>
          <div v-else class="players-grid">
            <div v-for="player in players.list" :key="player" class="player-card">
              <img :src="`https://minotar.net/helm/${player}/32.png`" class="player-avatar" :alt="player" />
              <span class="player-name">{{ player }}</span>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="公告推送" class="content-card" :segmented="{ content: true }" size="small">
          <template #header-extra>
            <n-icon size="20" :component="MegaphoneOutline" />
          </template>
          <n-list v-if="announcements.length > 0" hoverable clickable>
            <n-list-item v-for="ann in announcements" :key="ann.id">
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: var(--body-color, #fff);">{{ ann.title }}</div>
              <div style="color: var(--text-color-3, #666); font-size: 12px; margin-bottom: 8px;">{{ new Date(ann.created_at).toLocaleString() }}</div>
              <div style="color: var(--text-color-3, #bbb);">{{ ann.content }}</div>
            </n-list-item>
          </n-list>
          <n-empty v-else description="暂无公告" />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  NGrid, NGi, NCard, NStatistic, NTag, NProgress, NText, 
  NList, NListItem, NEmpty, NIcon, NButton, NPopconfirm, useMessage 
} from 'naive-ui'
import { 
  SpeedometerOutline, PeopleOutline, HardwareChipOutline, 
  ServerOutline, PulseOutline, MegaphoneOutline, RefreshOutline, WifiOutline 
} from '@vicons/ionicons5'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

import { useServerStatus } from '../composables/useServerStatus'
import { useTheme } from '../composables/useTheme'
import { http } from '../api/http'
import type { Announcement } from '../types'

interface UptimeMonitor {
  id: string;
  name: string;
  status: number;         // 1=UP, 0=DOWN
  responseTime: number;
  uptime1d: number;       // 0-1 ratio
  uptime30d: number;      // 0-1 ratio
  hostname?: string;
}

interface UptimeHistoryItem {
  timestamp: number;
  monitors: { id: string; responseTime: number; status: number }[];
}

const { tps, players, memory, cpu, rconStatus } = useServerStatus()
const { isDark } = useTheme()
const announcements = ref<Announcement[]>([])
const msg = useMessage()
const restarting = ref(false)

const uptimeMonitors = ref<UptimeMonitor[]>([])
const uptimeHistory = ref<UptimeHistoryItem[]>([])
const loadingUptime = ref(true)
const uptimeError = ref(false)
let uptimeTimer: number

const fetchUptimeData = async () => {
  try {
    const [monitorsRes, historyRes] = await Promise.all([
      http.get('/server/uptime'),
      http.get('/server/uptime/history')
    ])
    uptimeMonitors.value = monitorsRes.data.monitors || []
    uptimeHistory.value = historyRes.data.history || []
    uptimeError.value = false
  } catch (err) {
    uptimeError.value = true
    console.error('Failed to fetch uptime data', err)
  } finally {
    loadingUptime.value = false
  }
}

const chartOption = computed(() => {
  const dark = isDark.value
  const textColor = dark ? '#888' : '#666'
  const borderColor = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)'
  const tooltipBg = dark ? '#18181c' : '#ffffff'

  const times = uptimeHistory.value.map(h => {
    const d = new Date(h.timestamp)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
  
  const series = uptimeMonitors.value.map((m, index) => {
    const color = index === 0 ? '#f472b6' : '#3b82f6'
    const data = uptimeHistory.value.map(h => {
      const found = h.monitors.find((mon) => String(mon.id) === String(m.id))
      return found ? found.responseTime : null
    })
    
    return {
      name: m.name,
      type: 'line' as const,
      smooth: true,
      symbol: 'none',
      itemStyle: { color },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{
            offset: 0, color: index === 0 ? 'rgba(244, 114, 182, 0.3)' : 'rgba(59, 130, 246, 0.3)'
          }, {
            offset: 1, color: index === 0 ? 'rgba(244, 114, 182, 0.0)' : 'rgba(59, 130, 246, 0.0)'
          }]
        }
      },
      data
    }
  })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: tooltipBg,
      borderColor,
      textStyle: { color: textColor }
    },
    legend: {
      data: uptimeMonitors.value.map(m => m.name),
      textStyle: { color: textColor },
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      boundaryGap: false,
      data: times,
      axisLine: { lineStyle: { color: borderColor } },
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'value' as const,
      name: 'ms',
      nameTextStyle: { color: textColor },
      splitLine: { lineStyle: { color: borderColor } },
      axisLabel: { color: textColor }
    },
    series
  }
})

const handleRestart = async () => {
  restarting.value = true
  try {
    await http.post('/server/restart')
    msg.success('重启指令已发送，服务器正在重启...')
  } catch {
    msg.error('重启失败')
  } finally {
    restarting.value = false
  }
}
const tpsColor = computed(() => {
  if (!tps.value) return 'default'
  if (tps.value.tps1m >= 18) return 'success'
  if (tps.value.tps1m >= 15) return 'warning'
  return 'error'
})

const memoryPercent = computed(() => {
  if (!memory.value) return 0
  return Math.round((memory.value.used / memory.value.total) * 100)
})

const rconTagType = computed(() => {
  if (rconStatus.value === 'connected') return 'success' as const
  if (rconStatus.value === 'reconnecting') return 'warning' as const
  return 'error' as const
})

const rconLabel = computed(() => {
  if (rconStatus.value === 'connected') return '节点在线'
  if (rconStatus.value === 'reconnecting') return '正在重连'
  return '节点离线'
})

onMounted(async () => {
  try {
    const { data } = await http.get('/announcements', { params: { limit: 3 } })
    announcements.value = data.announcements
  } catch { /* ignore */ }
  
  fetchUptimeData()
  uptimeTimer = window.setInterval(fetchUptimeData, 30000)
})

onUnmounted(() => {
  if (uptimeTimer) clearInterval(uptimeTimer)
})
</script>

<style scoped>
.dashboard-page {
  padding-bottom: 24px;
}

.stat-card {
  height: 100%;
  border-radius: 12px;
  background: var(--card-color, rgba(24, 24, 28, 1));
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.stat-title {
  font-size: 16px;
  color: var(--text-color-3, #aaa);
  font-weight: 500;
}

.stat-footer {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-color-3, #666);
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
  padding-top: 12px;
}

.loading-state {
  height: 48px;
  display: flex;
  align-items: center;
  color: var(--text-color-3, #666);
}

.content-card {
  height: 100%;
  border-radius: 12px;
}

.empty-state {
  padding: 32px 0;
  text-align: center;
  color: var(--text-color-3, #666);
}

.players-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--command-input-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  padding: 6px 16px 6px 6px;
  border-radius: 24px;
  transition: all 0.2s ease;
}

.player-card:hover {
  background: rgba(244, 114, 182, 0.1);
  border-color: rgba(244, 114, 182, 0.3);
  transform: translateY(-2px);
}

.player-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  image-rendering: pixelated;
  background: #000;
}

.player-name {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 14px;
  color: var(--body-color, #e2e8f0);
}
</style>
