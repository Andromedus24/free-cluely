import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { MarketplaceApiClient } from '../interfaces/MarketplaceInterfaces';
import { MarketplaceError } from '../types/MarketplaceTypes';

export class ApiClientImpl implements MarketplaceApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(baseURL: string, timeout: number = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const { response, request, message } = error;

        if (response) {
          // Server responded with error status
          const status = response.status;
          const data = response.data as any;

          switch (status) {
            case 400:
              throw new MarketplaceError(data?.message || 'Bad request', 'BAD_REQUEST', error);
            case 401:
              throw new MarketplaceError('Unauthorized', 'UNAUTHORIZED', error);
            case 403:
              throw new MarketplaceError('Forbidden', 'FORBIDDEN', error);
            case 404:
              throw new MarketplaceError('Resource not found', 'NOT_FOUND', error);
            case 429:
              throw new MarketplaceError('Rate limit exceeded', 'RATE_LIMIT', error);
            case 500:
              throw new MarketplaceError('Internal server error', 'SERVER_ERROR', error);
            default:
              throw new MarketplaceError(
                data?.message || `Request failed with status ${status}`,
                `HTTP_${status}`,
                error
              );
          }
        } else if (request) {
          // No response received
          throw new MarketplaceError('Network error - no response received', 'NETWORK_ERROR', error);
        } else {
          // Request setup error
          throw new MarketplaceError(`Request setup error: ${message}`, 'REQUEST_ERROR', error);
        }
      }
    );
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>,
    authenticated: boolean = false
  ): Promise<T> {
    try {
      if (authenticated && !this.authToken) {
        throw new MarketplaceError('Authentication required', 'AUTH_REQUIRED');
      }

      const response: AxiosResponse<T> = await this.client.request({
        method,
        url: endpoint,
        data,
        params,
      });

      return response.data;
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(`API request failed: ${(error as Error).message}`, 'API_ERROR', error as Error);
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, params, false);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, data, undefined, false);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, data, undefined, false);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, undefined, false);
  }

  async authGet<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, params, true);
  }

  async authPost<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, data, undefined, true);
  }

  async authPut<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, data, undefined, true);
  }

  async authDelete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, undefined, true);
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  async uploadFile<T>(endpoint: string, file: Buffer, filename: string): Promise<T> {
    try {
      const formData = new FormData();
      const blob = new Blob([file]);
      formData.append('file', blob, filename);

      const response: AxiosResponse<T> = await this.client.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(`File upload failed: ${(error as Error).message}`, 'UPLOAD_ERROR', error as Error);
    }
  }

  async downloadFile(endpoint: string): Promise<Buffer> {
    try {
      const response: AxiosResponse<ArrayBuffer> = await this.client.get(endpoint, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      if (error instanceof MarketplaceError) {
        throw error;
      }
      throw new MarketplaceError(`File download failed: ${(error as Error).message}`, 'DOWNLOAD_ERROR', error as Error);
    }
  }
}