export type UserRole = 'admin' | 'profesor' | 'alumno';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  role: UserRole;
  email_verified: boolean;
  created_at: Date;
}

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role'>;

export interface CreateUserParams {
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  role: UserRole;
}

export interface UserRepository {
  getByEmail(email: string): Promise<User | null>;
  getById(id: string): Promise<User | null>;
  getPrimaryAdmin(): Promise<User | null>;
  verifyEmail(id: string): Promise<boolean>;
  create(params: CreateUserParams): Promise<User>;
  createPrimaryAdmin(params: Omit<CreateUserParams, 'phone' | 'role'>): Promise<User>;
}
