import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DraftEmailPayload {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
}

interface BatchDraftPayload {
  emails: DraftEmailPayload[];
}

const API_URL = 'http://localhost:3001/api';

export const useOutlookDraft = () => {
  return useMutation({
    mutationFn: async (email: DraftEmailPayload) => {
      const response = await fetch(`${API_URL}/draft-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(email),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Error al crear borrador');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Borrador creado exitosamente en Outlook');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

export const useOutlookDraftBatch = () => {
  return useMutation({
    mutationFn: async (payload: BatchDraftPayload) => {
      const response = await fetch(`${API_URL}/draft-emails-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Error al crear borradores');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.message}`);
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
};

// Función helper para convertir archivo a base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};