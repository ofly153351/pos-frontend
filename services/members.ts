import { getCurrentStoreId } from "@/lib/store-storage";
import { authorizedApiRequest } from "@/services/api";
import type { AddMemberInput, Member, UpdateMemberInput } from "@/types/member";

function ensureStoreId() {
  const storeId = getCurrentStoreId();
  if (!storeId) {
    throw new Error("Missing current store");
  }
  return storeId;
}

export function listMembers() {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Member[]>(`/api/stores/${storeId}/members`);
}

export function addMember(input: AddMemberInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Member>(`/api/stores/${storeId}/members`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function updateMember(userId: string, input: UpdateMemberInput) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<Member>(`/api/stores/${storeId}/members/${userId}`, {
    body: input,
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export function removeMember(userId: string) {
  const storeId = ensureStoreId();
  return authorizedApiRequest<null>(`/api/stores/${storeId}/members/${userId}`, {
    allowEmptyData: true,
    method: "DELETE",
  });
}
