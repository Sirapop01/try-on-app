// types/user.ts
export type Gender = "male" | "female" | "other";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  gender?: Gender;
  role: string;
  settings: {
    keepUploads: boolean;
    shareTelemetry: boolean;
  };
  createdAt: number; // Date.now()
  updatedAt: number;
}
