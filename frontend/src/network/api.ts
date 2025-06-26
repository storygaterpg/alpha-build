/**
 * API Service
 * 
 * A simple wrapper around fetch for making REST API calls
 */

// Default options for fetch
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies in requests
};

// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * API service for making REST API calls
 */
class ApiService {
  private baseUrl: string;

  /**
   * Create a new ApiService
   * @param customBaseUrl Optional custom base URL to override VITE_API_URL
   */
  constructor(customBaseUrl?: string) {
    this.baseUrl = customBaseUrl || API_BASE_URL;
  }

  /**
   * Make a request to the API
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise with the response data
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Merge default options with provided options
    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, fetchOptions);
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      // Check if the response is empty
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Return empty object for non-JSON responses
        return {} as T;
      }
      
      // Parse the response as JSON
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Make a GET request
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise with the response data
   */
  public async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Make a POST request
   * @param endpoint API endpoint
   * @param data Request body
   * @param options Request options
   * @returns Promise with the response data
   */
  public async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make a PUT request
   * @param endpoint API endpoint
   * @param data Request body
   * @param options Request options
   * @returns Promise with the response data
   */
  public async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make a PATCH request
   * @param endpoint API endpoint
   * @param data Request body
   * @param options Request options
   * @returns Promise with the response data
   */
  public async patch<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make a DELETE request
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise with the response data
   */
  public async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Set the authorization token for all future requests
   * @param token The authorization token
   */
  public setAuthToken(token: string): void {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Clear the authorization token
   */
  public clearAuthToken(): void {
    const { Authorization, ...headers } = defaultOptions.headers as Record<string, string>;
    defaultOptions.headers = headers;
  }
}

// Create a singleton instance
const api = new ApiService();

export default api; 