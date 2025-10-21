// types/user.ts
export type Gender = "male" | "female" | "other";

export interface Measurements {
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  gender?: Gender;
  height_cm?: number;
  weight_kg?: number;
  measurements?: Measurements;
  settings: {
    keepUploads: boolean;
    shareTelemetry: boolean;
  };
  createdAt: number; // Date.now()
  updatedAt: number;
}
