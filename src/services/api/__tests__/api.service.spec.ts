/**
 * API Service のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiService } from '../api.service';

// API Clientsをモック化
vi.mock('../api-client.factory', () => ({
  ApiClientFactory: {
    getInstance: vi.fn(() => ({
      getDocumentClient: vi.fn(() => ({
        getDocument: vi.fn(),
        getRepositoryStructure: vi.fn()
      })),
      getLLMClient: vi.fn(() => ({
        sendLLMQuery: vi.fn(),
        getLLMCapabilities: vi.fn()
      })),
      getMCPToolsClient: vi.fn(() => ({
        getMCPTools: vi.fn()
      })),
      getRepositoryClient: vi.fn(() => ({
        listRepositories: vi.fn(),
        createRepository: vi.fn()
      })),
      getStreamingClient: vi.fn(() => ({
        streamLLMQuery: vi.fn()
      })),
      getInfrastructureClient: vi.fn(() => ({
        healthCheck: vi.fn()
      }))
    }))
  }
}));

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    apiService = new ApiService();
  });

  it('ApiServiceが正しくインスタンス化されること', () => {
    expect(apiService).toBeInstanceOf(ApiService);
  });

  it('getDocumentメソッドが利用可能であること', () => {
    expect(typeof apiService.getDocument).toBe('function');
  });

  it('sendLLMQueryメソッドが利用可能であること', () => {
    expect(typeof apiService.sendLLMQuery).toBe('function');
  });

  it('getMCPToolsメソッドが利用可能であること', () => {
    expect(typeof apiService.getMCPTools).toBe('function');
  });
});
