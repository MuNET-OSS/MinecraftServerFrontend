<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
import type { FormRules, FormInst } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const formValue = ref({ username: '', password: '' })

const rules: FormRules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: ['input', 'blur']
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['input', 'blur']
  }
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch (errors) {
    return // Validation failed
  }
  
  loading.value = true
  try {
    await authStore.login(formValue.value.username, formValue.value.password)
    router.push({ name: 'dashboard' })
  } catch (err: any) {
    const msg = err?.response?.data?.error || '登录失败'
    message.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="glow-bg"></div>
    <n-card class="login-card" size="huge" :bordered="false">
      <div class="header">
        <h2 class="title">Minecraft服务器管理面板</h2>
        <p class="subtitle">欢迎回来，请登录以管理您的服务器</p>
      </div>
      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
        label-placement="top"
        size="large"
        @keyup.enter="handleLogin"
      >
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="formValue.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input 
            v-model:value="formValue.password" 
            type="password" 
            show-password-on="click" 
            placeholder="请输入密码" 
          />
        </n-form-item>
        <div style="margin-top: 32px;">
          <n-button type="primary" block size="large" :loading="loading" @click="handleLogin" class="login-btn">
            登录
          </n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--login-bg, #0d0d12);
  position: relative;
  overflow: hidden;
}

.glow-bg {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.login-card {
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
  background: var(--card-color, rgba(24, 24, 28, 0.8));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--body-color, #fff);
  margin: 0 0 8px;
}

.subtitle {
  color: var(--text-color-3, rgba(255, 255, 255, 0.5));
  font-size: 14px;
  margin: 0;
}

.login-btn {
  font-weight: 600;
  letter-spacing: 1px;
}
</style>
