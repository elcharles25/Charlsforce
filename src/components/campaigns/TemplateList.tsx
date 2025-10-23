import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Paperclip, Download } from "lucide-react";
import { TemplateEditor } from "./TemplateEditor";
import { formatDateES } from "@/utils/dateFormatter";

interface Template {
  id: string;
  name: string;
  gartner_role: string;
  email_1_attachments: any;
  email_2_attachments: any;
  email_3_attachments: any;
  email_4_attachments: any;
  email_5_attachments: any;
  created_at: string;
}

export function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("campaign_templates").select("*").order("created_at", { ascending: false });
    setTemplates((data || []) as any);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;

    const { error } = await supabase.from("campaign_templates").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar la plantilla", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Plantilla eliminada" });
      fetchTemplates();
    }
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  const exportTemplateToXML = (template: Template) => {
  // Crear estructura XML
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<campaign_template>
  <metadata>
    <name>${escapeXML(template.name)}</name>
    <gartner_role>${escapeXML(template.gartner_role)}</gartner_role>
    <created_at>${template.created_at}</created_at>
  </metadata>
  ${[1, 2, 3, 4, 5].map(i => {
    const subjectKey = `email_${i}_subject` as keyof Template;
    const htmlKey = `email_${i}_html` as keyof Template;
    const attachmentsKey = `email_${i}_attachments` as keyof Template;
    
    return `<email_${i}>
    <subject>${escapeXML(String((template as any)[subjectKey] || ''))}</subject>
    <html><![CDATA[${(template as any)[htmlKey] || ''}]]></html>
    <attachments>${JSON.stringify((template as any)[attachmentsKey] || [])}</attachments>
  </email_${i}>`;
  }).join('\n  ')}
</campaign_template>`;

  // Crear y descargar archivo
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.name.replace(/[^a-z0-9]/gi, '_')}_template.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast({ title: "Éxito", description: "Plantilla exportada correctamente" });
};

const importTemplateFromXML = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // Verificar si hay errores de parseo
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('El archivo XML no es válido');
    }

    // Extraer datos del XML
    let name = xmlDoc.querySelector('metadata > name')?.textContent || '';
    const gartner_role = xmlDoc.querySelector('metadata > gartner_role')?.textContent || '';

    // Verificar si ya existe una plantilla con el mismo nombre y rol
    const { data: existingTemplates } = await supabase
      .from('campaign_templates')
      .select('name')
      .eq('gartner_role', gartner_role)
      .ilike('name', `${name}%`);

    // Si existe, agregar sufijo numérico
    if (existingTemplates && existingTemplates.length > 0) {
      const existingNames = existingTemplates.map(t => t.name);
      let counter = 1;
      let newName = `${name} (${counter})`;
      
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${name} (${counter})`;
      }
      
      name = newName;
      
      toast({ 
        title: "Nombre modificado", 
        description: `Ya existía una plantilla con ese nombre. Se importará como "${name}"`,
        duration: 5000
      });
    }

    const templateData: any = {
      name,
      gartner_role,
    };

    // Extraer emails
    for (let i = 1; i <= 5; i++) {
      const emailNode = xmlDoc.querySelector(`email_${i}`);
      if (emailNode) {
        templateData[`email_${i}_subject`] = emailNode.querySelector('subject')?.textContent || '';
        templateData[`email_${i}_html`] = emailNode.querySelector('html')?.textContent || '';
        
        const attachmentsText = emailNode.querySelector('attachments')?.textContent || '[]';
        try {
          templateData[`email_${i}_attachments`] = JSON.parse(attachmentsText);
        } catch {
          templateData[`email_${i}_attachments`] = [];
        }
      }
    }

    // Insertar en la base de datos
    const { error } = await supabase
      .from('campaign_templates')
      .insert([templateData]);

    if (error) throw error;

    toast({ title: "Éxito", description: "Plantilla importada correctamente" });
    fetchTemplates();
  } catch (error) {
    console.error('Error importando plantilla:', error);
    toast({ 
      title: "Error", 
      description: `No se pudo importar la plantilla: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
      variant: "destructive" 
    });
  }

  // Limpiar input
  event.target.value = '';
};

// Función auxiliar para escapar caracteres especiales en XML
const escapeXML = (str: string) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

  return (
    <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Plantillas de Campaña</CardTitle>
      <div className="flex gap-2">
        <Button onClick={() => { setEditingTemplate(null); setShowEditor(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
        
        {/* Botón Importar XML */}
        <Button variant="outline" onClick={() => document.getElementById('import-xml-input')?.click()}>
          <Plus className="h-4 w-4 mr-2" />
          Importar plantilla en XML
        </Button>
        <input
          id="import-xml-input"
          type="file"
          accept=".xml"
          onChange={importTemplateFromXML}
          className="hidden"
        />
      </div>
    </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Rol campaña</TableHead>
              <TableHead className="text-center">Nombre</TableHead>
              <TableHead className="text-center">Adjuntos</TableHead>
              <TableHead className="text-center">Fecha Creación</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-center">
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="p-1">{template.gartner_role}</TableCell>
                <TableCell className="p-1 font-medium">{template.name}</TableCell>
                <TableCell className="p-1">
                    {[1, 2, 3, 4, 5].map(i => {
                      const attachments = (template as any)[`email_${i}_attachments`];
                      return attachments?.length > 0 ? (
                        <div key={i} className="text-xs mb-1">
                          <span className="font-semibold">Email {i}:</span>
                          <span className="flex items-center text-muted-foreground justify-center">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {attachments.length} archivo(s)
                          </span>
                        </div>
                      ) : null;
                    })}
                  </TableCell>
                <TableCell className="p-1">{formatDateES(template.created_at)}</TableCell> 
                <TableCell className="p-1">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(template.id);
                        setShowEditor(true);
                      }}
                      title="Editar plantilla"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportTemplateToXML(template)}
                      title="Exportar a XML"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Editar Plantilla" : "Nueva Plantilla"}</DialogTitle>
            </DialogHeader>
            <TemplateEditor templateId={editingTemplate} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
