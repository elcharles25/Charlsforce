import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Paperclip, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TemplateEditorProps {
  templateId: string | null;
  onSave: () => void;
}

const GARTNER_ROLES = ["CIO", "CISO", "CDAO", "CTO", "I&O", "CInO", "D. Transformación"];

export const TemplateEditor = ({ templateId, onSave }: TemplateEditorProps) => {
  const [formData, setFormData] = useState({
    name: "",
    gartner_role: "",
    email_1_subject: "",
    email_1_html: "",
    email_1_attachments: [] as any[],
    email_2_subject: "",
    email_2_html: "",
    email_2_attachments: [] as any[],
    email_3_subject: "",
    email_3_html: "",
    email_3_attachments: [] as any[],
    email_4_subject: "",
    email_4_html: "",
    email_4_attachments: [] as any[],
    email_5_subject: "",
    email_5_html: "",
    email_5_attachments: [] as any[],
  });

const [uploading, setUploading] = useState(false);
const { toast } = useToast();

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
  if (!templateId) return;
  
  const { data } = await supabase.from("campaign_templates").select("*").eq("id", templateId).single();
  if (data) {
    setFormData({
      name: data.name,
      gartner_role: data.gartner_role,
      email_1_subject: data.email_1_subject,
      email_1_html: data.email_1_html,
      email_1_attachments: (data.email_1_attachments as any) || [],
      email_2_subject: data.email_2_subject,
      email_2_html: data.email_2_html,
      email_2_attachments: (data.email_2_attachments as any) || [],
      email_3_subject: data.email_3_subject,
      email_3_html: data.email_3_html,
      email_3_attachments: (data.email_3_attachments as any) || [],
      email_4_subject: data.email_4_subject,
      email_4_html: data.email_4_html,
      email_4_attachments: (data.email_4_attachments as any) || [],
      email_5_subject: data.email_5_subject,
      email_5_html: data.email_5_html,
      email_5_attachments: (data.email_5_attachments as any) || [],
    });
  }
};

  const handleFileUpload = async (emailNumber: number, e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  setUploading(true);
  const uploadedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = `templates/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("webinars").upload(fileName, file);

    if (!error && data) {
      const { data: urlData } = supabase.storage.from("webinars").getPublicUrl(fileName);
      uploadedFiles.push({ name: file.name, url: urlData.publicUrl });
    }
  }

  const attachmentKey = `email_${emailNumber}_attachments` as keyof typeof formData;
  setFormData({ 
    ...formData, 
    [attachmentKey]: [...(formData[attachmentKey] as any[]), ...uploadedFiles] 
  });
  setUploading(false);
  toast({ title: "Éxito", description: `${uploadedFiles.length} archivo(s) subido(s)` });
};

const removeAttachment = (emailNumber: number, index: number) => {
  const attachmentKey = `email_${emailNumber}_attachments` as keyof typeof formData;
  const newAttachments = (formData[attachmentKey] as any[]).filter((_, i) => i !== index);
  setFormData({ ...formData, [attachmentKey]: newAttachments });
};

const handleDelete = async () => {
  if (!templateId) return;

  const { error } = await supabase
    .from("campaign_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    toast({ 
      title: "Error", 
      description: "No se pudo eliminar la plantilla", 
      variant: "destructive" 
    });
  } else {
    toast({ 
      title: "Éxito", 
      description: "Plantilla eliminada correctamente" 
    });
    onSave(); // Esto cerrará el diálogo y actualizará la lista
  }
};

 const handleSave = async () => {
  if (!formData.name || !formData.gartner_role) {
    toast({ title: "Error", description: "Nombre y rol son requeridos", variant: "destructive" });
    return;
  }

  // Validar duplicados
  let query = supabase
    .from("campaign_templates")
    .select("id")
    .eq("name", formData.name)
    .eq("gartner_role", formData.gartner_role);

  // Si estamos editando, excluir el template actual de la búsqueda
  if (templateId) {
    query = query.neq("id", templateId);
  }

  const { data: existingTemplate } = await query.maybeSingle();

  if (existingTemplate) {
    toast({ 
      title: "Plantilla duplicada", 
      description: `Ya existe una plantilla con el nombre '${formData.name}' para el rol '${formData.gartner_role}'. Por favor usa otro nombre o elige otro rol.`,
      variant: "destructive" 
    });
    return;
  }

  const payload = {
    name: formData.name,
    gartner_role: formData.gartner_role,
    email_1_subject: formData.email_1_subject,
    email_1_html: formData.email_1_html,
    email_1_attachments: formData.email_1_attachments,
    email_2_subject: formData.email_2_subject,
    email_2_html: formData.email_2_html,
    email_2_attachments: formData.email_2_attachments,
    email_3_subject: formData.email_3_subject,
    email_3_html: formData.email_3_html,
    email_3_attachments: formData.email_3_attachments,
    email_4_subject: formData.email_4_subject,
    email_4_html: formData.email_4_html,
    email_4_attachments: formData.email_4_attachments,
    email_5_subject: formData.email_5_subject,
    email_5_html: formData.email_5_html,
    email_5_attachments: formData.email_5_attachments,
  };

  if (templateId) {
    const { error } = await supabase.from("campaign_templates").update(payload).eq("id", templateId);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la plantilla", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Plantilla actualizada" });
      onSave();
    }
  } else {
    const { error } = await supabase.from("campaign_templates").insert([payload]);
    if (error) {
      toast({ title: "Error", description: "No se pudo crear la plantilla", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Plantilla creada" });
      onSave();
    }
  }
};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre de la Plantilla</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="role">Rol Gartner</Label>
          <Select value={formData.gartner_role} onValueChange={(value) => setFormData({ ...formData, gartner_role: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {GARTNER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

   {[1, 2, 3, 4, 5].map((num) => (
  <div key={num} className="border p-4 rounded-lg space-y-2">
    <h3 className="font-semibold">Email {num}</h3>
    <div>
      <Label htmlFor={`email_${num}_subject`}>Asunto</Label>
      <Input
        id={`email_${num}_subject`}
        value={formData[`email_${num}_subject` as keyof typeof formData] as string}
        onChange={(e) => setFormData({ ...formData, [`email_${num}_subject`]: e.target.value })}
      />
    </div>
    <div>
      <Label htmlFor={`email_${num}_html`}>HTML</Label>
      <Textarea
        id={`email_${num}_html`}
        value={formData[`email_${num}_html` as keyof typeof formData] as string}
        onChange={(e) => setFormData({ ...formData, [`email_${num}_html`]: e.target.value })}
        rows={6}
        className="font-mono text-sm"
      />
    </div>
    
    <div>
      <Label htmlFor={`email_${num}_attachments`}>Archivos Adjuntos Email {num}</Label>
      <Input
        id={`email_${num}_attachments`}
        type="file"
        multiple
        onChange={(e) => handleFileUpload(num, e)}
        disabled={uploading}
        className="cursor-pointer"
      />
      {(formData[`email_${num}_attachments` as keyof typeof formData] as any[])?.length > 0 && (
        <div className="mt-2 space-y-1">
          {(formData[`email_${num}_attachments` as keyof typeof formData] as any[]).map((file: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="flex items-center text-sm">
                <Paperclip className="h-3 w-3 mr-2" />
                {file.name}
              </span>
              <Button size="sm" variant="ghost" onClick={() => removeAttachment(num, index)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
))}

<div className="flex justify-between gap-2">
  {/* Botón eliminar a la izquierda - solo visible al editar */}
  {templateId && (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" type="button">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. La plantilla "{formData.name}" será eliminada permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )}
  
  {/* Botón guardar a la derecha */}
  <Button onClick={handleSave}>
    <Save className="mr-2 h-4 w-4" />
    Guardar Plantilla
  </Button>
</div>
    </div>
  );
};