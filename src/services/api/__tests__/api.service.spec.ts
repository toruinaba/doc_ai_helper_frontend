/**
 * API Service のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../api.service';
import axios from 'axios';

// Axiosをモック化
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    }))
  }
}));

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient = new ApiClient('http://test-api.com');
    mockAxiosInstance = axios.create();
  });

  it('正しいベースURLでインスタンス化されること', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://test-api.com',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('getDocument メソッドが正しいURLとパラメータで呼び出されること', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { content: 'test' } });

    await apiClient.getDocument('github', 'user', 'repo', 'path/to/doc.md');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/documents/contents/github/user/repo/path/to/doc.md',
      {
        params: {
          ref: 'main',
          transform_links: true,
        },
      }
    );
  });

  it('getRepositoryStructure メソッドが正しいURLとパラメータで呼び出されること', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: { tree: [] } });

    await apiClient.getRepositoryStructure('github', 'user', 'repo');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/documents/structure/github/user/repo',
      {
        params: {
          ref: 'main',
          path: '',
        },
      }
    );
  });

  it('searchRepository メソッドが正しいURLとデータで呼び出されること', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { results: [] } });

    const searchQuery = { query: 'test' };
    await apiClient.searchRepository('github', 'user', 'repo', searchQuery);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/search/github/user/repo',
      searchQuery
    );
  });
});
