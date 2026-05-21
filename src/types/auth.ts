export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  /** Phone / contact number from API (`number`). */
  number?: string;
}
