import { apiFetch } from './client';

export interface CaregiverDocument {
  id: string;
  care_associate_id: string;
  document_type: string;
  title: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  verification_status: string;
  verification_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  issued_on: string | null;
  expires_on: string | null;
  uploaded_by: string;
  created_at: string;
}

export function apiListDocuments(careAssociateId?: string, verificationStatus?: string) {
  return apiFetch<CaregiverDocument[]>('/documents', {
    params: {
      care_associate_id: careAssociateId,
      verification_status: verificationStatus,
    },
  });
}

export function apiSetDocumentVerification(
  documentId: string,
  verificationStatus: string,
  verificationNotes?: string
) {
  return apiFetch<void>(`/documents/${documentId}/verification`, {
    method: 'PATCH',
    body: {
      verification_status: verificationStatus,
      verification_notes: verificationNotes,
    },
  });
}
