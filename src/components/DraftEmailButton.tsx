import { useState } from 'react';
import { useOutlookDraft, fileToBase64 } from '@/hooks/useOutlookDraft';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface DraftEmailButtonProps {
  to: string;
  subject: string;
  body: string;
  attachmentFile?: File;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export function DraftEmailButton({
  to,
  subject,
  body,
  attachmentFile,
  variant = 'default',
  className = '',
}: DraftEmailButtonProps) {
  const { mutate: createDraft, isPending } = useOutlookDraft();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateDraft = async () => {
    if (!to || !subject || !body) {
      alert('Por favor completa los campos: destinatario, asunto y cuerpo del email');
      return;
    }

    setIsProcessing(true);

    try {
      const attachments: Array<{
        filename: string;
        content: string;
      }> = [];

      // Procesar adjunto si existe
      if (attachmentFile) {
        const base64Content = await fileToBase64(attachmentFile);
        attachments.push({
          filename: attachmentFile.name,
          content: base64Content,
        });
      }

      createDraft(
        {
          to,
          subject,
          body,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        {
          onSettled: () => setIsProcessing(false),
        }
      );
    } catch (error) {
      console.error('Error procesando archivo:', error);
      alert('Error al procesar el adjunto');
      setIsProcessing(false);
    }
  };

  const isLoading = isPending || isProcessing;

  return (
    <Button
      onClick={handleCreateDraft}
      disabled={isLoading}
      variant={variant}
      className={className}
    >
      <Mail className="w-4 h-4 mr-2" />
      {isLoading ? 'Creando borrador...' : 'Crear Borrador en Outlook'}
    </Button>
  );
}