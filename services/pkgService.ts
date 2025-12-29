import { eq } from 'drizzle-orm';

import { database } from '@/database';
import { pkgs, type Pkg } from '@/database/schema';

export const createPkg = async () => {
  // Create package immediately (optimistic write)
  const [pkg] = await database.insert(pkgs).values({}).returning();

  return pkg;
};

export const updatePkg = async (pkgId: string, imageUri: string) => {
  // Update package with local image URI (optimistic write)
  const [updatedPkg] = await database
    .update(pkgs)
    .set({
      imageUrl: imageUri,
    })
    .where(eq(pkgs.id, pkgId))
    .returning();
  return updatedPkg;
};

export const getAllPkgs = async (): Promise<Pkg[]> => {
  return (await database.select().from(pkgs)) as Pkg[];
};

export const getPkgById = async (id: string): Promise<Pkg | undefined> => {
  const result = await database.select().from(pkgs).where(eq(pkgs.id, id));
  return result[0];
};
