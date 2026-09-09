export interface Owner {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateOwnerInput = Partial<Pick<Owner, 'name' | 'contactEmail' | 'contactPhone'>>;

export type OwnerRepository = {
  findOwnerById(ownerId: string): Promise<Owner | null>;
  updateOwner(ownerId: string, data: UpdateOwnerInput): Promise<Owner>;
};

export type OwnerService = {
  getOwner(ownerId: string | undefined): Promise<Owner>;
  updateOwner(ownerId: string | undefined, data: UpdateOwnerInput): Promise<Owner>;
};
