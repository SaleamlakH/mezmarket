import type {
  CreateProductInput,
  CreateProductResponse,
  CreateProductUnitInput,
  CreateProductUnitResponse,
  CreateUploadResponse,
  DownloadUrlsResponse,
  ProductListStatus,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  ProductWithUnitsResponse,
  UpdateProductActiveInput,
  UpdateProductActiveResponse,
  UpdateProductInput,
  UpdateProductResponse,
  UpdateProductUnitsInput,
  UpdateProductUnitsResponse,
  UpdateUploadResponse,
} from '@mez/types';
import type { CreateUploadClientInput, UpdateUploadClientInput } from '@mez/validation';
import { apiClient, type ApiClient } from '@/lib/apiClient';

export interface ProductsService {
  listProducts(businessId: string, status?: ProductListStatus): Promise<ProductSummaryResponse[]>;
  getProductUnits(businessId: string, productId: string): Promise<ProductUnitOptionResponse[]>;
  getProduct(businessId: string, productId: string): Promise<ProductWithUnitsResponse>;
  createProduct(businessId: string, input: CreateProductInput): Promise<CreateProductResponse>;
  createProductUnit(
    businessId: string,
    productId: string,
    input: CreateProductUnitInput,
  ): Promise<CreateProductUnitResponse>;
  updateProduct(
    businessId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<UpdateProductResponse>;
  updateProductUnits(
    businessId: string,
    productId: string,
    input: UpdateProductUnitsInput,
  ): Promise<UpdateProductUnitsResponse>;
  setProductActive(
    businessId: string,
    productId: string,
    input: UpdateProductActiveInput,
  ): Promise<UpdateProductActiveResponse>;
  createProductUpload(
    businessId: string,
    input: CreateUploadClientInput,
  ): Promise<CreateUploadResponse>;
  updateProductUpload(
    businessId: string,
    productId: string,
    input: UpdateUploadClientInput,
  ): Promise<UpdateUploadResponse>;
  putFile(uploadUrl: string, file: File): Promise<void>;
  getProductUploadUrls(businessId: string): Promise<DownloadUrlsResponse>;
}

function productsPath(businessId: string) {
  return `/api/businesses/${businessId}/products`;
}

function productPath(businessId: string, productId: string) {
  return `${productsPath(businessId)}/${productId}`;
}

function productUploadsPath(businessId: string) {
  return `${productsPath(businessId)}/uploads`;
}

function productUploadUrlsPath(businessId: string) {
  return `${productUploadsPath(businessId)}/urls`;
}

export function createProductsService(client: ApiClient): ProductsService {
  return {
    async listProducts(businessId, status) {
      const query = status ? `?status=${status}` : '';
      return client.get<ProductSummaryResponse[]>(`${productsPath(businessId)}${query}`);
    },

    async getProductUnits(businessId, productId) {
      return client.get<ProductUnitOptionResponse[]>(`${productPath(businessId, productId)}/units`);
    },

    async getProduct(businessId, productId) {
      return client.get<ProductWithUnitsResponse>(productPath(businessId, productId));
    },

    async createProduct(businessId, input) {
      return client.post<CreateProductResponse>(productsPath(businessId), input);
    },

    async createProductUnit(businessId, productId, input) {
      return client.post<CreateProductUnitResponse>(
        `${productPath(businessId, productId)}/units`,
        input,
      );
    },

    async updateProduct(businessId, productId, input) {
      return client.put<UpdateProductResponse>(productPath(businessId, productId), input);
    },

    async updateProductUnits(businessId, productId, input) {
      return client.put<UpdateProductUnitsResponse>(
        `${productPath(businessId, productId)}/units`,
        input,
      );
    },

    async setProductActive(businessId, productId, input) {
      return client.patch<UpdateProductActiveResponse>(
        `${productPath(businessId, productId)}/active`,
        input,
      );
    },

    async createProductUpload(businessId, input) {
      return client.post<CreateUploadResponse>(productUploadsPath(businessId), input);
    },

    async updateProductUpload(businessId, productId, input) {
      return client.put<UpdateUploadResponse>(
        `${productPath(businessId, productId)}/uploads`,
        input,
      );
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
