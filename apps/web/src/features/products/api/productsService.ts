import type {
  CreateProductInput,
  CreateProductResponse,
  CreateUploadResponse,
  DownloadUrlsResponse,
  ProductSummaryResponse,
} from '@mez/types';
import type { CreateUploadClientInput } from '@mez/validation';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface ProductsService {
  listProducts(businessId: string): Promise<ProductSummaryResponse[]>;
  createProduct(businessId: string, input: CreateProductInput): Promise<CreateProductResponse>;
  createProductUpload(
    businessId: string,
    input: CreateUploadClientInput,
  ): Promise<CreateUploadResponse>;
  putFile(uploadUrl: string, file: File): Promise<void>;
  getProductUploadUrls(businessId: string): Promise<DownloadUrlsResponse>;
}

function productsPath(businessId: string) {
  return `/api/businesses/${businessId}/products`;
}

function productUploadsPath(businessId: string) {
  return `${productsPath(businessId)}/uploads`;
}

function productUploadUrlsPath(businessId: string) {
  return `${productUploadsPath(businessId)}/urls`;
}

export function createProductsService(client: ApiClient): ProductsService {
  return {
    async listProducts(businessId) {
      return client.get<ProductSummaryResponse[]>(productsPath(businessId));
    },

    async createProduct(businessId, input) {
      return client.post<CreateProductResponse>(productsPath(businessId), input);
    },

    async createProductUpload(businessId, input) {
      return client.post<CreateUploadResponse>(productUploadsPath(businessId), input);
    },

    async putFile(uploadUrl, file) {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) {
        throw new Error('The image could not be uploaded. Please try again.');
      }
    },

    async getProductUploadUrls(businessId) {
      return client.get<DownloadUrlsResponse>(productUploadUrlsPath(businessId));
    },
  };
}

export const productsService = createProductsService(apiClient);
