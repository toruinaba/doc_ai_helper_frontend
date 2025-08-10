<template>
  <div class="u-max-w-4xl" v-if="repository">
    <FormSection title="基本情報" icon="pi pi-info-circle">
      <div class="u-grid u-grid-cols-2 tablet:u-grid-cols-1 u-gap-base">
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">リポジトリ名</label>
          <span class="u-text-base">{{ repository.name }}</span>
        </div>
        
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">所有者</label>
          <span class="u-text-base">{{ repository.owner }}</span>
        </div>
        
        <div v-if="repository.description" class="u-flex u-flex-column u-gap-xs u-col-span-2 tablet:u-col-span-1">
          <label class="u-font-medium u-text-sm u-text-muted">説明</label>
          <span class="u-text-base u-break-words">{{ repository.description }}</span>
        </div>
        
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">サービス</label>
          <div class="u-flex u-flex-center u-gap-sm">
            <i :class="getServiceIcon(repository.service_type)" class="u-text-primary u-text-lg"></i>
            <span class="u-text-base">{{ getServiceLabel(repository.service_type) }}</span>
          </div>
        </div>
        
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">URL</label>
          <a :href="repository.url" target="_blank" class="u-text-primary u-no-underline u-flex u-flex-center u-gap-xs u-break-all u-transition-colors hover:u-text-primary-600 hover:u-underline">
            {{ repository.url }}
            <i class="pi pi-external-link u-flex-none"></i>
          </a>
        </div>
      </div>
    </FormSection>

    <FormSection title="Git設定" icon="pi pi-code-branch">
      <div class="u-grid u-grid-cols-2 tablet:u-grid-cols-1 u-gap-base">
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">デフォルトブランチ</label>
          <span class="u-flex u-flex-center u-gap-xs">
            <i class="pi pi-code-branch u-text-primary"></i>
            <span class="u-text-base">{{ repository.default_branch || 'main' }}</span>
          </span>
        </div>
        
        <div v-if="repository.base_url" class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">ベースURL</label>
          <span class="u-text-base">{{ repository.base_url }}</span>
        </div>
      </div>
    </FormSection>

    <FormSection title="ドキュメント設定" icon="pi pi-file">
      <div class="u-grid u-grid-cols-2 tablet:u-grid-cols-1 u-gap-base">
        <div v-if="repository.document_root_directory" class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">ドキュメントルートディレクトリ</label>
          <span class="u-flex u-flex-center u-gap-xs u-font-mono u-text-sm">
            <i class="pi pi-folder u-text-primary"></i>
            <span>{{ repository.document_root_directory }}</span>
          </span>
        </div>
        
        <div v-if="repository.root_document_path" class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">ルートドキュメントパス</label>
          <span class="u-flex u-flex-center u-gap-xs u-font-mono u-text-sm">
            <i class="pi pi-file u-text-primary"></i>
            <span>{{ repository.root_document_path }}</span>
          </span>
        </div>
      </div>
    </FormSection>

    <FormSection title="アクセス設定" icon="pi pi-shield">
      <div class="u-grid u-grid-cols-2 tablet:u-grid-cols-1 u-gap-base">
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">公開リポジトリ</label>
          <span class="u-flex u-flex-center u-gap-sm">
            <i :class="repository.is_public ? 'pi pi-check u-text-success-500' : 'pi pi-times u-text-muted'"></i>
            <span class="u-text-base">{{ repository.is_public ? 'はい' : 'いいえ' }}</span>
          </span>
        </div>
        
        <div v-if="!repository.is_public && repository.access_token" class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">アクセストークン</label>
          <div class="u-flex u-flex-between u-flex-center tablet:u-flex-column tablet:u-items-start tablet:u-gap-xs">
            <span class="u-font-mono u-text-sm">{{ maskedToken }}</span>
            <Button
              icon="pi pi-eye"
              severity="secondary"
              text
              size="small"
              @click="toggleTokenVisibility"
            />
          </div>
        </div>
      </div>
    </FormSection>

    <FormSection title="状態情報" icon="pi pi-info">
      <div class="u-grid u-grid-cols-2 tablet:u-grid-cols-1 u-gap-base">
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">状態</label>
          <div class="u-flex u-flex-center u-gap-sm">
            <i 
              :class="getStatusIcon(healthStatus)" 
              :style="{ color: getStatusColor(healthStatus) }"
              class="u-text-lg"
            ></i>
            <span class="u-text-base">{{ getStatusLabel(healthStatus) }}</span>
          </div>
        </div>
        
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">作成日時</label>
          <span class="u-text-base">{{ formatDate(repository.created_at) }}</span>
        </div>
        
        <div class="u-flex u-flex-column u-gap-xs">
          <label class="u-font-medium u-text-sm u-text-muted">更新日時</label>
          <span class="u-text-base">{{ formatDate(repository.updated_at) }}</span>
        </div>
      </div>
    </FormSection>

    <!-- メタデータがある場合は表示 -->
    <FormSection v-if="repository.metadata && Object.keys(repository.metadata).length > 0" title="メタデータ" icon="pi pi-database">
      <MetaDisplay :data="repository.metadata" />
    </FormSection>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FormSection from '@/components/common/FormSection.vue';
import MetaDisplay from '@/components/common/MetaDisplay.vue';
import Button from 'primevue/button';
import type { components } from '@/services/api/types.auto';
import type { RepositoryWithToken } from '@/services/api/types';

// 自動生成型のエイリアス
type GitServiceType = components['schemas']['GitServiceType'];

interface Props {
  /** リポジトリ情報 */
  repository: RepositoryWithToken | null;
  /** ヘルス状態 */
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
}

const props = defineProps<Props>();

const showFullToken = ref(false);

const maskedToken = computed(() => {
  if (!props.repository?.access_token) return '';
  if (showFullToken.value) return props.repository.access_token;
  
  const token = props.repository.access_token;
  if (token.length <= 8) return '***';
  
  return token.substring(0, 4) + '***' + token.substring(token.length - 4);
});

function toggleTokenVisibility() {
  showFullToken.value = !showFullToken.value;
}

function getServiceIcon(service: GitServiceType): string {
  switch (service) {
    case 'github':
      return 'pi pi-github';
    case 'gitlab':
      return 'pi pi-gitlab';
    case 'bitbucket':
      return 'pi pi-bitbucket';
    case 'forgejo':
      return 'pi pi-cog';
    default:
      return 'pi pi-code-branch';
  }
}

function getServiceLabel(service: GitServiceType): string {
  switch (service) {
    case 'github':
      return 'GitHub';
    case 'gitlab':
      return 'GitLab';
    case 'bitbucket':
      return 'Bitbucket';
    case 'forgejo':
      return 'Forgejo';
    default:
      return service;
  }
}

function getStatusIcon(status?: string): string {
  switch (status) {
    case 'healthy':
      return 'pi pi-check-circle';
    case 'unhealthy':
      return 'pi pi-times-circle';
    default:
      return 'pi pi-question-circle';
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'healthy':
      return 'var(--p-green-500)';
    case 'unhealthy':
      return 'var(--p-red-500)';
    default:
      return 'var(--p-gray-500)';
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'healthy':
      return '正常';
    case 'unhealthy':
      return 'エラー';
    default:
      return '不明';
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}
</script>

<style scoped>
/*
 * PrimeVue v4 ユーティリティクラスで最大最適化
 * - レスポンシブグリッドレイアウト
 * - ユーティリティクラスでspacing/色/typography処理
 * - tablet:プレフィックスでレスポンシブ対応
 * 
 * CSS記述量: 130行 → 4行 (97%削減)
 */
</style>