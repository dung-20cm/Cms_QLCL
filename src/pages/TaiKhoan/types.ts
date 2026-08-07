export interface FormState {
  id?: number;
  username: string;
  password: string;
  email: string;
  mobile: string;
  khoa_id: number | "";
  role_id: number | "";
  status: number;
}

export type FormErrors = Partial<
  Record<"email" | "username" | "password" | "khoa_id" | "role_id", string>
>;
