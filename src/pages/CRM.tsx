const downloadTemplate = () => {
  // Crear template CSV
  const templateData = [
    ['Organización', 'Nombre', 'Apellido', 'email', 'Tier', 'Teléfono', 'Rol tipo de Campañas', 'Rol en su organización', 'Tipo de Contacto', 'Contactado', 'Interesado en Gartner', 'Enviar Webinars', 'Rol para webinars', 'Notas'],
    ['Mi Empresa', 'Juan', 'Pérez', 'juan@email.com', 'Tier 1','+34 666 777 888', 'CIO', 'Director IT', 'Campaña1', 'false', 'true', 'true', 'CIO', 'Ejemplo de contacto'],
    ['Otra Empresa', 'María', 'García', 'maria@email.com', 'Tier 2', '', 'CISO', 'Head of Security', 'Campaña2', 'true', 'true', 'false', '', ''],
  ];

  // Convertir a CSV con comillas
  const csv = templateData
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Añadir BOM para asegurar codificación UTF-8
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

  // Crear enlace de descarga
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'contactos_template.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  };import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Download, X, Badge} from "lucide-react";
import { time } from "console";

interface Contact {
  id: string;
  organization: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  gartner_role: string;
  title: string;
  contact_type: string;
  contacted: boolean;
  last_contact_date: string | null;
  interested: boolean;
  webinars_subscribed: boolean;
  notes: string | null;
  webinar_role: string;
  pa_name: string;
  pa_email: string;
  pa_phone: string;
  linkedin_url: string | null;
  tier?: string | null;
}

const GARTNER_ROLES = ["CIO", "CISO", "CDAO", "CAIO", "CTO", "Infrastructure & Operations", "D.Transformación", "CInO", "Procurement", "Enterprise Architect"];
const TIPO_CLIENTE = ["Cliente","Cliente proxy", "Oportunidad", "Prospect"];
const WEBINARS_ROLES = ["CIO", "CISO", "CDAO", "CAIO", "Infrastructure & Operations", "Talent", "Workplace", "Procurement", "Enterprise Architect"];



const CRM = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [campaignTypes, setCampaignTypes] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [isViewingOnly, setIsViewingOnly] = useState(false);
  const [filters, setFilters] = useState({
  organization: "",
  name: "",
  email: "",
  role: "",
  title: "",
  contact_type: "",
  contacted: "todos",
  interested: "todos",
  webinars: "todos",
  webinar_role: "",
  pa_name: "",
  pa_email: "",
  pa_phone: "",
  pa_filter: "todos",
  linkedin_url: "",
  tier: "",
});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    organization: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gartner_role: "",
    title: "",
    contact_type: "",
    contacted: false,
    last_contact_date: "",
    interested: false,
    webinars_subscribed: false,
    notes: "",
    webinar_role: "",
    pa_name: "",
    pa_email: "",
    pa_phone: "",
    linkedin_url: "",
    tier: "",
  });

  useEffect(() => {
    fetchContacts();
    fetchCampaignTypes();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los contactos", variant: "destructive" });
    } else {
      // Normalize fetched rows so they always include webinar_role (some rows may use 'webinars_role' or omit it)
      const normalized = (data || []).map((row: any) => ({
        ...row,
        webinar_role: row.webinar_role ?? row.webinar_role ?? ""
      }));
      setContacts(normalized);
    }
  };

  const fetchCampaignTypes = async () => {
    const { data } = await supabase.from("campaign_templates").select("name");
    setCampaignTypes(data?.map((t) => t.name) || []);
  };

const getFilteredContacts = () => {
  return contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    
    // Lógica del filtro PA - verificar si tiene algún valor en los campos PA
    const hasPA = (contact.pa_name && contact.pa_name.trim() !== "") || 
                  (contact.pa_email && contact.pa_email.trim() !== "") || 
                  (contact.pa_phone && contact.pa_phone.trim() !== "");
    
    const paFilterMatch = 
      filters.pa_filter === "todos" ||
      (filters.pa_filter === "con_valor" && hasPA) ||
      (filters.pa_filter === "sin_valor" && !hasPA);
    
    return (
      contact.organization.toLowerCase().includes(filters.organization.toLowerCase()) &&
      fullName.includes(filters.name.toLowerCase()) &&
      contact.email.toLowerCase().includes(filters.email.toLowerCase()) &&
      contact.title.toLowerCase().includes(filters.title.toLowerCase()) &&
      (!filters.contact_type || filters.contact_type === "" || contact.contact_type === filters.contact_type) &&
      (!filters.tier || filters.tier === "" || contact.tier === filters.tier) &&
      (contact.webinar_role ?? "").toLowerCase().includes((filters.webinar_role ?? "").toLowerCase()) &&
      (filters.contacted === "todos" || 
        (filters.contacted === "true" && contact.contacted) ||
        (filters.contacted === "false" && !contact.contacted)) &&
      (filters.interested === "todos" || 
        (filters.interested === "true" && contact.interested) ||
        (filters.interested === "false" && !contact.interested)) &&
      (filters.webinars === "todos" || 
        (filters.webinars === "true" && contact.webinars_subscribed) ||
        (filters.webinars === "false" && !contact.webinars_subscribed)) &&
      paFilterMatch
    );
  });
};
const filteredContacts = getFilteredContacts();
const hasActiveFilters = Object.values(filters).some(v => v !== "");

const clearFilters = () => {
  setFilters({
    organization: "",
    name: "",
    email: "",
    role: "",
    title: "",
    contact_type: "",
    contacted: "todos",
    interested: "todos",
    webinars: "todos",
    webinar_role: "",
    pa_name: "",
    pa_email: "",
    pa_phone: "",
    pa_filter: "todos",
    linkedin_url: "",
    tier: "",
  });
};

//Función para ordenar contactos
const sortedContacts = [...filteredContacts].sort((a, b) => {
  if (!sortConfig) return 0;

  let aValue = a[sortConfig.key];
  let bValue = b[sortConfig.key];

  // Manejo especial para nombre completo
  if (sortConfig.key === "name") {
    aValue = `${a.first_name} ${a.last_name}`;
    bValue = `${b.first_name} ${b.last_name}`;
  }

  if (typeof aValue === "string" && typeof bValue === "string") {
    return sortConfig.direction === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  }

  if (typeof aValue === "boolean" && typeof bValue === "boolean") {
  return sortConfig.direction === "asc"
    ? Number(aValue) - Number(bValue)
    : Number(bValue) - Number(aValue);
}
  return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
});


const handleSort = (key: string) => {
  setSortConfig((prev) => {
    if (prev?.key === key) {
      console.log(prev.direction);
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    }
    return { key, direction: "asc" };
  });
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      organization: formData.organization,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || null,
      gartner_role: formData.gartner_role,
      title: formData.title,
      contact_type: formData.contact_type,
      contacted: formData.contacted,
      last_contact_date: formData.last_contact_date || null,
      interested: formData.interested,
      webinars_subscribed: formData.webinars_subscribed,
      notes: formData.notes || null,
      webinar_role: formData.webinar_role,
      pa_name: formData.pa_name,
      pa_email: formData.pa_email,
      pa_phone: formData.pa_phone,
      linkedin_url: formData.linkedin_url,
      tier: formData.tier || null,
    };

    if (editingContact) {
      const { error } = await supabase
        .from("contacts")
        .update(payload)
        .eq("id", editingContact.id);
      if (!formData.gartner_role) {
        toast({
          title: "Campo obligatorio",
          description: "Por favor selecciona un rol de campañas.",
          variant: "destructive",
        });
        return;
      } else {}
      if (!formData.contact_type) {
        toast({
          title: "Campo obligatorio",
          description: "Por favor selecciona un tipo de contacto.",
          variant: "destructive",
        });
        return;
      } else {}
      if (error) {
        toast({ 
          title: "Error al actualizar", 
          description: error.message || "Error desconocido", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Éxito", description: "Contacto actualizado correctamente" });
        setIsDialogOpen(false);
        fetchContacts();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("contacts")
        .insert([payload]);

      if (error) {
        toast({ 
          title: "Error al crear", 
          description: error.message || "Error desconocido", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Éxito", description: "Contacto creado correctamente" });
        setIsDialogOpen(false);
        fetchContacts();
        resetForm();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsImporting(true);

  try {
    // Leer el archivo como texto
    const text = await file.text();
    
    // Parsear CSV manualmente - detectar separador
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      toast({ title: "Error", description: "El archivo CSV está vacío o no tiene datos", variant: "destructive" });
      setIsImporting(false);
      e.target.value = "";
      return;
    }

    // Detectar si usa , o ; como separador
    let separator = ',';
    if (lines[0].includes(';') && !lines[0].includes(',')) {
      separator = ';';
    }
    console.log('Separador detectado:', separator);

    // Obtener encabezados
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('Headers:', headers);

    // Parsear filas - remover comillas
    const jsonData = lines.slice(1).map((line, lineIndex) => {
      const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      if (lineIndex === 0) {
        console.log('Primera fila (debug):', row);
      }
      return row;
    });

    console.log('Datos del CSV:', jsonData);
    console.log('Primera fila completa:', jsonData[0]);
    console.log('Campo email de primera fila:', jsonData[0]?.email);

    console.log('INICIO: jsonData', jsonData.length, 'registros');
    
    const contactsToInsert = jsonData.map((row: any, idx: number) => {
      // Log para debug - SOLO en la primera fila
      if (idx === 0) {
        console.log('=== PRIMERA FILA PARSEADA ===');
        console.log('Organización:', row.Organización);
        console.log('Nombre:', row.Nombre);
        console.log('Apellido:', row.Apellido);
        console.log('Contactado RAW:', row.Contactado);
        console.log('Rol Campañas:', row["Rol tipo de Campañas"]);
        console.log('Cargo:', row["Rol en su organización"]);
        console.log('Email:', row.email);
        console.log('Tier:', row.tier);
        console.log('Tipo:', row["Tipo de Contacto"]);
        console.log('Interesado RAW:', row["Interesado en Gartner"]);
        console.log('Enviar Webinars RAW:', row["Enviar Webinars"]);
        console.log('Rol webinars:', row["Rol para webinars"]);
      }
      
      // Concatenar nombre y apellidos
      const nombreCompleto = `${String(row.Nombre || "").trim()} ${String(row.Apellidos || "").trim()}`.trim();
      
      // Convertir booleanos - manejar TRUE/FALSE en mayúsculas
      const contactadoBool = String(row.Contactado || "false").toUpperCase() === "TRUE";
      const interesadoBool = String(row["Interesado en Gartner"] || "false").toUpperCase() === "TRUE";
      const webinarsBool = String(row["Enviar Webinars"] || "false").toUpperCase() === "TRUE";
      
      if (idx === 0) {
        console.log('=== BOOLEANOS PROCESADOS ===');
        console.log('Contactado:', contactadoBool);
        console.log('Interesado en Gartner:', interesadoBool);
        console.log('Webinars:', webinarsBool);
        console.log('Nombre completo:', nombreCompleto);
      }
      
      return {
        organization: String(row.Organización || row.organization || "").trim(),
        first_name: String(row.Nombre || "").trim(),
        last_name: String(row.Apellido || "").trim(),
        email: String(row.email || row.Email || "").trim(),
        tier: String(row.tier || row.Tier || "").trim(),
        phone: String(row.Telefono || row.phone || "").trim() || null,
        gartner_role: String(row["Rol tipo de Campañas"] || row.gartner_role || "").trim(),
        title: String(row["Rol en su organización"] || row.title || "").trim(),
        contact_type: String(row["Tipo de Contacto"] || row.contact_type || "").trim(),
        contacted: contactadoBool,
        last_contact_date: null,
        interested: interesadoBool,
        webinars_subscribed: webinarsBool,
        notes: String(row.Notas || row.notes || "").trim() || null,
        webinar_role: String(row["Rol para webinars"] || row.webinar_role || "").trim(),
      };
    });
    
    console.log('FIN: contactsToInsert procesados');

    console.log('Contactos a insertar:', contactsToInsert);

    // Validar que al menos haya email
    const validContacts = contactsToInsert.filter(c => {
      const isValid = c.email && c.email.length > 0 && c.email.includes('@');
      console.log('Email:', c.email, '- Válido:', isValid);
      return isValid;
    });
    
    console.log('Contactos válidos:', validContacts.length, 'Total:', contactsToInsert.length);
    
    if (validContacts.length === 0) {
      toast({ title: "Error", description: "No hay contactos con email válido", variant: "destructive" });
      setIsImporting(false);
      e.target.value = "";
      return;
    }

    const { error } = await supabase
      .from("contacts")
      .insert(validContacts);

    if (error) {
      console.error('Error de inserción (primer intento):', error);
      
      if (error.code === '23505') {
        console.log('Detectado error de duplicado, insertando uno por uno...');
        toast({ 
          title: "Algunos contactos ya existen", 
          description: "Insertando solo contactos nuevos...", 
        });
        
        let importedCount = 0;
        let skippedCount = 0;
        
        for (const contact of validContacts) {
          const { error: insertError } = await supabase
            .from("contacts")
            .insert([contact]);
          
          if (insertError && insertError.code === '23505') {
            skippedCount++;
            console.log('Duplicado ignorado:', contact.email);
          } else if (!insertError) {
            importedCount++;
            console.log('Contacto importado:', contact.email);
          } else {
            console.error('Error inesperado:', insertError);
          }
        }
        
        console.log('Importación completada:', {importedCount, skippedCount});
        toast({ 
          title: "Importación completada", 
          description: `${importedCount} contactos importados, ${skippedCount} ignorados por duplicados` 
        });
        setIsImportDialogOpen(false);
        fetchContacts();
      } else {
        toast({ 
          title: "Error al importar", 
          description: error.message || "Error desconocido", 
          variant: "destructive" 
        });
      }
    } else {
      console.log('Todos los contactos insertados correctamente');
      toast({ 
        title: "Éxito", 
        description: `${validContacts.length} contactos importados correctamente` 
      });
      setIsImportDialogOpen(false);
      fetchContacts();
    }
  } catch (error) {
    console.error('Error leyendo archivo:', error);
    toast({ 
      title: "Error", 
      description: `Error al procesar el archivo: ${error instanceof Error ? error.message : "Desconocido"}`, 
      variant: "destructive" 
    });
  } finally {
    setIsImporting(false);
    e.target.value = "";
  }
};

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este contacto?")) return;

    const { error } = await supabase.from("contacts").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar el contacto", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Contacto eliminado" });
      fetchContacts();
    }
  };

  const resetForm = () => {
    setFormData({
      organization: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      gartner_role: "",
      title: "",
      contact_type: "",
      contacted: false,
      last_contact_date: "",
      interested: false,
      webinars_subscribed: false,
      notes: "",
      webinar_role: "",
      pa_name: "",
      pa_email: "",
      pa_phone: "",
      linkedin_url: "",
      tier: "",
    });
    setEditingContact(null);
  };

  const openEditDialog = (contact: Contact, viewOnly = false) => {
  setEditingContact(contact);
  setFormData({
    organization: contact.organization,
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone: contact.phone ?? "",
    gartner_role: contact.gartner_role,
    title: contact.title,
    contact_type: contact.contact_type,
    contacted: contact.contacted,
    last_contact_date: contact.last_contact_date ?? "",
    interested: contact.interested,
    webinars_subscribed: contact.webinars_subscribed,
    notes: contact.notes ?? "",
    webinar_role: contact.webinar_role ?? "",
    pa_name: contact.pa_name ?? "",
    pa_email: contact.pa_email ?? "",
    pa_phone: contact.pa_phone ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    tier: contact.tier || "",
  });
  setIsViewingOnly(viewOnly);
  setIsDialogOpen(true);
};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Contactos</h1>
          <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Importar Contactos desde CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Button onClick={downloadTemplate} variant="outline" className="w-full mb-4">
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Template CSV
                    </Button>
                  </div>
                  <div className="border-t pt-4">
                    <Label htmlFor="file-upload">O selecciona tu archivo CSV</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      disabled={isImporting}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Campos esperados:</strong></p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      <li>Organización</li>
                      <li>Nombre</li>
                      <li>Apellido</li>
                      <li>Email</li>
                      <li>Tier</li>
                      <li>Teléfono (opcional)</li>
                      <li>Rol tipo de campañas</li>
                      <li>Rol en su organización</li>
                      <li>Tipo de contacto</li>
                      <li>Contactado (true/false)</li>
                      <li>Interesado en Gartner (true/false)</li>
                      <li>Enviar Webinars (true/false)</li>
                      <li>Rol para Webinars </li>
                      <li>Notas</li>
                    </ul>
                  </div>
                  {isImporting && <p className="text-sm text-center">Importando contactos...</p>}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={!!viewingContact} onOpenChange={() => setViewingContact(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Información del Contacto</DialogTitle>
                  </DialogHeader>
                  {viewingContact && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>Organización</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.organization}</p>
                      </div>
                      <div>
                        <Label>Nombre</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.first_name}</p>
                      </div>
                      <div>
                        <Label>Apellidos</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.last_name}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.email}</p>
                      </div>
                      <div>
                        <Label>Tier</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.tier}</p>
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.phone ?? "—"}</p>
                      </div>
                      <div>
                        <Label>Rol tipo de campañas</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.gartner_role}</p>
                      </div>
                      <div>
                        <Label>Rol en su organización</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.title}</p>
                      </div>
                      <div>
                        <Label>Tipo de contacto</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.contact_type}</p>
                      </div>                  
                      <div>
                        <Label>Último contacto</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.last_contact_date ?? "—"}</p>
                      </div>
                      <div>
                        <Label>Contactado</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.contacted ? "Sí" : "No"}</p>
                      </div>
                      <div>
                        <Label>Interesado en Gartner</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.interested ? "Sí" : "No"}</p>
                      </div>
                      <div>
                        <Label>Enviar Webinars</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.webinars_subscribed ? "Sí" : "No"}</p>
                      </div>
                      <div>
                        <Label>Rol para Webinars</Label>
                        <p className="border rounded px-3 py-2">{viewingContact.webinar_role}</p>
                      </div>
                      <div className="col-span-2">
                        <Label>Notas</Label>
                        <p className="border rounded px-3 py-2 whitespace-pre-wrap">{viewingContact.notes ?? "—"}</p>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Contacto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingContact
                      ? isViewingOnly
                        ? "Información del Contacto"
                        : "Editar Contacto"
                      : "Nuevo Contacto"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organization">Organización</Label>
                      <Input
                        id="organization"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        required
                        disabled={isViewingOnly}
                        className={!formData.organization ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}
                      />
                    </div>
                    <div>
                      <Label htmlFor="first_name">Nombre</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                        disabled={isViewingOnly}
                        className={!formData.first_name ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Apellidos</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                        disabled={isViewingOnly}
                        className={!formData.last_name ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}
                        
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={isViewingOnly}
                        className={!formData.email ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}
                      />
                    </div>
                    <div>
                      <Label>Tier</Label>
                      <Select 
                        value={formData.tier} 
                        onValueChange={(value) => setFormData({ ...formData, tier: value })}
                        disabled={isViewingOnly}
                      >
                        <SelectTrigger className="disabled:opacity-80 disabled:text-foreground">
                          <SelectValue placeholder="Seleccionar tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Tier 1</SelectItem>
                          <SelectItem value="2">Tier 2</SelectItem>
                          <SelectItem value="3">Tier 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gartner_role">Rol tipo de campañas</Label>
                      <Select disabled={isViewingOnly} value={formData.gartner_role} onValueChange={(value) => setFormData({ ...formData, gartner_role: value })}>
                        <SelectTrigger className={!formData.gartner_role ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}>
                          <SelectValue placeholder="Seleccionar rol" />
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
                    <div>
                      <Label htmlFor="title">Rol en su organización</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className={!formData.title ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}
                        disabled={isViewingOnly}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_type">Tipo de contacto</Label>
                      <Select disabled={isViewingOnly} value={formData.contact_type} onValueChange={(value) => setFormData({ ...formData, contact_type: value })}>
                        <SelectTrigger className={!formData.contact_type ? "border-red-500" : "disabled:opacity-80 disabled:text-foreground"}>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_CLIENTE.map((contact_type) => (
                            <SelectItem key={contact_type} value={contact_type}>
                              {contact_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="last_contact_date">Último Contacto</Label>
                      <Input
                        id="last_contact_date"
                        type="date"
                        value={formData.last_contact_date}
                        onChange={(e) => setFormData({ ...formData, last_contact_date: e.target.value })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pa_name">Nombre PA</Label>
                      <Input
                        id="pa_name"
                        value={formData.pa_name}
                        onChange={(e) => setFormData({ ...formData, pa_name: e.target.value })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                    </div>
                                        <div>
                      <Label htmlFor="pa_email">Email PA</Label>
                      <Input
                        id="pa_email"
                        value={formData.pa_email}
                        onChange={(e) => setFormData({ ...formData, pa_email: e.target.value })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                    </div>
                                        <div>
                      <Label htmlFor="pa_phone">Teléfono PA</Label>
                      <Input
                        id="pa_phone"
                        value={formData.pa_phone}
                        onChange={(e) => setFormData({ ...formData, pa_phone: e.target.value })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                    </div>  
                      <div>
                        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                        <Input
                          id="linkedin_url"
                          type="url"
                          value={formData.linkedin_url}
                          onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                          disabled={isViewingOnly}
                          className="disabled:opacity-80 disabled:text-foreground"
                        />
                      </div>  
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="contacted"
                        checked={formData.contacted}
                        onCheckedChange={(checked) => setFormData({ ...formData, contacted: checked as boolean })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                      <Label htmlFor="contacted">Contactado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="interested"
                        checked={formData.interested}
                        onCheckedChange={(checked) => setFormData({ ...formData, interested: checked as boolean })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                      <Label htmlFor="interested">Interesado en Gartner</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="webinars_subscribed"
                        checked={formData.webinars_subscribed}
                        onCheckedChange={(checked) => setFormData({ ...formData, webinars_subscribed: checked as boolean })}
                        disabled={isViewingOnly}
                        className="disabled:opacity-80 disabled:text-foreground"
                      />
                      <Label htmlFor="webinars_subscribed">Enviar Webinars</Label>
                    </div>
                    </div>
                  <div>
                    <Label htmlFor="webinar_role">Rol para webinars</Label>
                    <Select 
                      value={formData.webinar_role}
                      onValueChange={(value) => setFormData({ ...formData, webinar_role: value })}
                      disabled={!formData.webinars_subscribed || isViewingOnly} // ← desactiva el Select si no está marcado 
                    >
                      <SelectTrigger className="disabled:opacity-80 disabled:text-foreground">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {WEBINARS_ROLES.map((webinar_role) => (
                          <SelectItem key={webinar_role} value={webinar_role}>
                            {webinar_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      disabled={isViewingOnly}
                      className="disabled:opacity-80 disabled:text-foreground"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    {isViewingOnly ? (
                      <Button
                        type="button"
                        onClick={() => setIsViewingOnly(false)}
                        variant="default"
                      >
                        Editar
                      </Button>
                    ) : (
                      <>
                        {editingContact && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              handleDelete(editingContact.id);
                              setIsDialogOpen(false);
                            }}
                            className="mr-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">{editingContact ? "Actualizar" : "Crear"}</Button>
                      </>
                    )}
                  </div>
                  
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          {hasActiveFilters && (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Mostrando <strong>{filteredContacts.length}</strong> de <strong>{contacts.length}</strong> contactos
          </span>
        </div>


        <div className="bg-card rounded-lg shadow overflow-hidden overflow-x-auto">
          <Table className="w-full table-fixed">
              <colgroup>
                <col className="w-[100px]" />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[50px]" />
              </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("organization")}>Organización</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("name")}>Nombre</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("tier")}>Tier</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("title")}>Cargo</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("PA")}>PA</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("contact_type")}>Tipo de contacto</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("contacted")}>Contactado</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("interested")}>Interesado</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort("webinars_subscribed")}>Webinars</TableHead>
              </TableRow>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="p-2">
                  <Input
                    placeholder="Filtrar..."
                    value={filters.organization}
                    onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                    className="h-8"
                  />
                </TableHead>
                <TableHead className="p-2">
                  <Input
                    placeholder="Filtrar..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    className="h-8"
                  />
                </TableHead>
                <TableHead className="p-2">
                  <Select 
                    value={filters.tier || "todos"} 
                    onValueChange={(value) => setFilters({ ...filters, tier: value === "todos" ? "" : value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="1">Tier 1</SelectItem>
                      <SelectItem value="2">Tier 2</SelectItem>
                      <SelectItem value="3">Tier 3</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="p-2">
                  <Input
                    placeholder="Filtrar..."
                    value={filters.title}
                    onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                    className="h-8"
                  />
                </TableHead>
                  <TableHead className="p-2">
                    <Select value={filters.pa_filter} onValueChange={(value) => setFilters({ ...filters, pa_filter: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="con_valor">PA</SelectItem>
                        <SelectItem value="sin_valor">No PA</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="p-2">
                    <Select 
                      value={filters.contact_type || "todos"} 
                      onValueChange={(value) => setFilters({ ...filters, contact_type: value === "todos" ? "" : value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Cliente proxy">Cliente proxy</SelectItem>
                        <SelectItem value="Oportunidad">Oportunidad</SelectItem>
                        <SelectItem value="Prospect">Prospect</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                <TableHead className="p-2">
                  <Select value={filters.contacted} onValueChange={(value) => setFilters({ ...filters, contacted: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">All</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="p-2">
                  <Select value={filters.interested} onValueChange={(value) => setFilters({ ...filters, interested: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">All</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="p-2">
                  <Select value={filters.webinars} onValueChange={(value) => setFilters({ ...filters, webinars: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">All</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="p-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-8 text-center text-muted-foreground">
                    No se encontraron contactos que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : sortedContacts.map((contact) => (
                <TableRow key={contact.id} className="text-sm leading-tight text-center align-middle">
                  <TableCell className="p-1">{contact.organization}</TableCell>
                  <TableCell className="p-1 text-left">
                    <button
                      className="text-primary hover:underline cursor-pointer text-left w-full break-words"
                      onClick={() => openEditDialog(contact, true)}>
                      <div className="flex gap-2">
                        <span>{contact.first_name} {contact.last_name}</span>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="flex justify-center">
                      {contact.tier ? (
                        <span 
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            contact.tier === "1" ? "bg-yellow-500 text-white" :
                            contact.tier === "2" ? "bg-blue-500 text-white" :
                            "bg-gray-500 text-white"
                          }`}
                        >
                          {contact.tier}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-1">{contact.title}</TableCell>
                  <TableCell className="p-1 w-40">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium">{contact.pa_name || '-'}</span>
                      <span className="text-xs text-muted-foreground">{contact.pa_phone || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1 w-40">
                    <span
                      className={`rounded text-xs font-medium ${contact.contact_type === "Cliente" ? "px-7 py-2.5 bg-green-500/20 text-green-700" : contact.contact_type === "Oportunidad" ? "px-3 py-2.5 bg-blue-500/20 text-b lue-700" : contact.contact_type === "Cliente proxy" ? "px-3 py-2.5 bg-green-500/20 text-green-700" :contact.contact_type === "Prospect" ? "px-6 py-2.5 bg-yellow-300/20 text-yellow-700" : "px-2 py-2.5 bg-muted text-muted-foreground"}`}>
                      {contact.contact_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`w-24 leading-tight rounded text-xs ${contact.contacted ? "px-7 py-2.5 bg-green-500/20" : "px-6 py-2.5 bg-red-500/20"}`}>
                      {contact.contacted ? "Sí" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`w-24 leading-tight rounded text-xs ${contact.interested ? "px-7 py-2.5 bg-green-500/20" : "px-6 py-2.5 bg-red-500/20"}`}>
                      {contact.interested ? "Sí" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`w-24 leading-tight rounded text-xs ${contact.webinars_subscribed ? "px-7 py-2.5 bg-green-500/20" : "px-6 py-2.5 bg-muted text-muted-foreground"}`}>
                      {contact.webinars_subscribed ? "Sí" : "No"}
                    </span>
                  </TableCell>
                  <TableCell className="p-0 text-center">
                      {contact.linkedin_url ? (
                        <a 
                          href={contact.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 w-full h-full py-2"
                          title="Ver LinkedIn"
                        >
                          <svg 
                            className="h-5 w-5" 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CRM;