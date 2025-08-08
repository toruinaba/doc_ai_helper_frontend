<template>
  <div class="repository-details" v-if="repository">
    <FormSection title="基本情報" icon="pi pi-info-circle">
      <div class="details-grid">
        <div class="detail-item">
          <label>リポジトリ名</label>
          <span class="detail-value">{{ repository.name }}</span>
        </div>
        
        <div class="detail-item">
          <label>所有者</label>
          <span class="detail-value">{{ repository.owner }}</span>
        </div>
        
        <div v-if="repository.description" class="detail-item full-width">
          <label>説明</label>
          <span class="detail-value">{{ repository.description }}</span>
        </div>
        
        <div class="detail-item">
          <label>サービス</label>
          <div class="service-value">
            <i :class="getServiceIcon(repository.service_type)" class="service-icon"></i>
            <span>{{ getServiceLabel(repository.service_type) }}</span>
          </div>
        </div>
        
        <div class="detail-item">
          <label>URL</label>
          <a :href="repository.url" target="_blank" class="url-link">
            {{ repository.url }}
            <i class="pi pi-external-link"></i>
          </a>
        </div>
      </div>
    </FormSection>

    <FormSection title="Git設定" icon="pi pi-code-branch">
      <div class="details-grid">
        <div class="detail-item">
          <label>デフォルトブランチ</label>
          <span class="detail-value branch-name">
            <i class="pi pi-code-branch"></i>
            {{ repository.default_branch || 'main' }}
          </span>
        </div>
        
        <div v-if="repository.base_url" class="detail-item">
          <label>ベースURL</label>
          <span class="detail-value">{{ repository.base_url }}</span>
        </div>
      </div>
    </FormSection>

    <FormSection title="ドキュメント設定" icon="pi pi-file">
      <div class="details-grid">
        <div v-if="repository.document_root_directory" class="detail-item">
          <label>ドキュメントルートディレクトリ</label>
          <span class="detail-value directory-path">
            <i class="pi pi-folder"></i>
            {{ repository.document_root_directory }}
          </span>
        </div>
        
        <div v-if="repository.root_document_path" class="detail-item">
          <label>ルートドキュメントパス</label>
          <span class="detail-value file-path">
            <i class="pi pi-file"></i>
            {{ repository.root_document_path }}
          </span>
        </div>
      </div>
    </FormSection>

    <FormSection title="アクセス設定" icon="pi pi-shield">
      <div class="details-grid">
        <div class="detail-item">
          <label>公開リポジトリ</label>
          <span class="detail-value">
            <i :class="repository.is_public ? 'pi pi-check text-green' : 'pi pi-times text-muted'"></i>
            {{ repository.is_public ? 'はい' : 'いいえ' }}
          </span>
        </div>
        
        <div v-if="!repository.is_public && repository.access_token" class="detail-item">
          <label>アクセストークン</label>
          <span class="detail-value token-value">
            <span>{{ maskedToken }}</span>
            <Button
              icon="pi pi-eye"
              severity="secondary"
              text
              size="small"
              @click="toggleTokenVisibility"
              class="toggle-token-btn"
            />
          </span>
        </div>
      </div>
    </FormSection>

    <FormSection title="状態情報" icon="pi pi-info">
      <div class="details-grid">
        <div class="detail-item">
          <label>状態</label>
          <div class="status-value">
            <i 
              :class="getStatusIcon(healthStatus)" 
              :style="{ color: getStatusColor(healthStatus) }"
              class="status-icon"
            ></i>
            <span>{{ getStatusLabel(healthStatus) }}</span>
          </div>
        </div>
        
        <div class="detail-item">
          <label>作成日時</label>
          <span class="detail-value">{{ formatDate(repository.created_at) }}</span>
        </div>
        
        <div class="detail-item">
          <label>更新日時</label>
          <span class="detail-value">{{ formatDate(repository.updated_at) }}</span>
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
.repository-details {
  max-width: 800px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--app-spacing-base);
  margin-top: var(--app-spacing-base);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-xs);
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-weight: 500;
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
}

.detail-value {
  font-size: var(--app-font-size-base);
  color: var(--app-text-color);
  word-break: break-word;
}

.service-value {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
}

.service-icon {
  color: var(--app-primary-color);
  font-size: 1.1rem;
}

.url-link {
  color: var(--app-primary-color);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
  word-break: break-all;
  transition: color var(--app-transition-fast);
}

.url-link:hover {
  color: var(--app-primary-600);
  text-decoration: underline;
}

.branch-name {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

.branch-name .pi {
  color: var(--app-primary-color);
}

.directory-path,
.file-path {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
  font-family: var(--app-font-mono, 'Consolas', 'Monaco', monospace);
  font-size: var(--app-font-size-sm);
}

.directory-path .pi,
.file-path .pi {
  color: var(--app-primary-color);
}

.token-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--app-font-mono, 'Consolas', 'Monaco', monospace);
  font-size: var(--app-font-size-sm);
}

.toggle-token-btn {
  margin-left: var(--app-spacing-xs);
}

.status-value {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
}

.status-icon {
  font-size: 1.1rem;
}

.text-green {
  color: var(--p-green-500) !important;
}

.text-muted {
  color: var(--app-text-color-muted) !important;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-item.full-width {
    grid-column: 1;
  }
  
  .token-value {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--app-spacing-xs);
  }
}
</style>