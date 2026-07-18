export interface FinanceBuddyUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthProvider {
  getCurrentUser(): Promise<FinanceBuddyUser | null>;
  signIn(): Promise<FinanceBuddyUser>;
  signOut(): Promise<void>;
}

export interface StructuredDataProvider {
  readCollection<T>(collection: string): Promise<T[]>;
  writeCollection<T>(collection: string, records: T[]): Promise<void>;
}

export interface FileStorageProvider {
  uploadFile(input: {
    folder: string;
    name: string;
    mimeType: string;
    data: ArrayBuffer | Uint8Array;
  }): Promise<{ id: string; name: string }>;
  deleteFile(fileId: string): Promise<void>;
}

export interface FinanceBuddyProviderBundle {
  auth: AuthProvider;
  data: StructuredDataProvider;
  files: FileStorageProvider;
}

// Phase 1 establishes this contract only. The Google implementation is added
// in Phase 2-3; legacy Supabase remains isolated until migration verification.
