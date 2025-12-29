import { database } from '@/database';
import {
  mutations,
  MutationTypeEnum,
  StatusEnum,
  type Mutation,
} from '@/database/schema';
import { eq } from 'drizzle-orm';

export interface CreateMutationPayload {
  type: MutationTypeEnum;
  payload: string;
  pkgId: string;
}
export const getAllMutations = async (): Promise<Mutation[]> => {
  return await database.select().from(mutations);
};

export const createMutation = async (
  createMutationPayload: CreateMutationPayload,
) => {
  const [newMutation] = await database
    .insert(mutations)
    .values({
      ...createMutationPayload,
      status: StatusEnum.Pending,
      retryCount: 0,
    })
    .returning();
  return newMutation;
};

export const updateMutation = async (mutation: Mutation) => {
  return await database
    .update(mutations)
    .set(mutation)
    .where(eq(mutations.id, mutation.id))
    .returning();
};
export const getPendingMutations = async (): Promise<Mutation[]> => {
  return await database
    .select()
    .from(mutations)
    .where(eq(mutations.status, StatusEnum.Pending));
};
