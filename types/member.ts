export type StoreRole = "owner" | "manager" | "cashier" | "warehouse";
export type MemberStatus = "active" | "suspended";

export type Member = {
  user_id: string;
  full_name: string;
  email: string;
  role: StoreRole;
  status: MemberStatus;
  created_at: string;
};

export type AddMemberInput = {
  name: string;
  email: string;
  password: string;
  role: StoreRole;
};

export type UpdateMemberInput = {
  role?: StoreRole;
  status?: MemberStatus;
};
