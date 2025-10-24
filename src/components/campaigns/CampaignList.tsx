import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatDateES } from "@/utils/dateFormatter";
import { Plus, Trash2, Send, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Campaign {
  id: string;
  contact_id: string;
  template_id: string | null;
  start_campaign: boolean;
  email_1_date: string | null;
  email_2_date: string | null;
  email_3_date: string | null;
  email_4_date: string | null;
  email_5_date: string | null;
  status: string;
  emails_sent: number;
  has_replied: boolean;
  last_reply_date: string | null;
  response_text: string | null;
  email_incorrect?: boolean;
  contacts: {
    first_name: string;
    last_name: string;
    email: string;
    organization: string;
    gartner_role: string;
    title: string;
  };
  campaign_templates?: {
    name: string;
  };
}

export const CampaignList = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingReplies, setCheckingReplies] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  const [repliedContact, setRepliedContact] = useState<{
    name: string;
    email: string;
    replyDate: string;
    responseText?: string; 
  } | null>(null);

  const [selectedResponse, setSelectedResponse] = useState<{
    name: string;
    email: string;
    organization: string;
    replyDate: string;
    responseText: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    organization: "",
    contact_id: "",
    template_id: "",
    start_campaign: false,
    email_1_date: "",
    email_2_date: "",
    email_3_date: "",
    email_4_date: "",
    email_5_date: "",
  });

  // Estados para campañas masivas
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    gartner_role: "",
    template_id: "",
    selected_contacts: [] as string[],
    start_campaign: false,
    email_1_date: "",
    email_2_date: "",
    email_3_date: "",
    email_4_date: "",
    email_5_date: "",
  });
  const [bulkFilteredTemplates, setBulkFilteredTemplates] = useState<any[]>([]);
  const [bulkFilteredContacts, setBulkFilteredContacts] = useState<any[]>([]);

  const { toast } = useToast();
  // TIPOS DE CONTACTO PERMITIDOS PARA CAMPAÑAS
  const ALLOWED_CONTACT_TYPES = ['Prospect', 'Oportunidad'];
  
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a  // ← AÑADIDO <a>
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  useEffect(() => {
    initData();
  }, []);

 useEffect(() => {
  if (campaigns.length > 0 && !loading && !isSending) {
    console.log('INICIANDO AUTO-ENVÍO');
    autoSendDailyEmails();

    // Verificar si se debe ejecutar la comprobación automática
    const lastCheck = localStorage.getItem('last_email_check');
    const now = new Date().getTime();
    const oneDay = 1 * 60 * 60 * 1000; // 1 horas en milisegundos

    if (!lastCheck || (now - parseInt(lastCheck)) > oneDay) {
      console.log('INICIANDO VERIFICACIÓN DE RESPUESTAS (Automática diaria)');
      checkAllReplies();
      localStorage.setItem('last_email_check', now.toString());
    } else {
      const hoursLeft = Math.ceil((oneDay - (now - parseInt(lastCheck))) / (1000 * 60 * 60));
      console.log(`⏰ Próxima verificación automática en ${hoursLeft} horas`);
    }
  }
}, [campaigns.length, loading]);

/**
 * Calcula el estado de una campaña
 */
const getCampaignStatus = (campaign: Campaign): { 
  status: string; 
  variant: "default" | "secondary" | "destructive" | "outline" 
  } => {

  // PRIORIDAD 1: Si el email es incorrecto
  if (campaign.email_incorrect) {
    return { status: "Email incorrecto", variant: "destructive" };
  }
  // PRIORIDAD 2: Si ha respondido, siempre mostrar "Respondido" 
  if (campaign.has_replied) {
    return { status: "Respondido", variant: "default" };
  }
  
  // PRIORIDAD 3: Si todos los emails fueron enviados y no hay respuesta
  if (campaign.emails_sent >= 5) {
    return { status: "Completada sin respuesta", variant: "secondary" };
  }
  
  // PRIORIDAD 4: Si la campaña está activa y tiene fechas
  if (campaign.start_campaign && campaign.email_1_date) {
    return { status: "En curso", variant: "outline" };
  }
  
  // PRIORIDAD 5: Si no está iniciada o fue desactivada manualmente
  return { status: "Pendiente", variant: "outline" };
};

const openEditDialog = (campaign: Campaign) => {
  setEditingCampaign(campaign);
  setFormData({
    organization: campaign.contacts.organization,
    contact_id: campaign.contact_id,
    template_id: campaign.template_id || "",
    start_campaign: campaign.start_campaign,
    email_1_date: campaign.email_1_date || "",
    email_2_date: campaign.email_2_date || "",
    email_3_date: campaign.email_3_date || "",
    email_4_date: campaign.email_4_date || "",
    email_5_date: campaign.email_5_date || "",
  });
  
  // FILTRAR SOLO CONTACTOS PERMITIDOS
const filtered = contacts.filter(c => 
  c.organization === campaign.contacts.organization &&
  ALLOWED_CONTACT_TYPES.includes(c.contact_type)
);
setFilteredContacts(filtered);
  
  const available = templates.filter(t => t.gartner_role === campaign.contacts.gartner_role);
  setFilteredTemplates(available);
  
  setIsDialogOpen(true);
};

const recalculateDatesFrom = (emailNumber: number, startDate: string) => {
  const dates: any = { ...formData };
  
  // Solo actualizar desde el email modificado hacia adelante
  for (let i = emailNumber; i <= 5; i++) {
    if (i === emailNumber) {
      dates[`email_${i}_date`] = startDate;
    } else {
      const previousDate = new Date(dates[`email_${i-1}_date`]);
      if (dates[`email_${i-1}_date`]) { // Solo si la fecha anterior existe
        previousDate.setDate(previousDate.getDate() + 3);
        dates[`email_${i}_date`] = previousDate.toISOString().split("T")[0];
      }
    }
  }
  
  setFormData(dates);
};

const handleDateChange = (emailNumber: number, newDate: string) => {
  if (!newDate) {
    // Si se borra la fecha, solo actualizar ese campo
    setFormData({ ...formData, [`email_${emailNumber}_date`]: newDate });
    return;
  }
  
  // Recalcular fechas siguientes automáticamente
  recalculateDatesFrom(emailNumber, newDate);
};

const autoSendDailyEmails = async () => {
  if (isSending) {
    console.log('Ya hay un envío en curso, saltando...');
    return;
  }

  try {
    setIsSending(true);
    console.log('Verificando emails para enviar...');
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
    
    for (const campaign of campaigns) {
      if (!campaign.start_campaign) continue;

      for (let i = 1; i <= 5; i++) {
        const dateField = `email_${i}_date` as keyof Campaign;
        const emailDate = campaign[dateField];
        const emailDateOnly = emailDate ? String(emailDate).split('T')[0] : null;
        
        if (emailDateOnly && emailDateOnly <= localDate && campaign.emails_sent < i) {
          console.log(`Auto-enviando email ${i} para campaña ${campaign.id}`);
          console.log(`Emails enviados antes: ${campaign.emails_sent}`);
          await sendEmail(campaign, i);
          break; // Solo enviar un email por campaña
        }
      }
    }
  } catch (e) {
    console.log('Auto send completed with error:', e);
  } finally {
    setIsSending(false);
  }
};

const checkAllReplies = async () => {
  setCheckingReplies(true);
  try {
    console.log('🔍 Paso 1: Leyendo emails de Outlook desde backend...');

    // LLAMADA AL BACKEND - Leer inbox de Outlook
    const response = await fetch('http://localhost:3001/api/outlook/inbox?days=30');
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    const emails = data.emails || [];
    
    console.log(`✅ Paso 1 completado: ${emails.length} emails obtenidos del backend`);

    if (emails.length === 0) {
      toast({
        title: "Info",
        description: "No se encontraron emails en el inbox de Outlook",
      });
      return;
    }

    // LOG DETALLADO: Mostrar todos los asuntos para verificar emails de error
    console.log('\n📋 TODOS LOS ASUNTOS DE EMAILS:');
    emails.forEach((email, i) => {
      

      
      if (email.Subject) {
        const subject = email.Subject.toLowerCase();
        const isError = subject.includes('undeliverable') ||
                       subject.includes('delivery status notification') ||
                       subject.includes('mail delivery failed') ||
                       subject.includes('returned mail') ||
                       subject.includes('delivery failure');
        
        if (isError) {
          console.log(`  ⚠️ ${i + 1}. [ERROR EMAIL] ${email.Subject}`);
        }
      }
    });

    console.log('\n🔍 Paso 2: Procesando campañas y buscando matches...');

    // PROCESAMIENTO EN EL FRONTEND
    let repliedCount = 0;
    let processedCount = 0;
    let incorrectEmailCount = 0;

    for (const campaign of campaigns) {
      const contactEmail = campaign.contacts.email.toLowerCase().trim();
      console.log(`\n▶️ Verificando: ${campaign.contacts.first_name} ${campaign.contacts.last_name}`);
      console.log(`   Email contacto: ${contactEmail}`);

      // ========== VERIFICAR EMAILS DE ERROR (BOUNCED) ==========
      console.log(`   🔍 Buscando emails de error...`);
      
      const errorEmails = emails.filter((email) => {
        if (!email || !email.Subject) return false;
        
        const subject = email.Subject.toLowerCase();
        
        // Detectar emails de error por asunto
        return (
          subject.includes('undeliverable') ||
          subject.includes('delivery status notification') ||
          subject.includes('mail delivery failed') ||
          subject.includes('returned mail') ||
          subject.includes('delivery failure') ||
          subject.includes('mail delivery subsystem') ||
          subject.includes('failure notice')
        );
      });

      console.log(`   📧 Emails de error encontrados: ${errorEmails.length}`);

      let emailIncorrect = false;
      
      if (errorEmails.length > 0) {
        console.log(`   ⚠️ Analizando ${errorEmails.length} email(s) de error para buscar: ${contactEmail}`);
        
        // Buscar el email del contacto en el cuerpo de los emails de error
        for (const errorEmail of errorEmails) {
          console.log(`\n   📄 Analizando email de error:`);
          console.log(`      Asunto: ${errorEmail.Subject}`);
          console.log(`      Fecha: ${errorEmail.ReceivedTime}`);
          
          const body = (errorEmail.Body || '').toLowerCase();
          
          console.log(`      Longitud del cuerpo: ${body.length} caracteres`);
          console.log(`      Primeros 200 caracteres del cuerpo: ${body.substring(0, 200)}`);
          
          // Extraer emails del cuerpo usando regex
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
          const foundEmails = body.match(emailRegex) || [];
          
          console.log(`      Emails encontrados en el cuerpo: ${foundEmails.length}`);
          foundEmails.forEach((email, idx) => {
            console.log(`        ${idx + 1}. ${email.toLowerCase()}`);
          });
          
          // Verificar si el email del contacto está en el cuerpo del error
          const cleanedFoundEmails = foundEmails.map(e => e.toLowerCase().trim());
          const isContactEmailInError = cleanedFoundEmails.includes(contactEmail);
          
          console.log(`      ¿Email del contacto (${contactEmail}) está en el error? ${isContactEmailInError}`);
          
          if (isContactEmailInError) {
            console.log(`   ❌❌❌ EMAIL INCORRECTO DETECTADO: ${contactEmail} ❌❌❌`);
            emailIncorrect = true;
            incorrectEmailCount++;
            break;
          }
        }
      } else {
        console.log(`   ✅ No hay emails de error para este contacto`);
      }

      // ========== VERIFICAR RESPUESTAS NORMALES ==========
      const replies = emails.filter((email) => {
        if (!email || !email.SenderEmail) return false;

        const senderEmail = (email.SenderEmail || '').toLowerCase().trim();
        const subject = (email.Subject || '').toLowerCase();
        
        // Filtrar emails de error
        if (subject.includes('undeliverable') || 
            subject.includes('delivery status notification') ||
            subject.includes('mail delivery failed') ||
            subject.includes('returned mail') ||
            subject.includes('delivery failure')) {
          return false;
        }
        
        if (senderEmail === 'unknown@domain.com' || senderEmail.length < 5) return false;

        // Extraer username y dominio para comparación
        const contactUsername = contactEmail.split('@')[0];
        const senderUsername = senderEmail.split('@')[0];
        const contactDomain = contactEmail.split('@')[1] || '';
        const senderDomain = senderEmail.split('@')[1] || '';

        // Comparaciones múltiples
        const isMatch = (
          senderEmail === contactEmail ||
          (contactUsername.length > 3 && senderUsername.includes(contactUsername)) ||
          (senderUsername.length > 3 && contactUsername.includes(senderUsername)) ||
          (contactDomain === senderDomain && 
           contactUsername.length > 3 && 
           senderUsername.includes(contactUsername))
        );

        if (isMatch) {
          console.log(`   ✅ Match encontrado: ${senderEmail} - ${email.Subject}`);
        }

        return isMatch;
      });

      const hasReplied = replies.length > 0;
      let lastReplyDate = null;
      let responseText = null;

      if (hasReplied) {
        const sortedReplies = replies.sort((a, b) => 
          new Date(a.ReceivedTime).getTime() - new Date(b.ReceivedTime).getTime()
        );

        const firstReply = sortedReplies[0];
        lastReplyDate = firstReply.ReceivedTime;
        if (firstReply.Body) {
          responseText = firstReply.Body
            .substring(0, 500)
            .trim();
          
          console.log(`   📝 Texto de respuesta capturado (${responseText.length} caracteres)`);
        }

        repliedCount++;
        console.log(`   📨 ${replies.length} respuesta(s) encontrada(s)`);
        console.log(`   📅 Última respuesta: ${lastReplyDate}`);
      } else {
        console.log(`   ⭕ Sin respuestas`);
      }

      // ========== ACTUALIZAR EN SUPABASE ==========
      console.log(`   💾 Actualizando Supabase...`);
      console.log(`   🔍 email_incorrect = ${emailIncorrect}`);
      
      const updateData: any = {
        has_replied: hasReplied,
        last_reply_date: lastReplyDate,
        response_text: responseText,
        email_incorrect: emailIncorrect
      };
      
      console.log(`   📦 updateData completo:`, JSON.stringify(updateData, null, 2));
      
      // Si el email es incorrecto o ha respondido, desactivar la campaña
      if (hasReplied || emailIncorrect) {
        updateData.start_campaign = false;
        
        if (emailIncorrect) {
          console.log(`   🛑 Desactivando campaña porque el email es incorrecto`);
          toast({
            title: "Email incorrecto detectado",
            description: `El email de ${campaign.contacts.first_name} ${campaign.contacts.last_name} (${contactEmail}) no es válido`,
            variant: "destructive"
          });
        } else {
          console.log(`   🛑 Desactivando campaña porque el contacto respondió`);
        }
        
        if (hasReplied && !campaign.has_replied) {
          setRepliedContact({
            name: `${campaign.contacts.first_name} ${campaign.contacts.last_name}`,
            email: campaign.contacts.email,
            replyDate: lastReplyDate || new Date().toISOString(),
            responseText: responseText || undefined
          });
        }
      }
      
      const { error: updateError } = await supabase
        .from("campaigns")
        .update(updateData)
        .eq("id", campaign.id);

      if (updateError) {
        console.error(`   ❌ Error actualizando: ${updateError.message}`);
      } else {
        processedCount++;
        console.log(`   ✅ Actualizado en Supabase correctamente`);
      }
    }

    console.log(`\n✅ Paso 2 completado!`);
    console.log(`📊 Resumen final:`);
    console.log(`   Total campañas: ${campaigns.length}`);
    console.log(`   Procesadas: ${processedCount}`);
    console.log(`   Con respuestas: ${repliedCount}`);
    console.log(`   Emails incorrectos: ${incorrectEmailCount}`);
    console.log(`   Sin respuestas: ${processedCount - repliedCount - incorrectEmailCount}`);

    // Recargar campañas para mostrar los cambios en la UI
    console.log('\n🔄 Paso 3: Recargando campañas...');
    await fetchCampaigns();
    console.log('✅ Campañas recargadas\n');

  } catch (error) {
    console.error('💥 Error en verificación de respuestas:', error);
    toast({
      title: "Error",
      description: `No se pudo verificar las respuestas: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      variant: "destructive"
    });
  } finally {
    setCheckingReplies(false);
  }
};

  const initData = async () => {
    await fetchCampaigns();
    await fetchContacts();
    await fetchTemplates();
    setLoading(false);
  };

  const fetchCampaigns = async () => {
  const { data } = await supabase
    .from("campaigns")
    .select("*, contacts(first_name, last_name, email, organization, gartner_role, title, contact_type), campaign_templates(name)")
    .order("created_at", { ascending: false });
  
  // FILTRAR CAMPAÑAS SOLO DE CONTACTOS PERMITIDOS
  const filteredCampaigns = (data || []).filter(campaign => 
    ALLOWED_CONTACT_TYPES.includes(campaign.contacts?.contact_type)
  );
  
  setCampaigns(filteredCampaigns as Campaign[]);
};

  const fetchContacts = async () => {
  // CARGAR SOLO CONTACTOS CON TIPOS PERMITIDOS
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .in('contact_type', ALLOWED_CONTACT_TYPES);
  setContacts(data || []);
};

  const fetchTemplates = async () => {
    const { data } = await supabase.from("campaign_templates").select("*");
    setTemplates(data || []);
  };

  const calculateDates = (startDate: string) => {
    const dates = [startDate];
    const start = new Date(startDate);
    for (let i = 1; i < 5; i++) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + i * 3);
      dates.push(nextDate.toISOString().split("T")[0]);
    }
    return dates;
  };

  const handleOrganizationChange = (organization: string) => {
  setFormData({ ...formData, organization, contact_id: "", template_id: "" });
  
  // FILTRAR SOLO CONTACTOS PERMITIDOS
  const filtered = contacts.filter(c => 
    c.organization === organization &&
    ALLOWED_CONTACT_TYPES.includes(c.contact_type)
  );
  setFilteredContacts(filtered);
  setFilteredTemplates([]);
};

const handleContactChange = (contactId: string) => {
  setFormData({ ...formData, contact_id: contactId, template_id: "" });
  const contact = contacts.find(c => c.id === contactId);
  if (contact) {
    // VALIDAR QUE EL CONTACTO TENGA UN TIPO PERMITIDO
    if (!ALLOWED_CONTACT_TYPES.includes(contact.contact_type)) {
      toast({
        title: "Contacto no permitido",
        description: "Solo se pueden crear campañas para contactos de tipo Prospect u Oportunidad",
        variant: "destructive",
      });
      setFormData({ ...formData, contact_id: "", template_id: "" });
      return;
    }
    
    const available = templates.filter(t => t.gartner_role === contact.gartner_role);
    setFilteredTemplates(available);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); 
  // VALIDACIÓN ADICIONAL: Verificar que el contacto tenga tipo permitido
const selectedContact = contacts.find(c => c.id === formData.contact_id);
if (!selectedContact || !ALLOWED_CONTACT_TYPES.includes(selectedContact.contact_type)) {
  toast({
    title: "Error de validación",
    description: "Solo se pueden crear campañas para contactos de tipo Prospect u Oportunidad",
    variant: "destructive",
  });
  return;
}
  // Si es nueva campaña y no hay fechas calculadas, calcularlas
  let dates = {
    email_1_date: formData.email_1_date,
    email_2_date: formData.email_2_date,
    email_3_date: formData.email_3_date,
    email_4_date: formData.email_4_date,
    email_5_date: formData.email_5_date,
  };
  
  // Si es nueva campaña, calcular fechas automáticamente
  if (!editingCampaign) {
    const calculatedDates = calculateDates(formData.email_1_date);
    dates = {
      email_1_date: calculatedDates[0],
      email_2_date: calculatedDates[1],
      email_3_date: calculatedDates[2],
      email_4_date: calculatedDates[3],
      email_5_date: calculatedDates[4],
    };
  }
  
  const payload = {
    contact_id: formData.contact_id,
    template_id: formData.template_id || null,
    start_campaign: formData.start_campaign,
    ...dates,
    status: formData.start_campaign ? 'active' : 'pending',
  };

  if (editingCampaign) {
    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", editingCampaign.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la campaña", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Campaña actualizada correctamente" });
      setIsDialogOpen(false);
      fetchCampaigns();
      resetForm();
    }
  } else {
    const { error } = await supabase.from("campaigns").insert([payload]);
    if (error) {
      toast({ title: "Error", description: "No se pudo crear la campaña", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Campaña creada" });
      setIsDialogOpen(false);
      fetchCampaigns();
      resetForm();
    }
  }
};

  const resetForm = () => {
  setFormData({ 
    organization: "", 
    contact_id: "", 
    template_id: "", 
    start_campaign: false, 
    email_1_date: "",
    email_2_date: "",
    email_3_date: "",
    email_4_date: "",
    email_5_date: "",
  });
  setFilteredContacts([]);
  setFilteredTemplates([]);
  setEditingCampaign(null);
};

  const getNextEmailNumber = (campaign: Campaign): number | null => {
    if (!campaign.email_1_date) return 1;
    if (!campaign.email_2_date) return 2;
    if (!campaign.email_3_date) return 3;
    if (!campaign.email_4_date) return 4;
    if (!campaign.email_5_date) return 5;
    return null;
  };

  
  const sendEmail = async (campaign: Campaign, emailNumber: number) => {
 try {
    if (campaign.emails_sent >= emailNumber) {
      toast({ title: "Info", description: `Email ${emailNumber} ya fue enviado`, variant: "default" });
      return;
    }

    // Obtener nombre del Account Manager
    const { data: amData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "account_manager")
      .maybeSingle();
    const accountManagerName = (amData?.value as any)?.name || '';

    // Obtener firma
    const { data: signatureData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "email_signature")
      .maybeSingle();
    let signature = '';
    if (signatureData?.value) {
      const value = signatureData.value as any;
      signature = value?.signature || "";
      signature = signature.trim();
      if (signature.startsWith('"') && signature.endsWith('"')) {
        signature = signature.slice(1, -1);
      }
      signature = signature.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\//g, '/');
    }

    // Obtener plantilla
    const { data: template } = await supabase
      .from('campaign_templates')
      .select(`email_${emailNumber}_subject, email_${emailNumber}_html, email_${emailNumber}_attachments`)
      .eq('id', campaign.template_id)
      .single();

    if (!template) throw new Error('Template not found');

    const currentYear = new Date().getFullYear().toString();

    let subject = template[`email_${emailNumber}_subject`];
    subject = subject.replace(/{{Nombre}}/g, campaign.contacts.first_name || '');
    subject = subject.replace(/{{ano}}/g, currentYear);

    let body = template[`email_${emailNumber}_html`];
    body = body.replace(/{{Nombre}}/g, campaign.contacts.first_name || '');
    body = body.replace(/{{nombreAE}}/g, accountManagerName);
    body = body.replace(/{{compania}}/g, campaign.contacts.organization || '');
    body = body.replace(/{{ano}}/g, currentYear);
    
    // Agregar firma al final
    if (signature) {
      body = body + '<br/><br/>' + signature;
    }

    // Obtener y procesar adjuntos
    const attachmentsFromTemplate = template[`email_${emailNumber}_attachments`] || [];
    console.log('📎 Attachments del template:', attachmentsFromTemplate);
    
    const processedAttachments = [];
    
    for (const attachment of attachmentsFromTemplate) {
      try {
        if (attachment.url) {
          console.log(`📥 Descargando adjunto: ${attachment.name} desde ${attachment.url}`);
          
          // Descargar el archivo
          const response = await fetch(attachment.url);
          if (!response.ok) {
            throw new Error(`Error descargando archivo: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          // Convertir a base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const result = reader.result as string;
              // Extraer solo la parte base64
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
          });
          
          processedAttachments.push({
            filename: attachment.name,
            content: base64
          });
          
          console.log(`✅ Archivo convertido a base64: ${attachment.name}, tamaño: ${base64.length}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando adjunto ${attachment.name}:`, error);
        toast({ 
          title: "Advertencia", 
          description: `No se pudo adjuntar ${attachment.name}`,
          variant: "destructive" 
        });
      }
    }

    console.log('📎 Adjuntos procesados:', processedAttachments.length);

    await fetch('http://localhost:3001/api/draft-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to: campaign.contacts.email,
        contactEmail: campaign.contacts.email,  // ← NUEVO: para buscar email anterior
        subject, 
        body,
        attachments: processedAttachments
      }),
    });

    await supabase.from("campaigns").update({ emails_sent: emailNumber }).eq("id", campaign.id);

    toast({ title: "Éxito", description: `Email ${emailNumber} enviado` });
    await fetchCampaigns();
  } catch (error) {
    console.error('❌ Error completo:', error);
    toast({ title: "Error", description: String(error), variant: "destructive" });
  }
};



const sendTodayEmails = async (campaign: Campaign) => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  
  console.log('=== DEBUG sendTodayEmails ===');
  console.log('Campaign:', campaign.id);
  console.log('Start campaign:', campaign.start_campaign);
  console.log('Emails sent:', campaign.emails_sent);
  console.log('Today:', localDate);
  
  for (let i = 1; i <= 5; i++) {
    const dateField = `email_${i}_date` as keyof Campaign;
    const emailDate = campaign[dateField];
    const emailDateOnly = emailDate ? String(emailDate).split('T')[0] : null;
    console.log(`Email ${i}: date=${emailDateOnly}, sent=${campaign.emails_sent >= i}, shouldSend=${emailDateOnly && emailDateOnly <= localDate && campaign.emails_sent < i}`);
    
    if (emailDateOnly && emailDateOnly <= localDate && campaign.emails_sent < i) {
      console.log(`✓ Enviando email ${i}`);
      await sendEmail(campaign, i);
      return;
    }
  }
  console.log('No hay emails para enviar hoy');
};
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    toast({ title: "Éxito", description: "Campaña eliminada" });
    fetchCampaigns();
    setIsDialogOpen(false);
  };
// Manejar cambio de rol en formulario masivo
const handleBulkRoleChange = (role: string) => {
  setBulkFormData({ 
    ...bulkFormData, 
    gartner_role: role,
    template_id: "",
    selected_contacts: []
  });
  
  // Filtrar plantillas por rol
  const availableTemplates = templates.filter(t => t.gartner_role === role);
  setBulkFilteredTemplates(availableTemplates);
  
  // Filtrar contactos por rol y tipo permitido
  const availableContacts = contacts.filter(c => 
    c.gartner_role === role &&
    ALLOWED_CONTACT_TYPES.includes(c.contact_type)
  );
  setBulkFilteredContacts(availableContacts);
};

// Manejar selección/deselección de contactos
const toggleContactSelection = (contactId: string) => {
  setBulkFormData(prev => ({
    ...prev,
    selected_contacts: prev.selected_contacts.includes(contactId)
      ? prev.selected_contacts.filter(id => id !== contactId)
      : [...prev.selected_contacts, contactId]
  }));
};

// Seleccionar todos los contactos
const selectAllContacts = () => {
  setBulkFormData(prev => ({
    ...prev,
    selected_contacts: bulkFilteredContacts.map(c => c.id)
  }));
};

// Deseleccionar todos los contactos
const deselectAllContacts = () => {
  setBulkFormData(prev => ({
    ...prev,
    selected_contacts: []
  }));
};

// Manejar cambio de fechas en formulario masivo
const handleBulkDateChange = (emailNumber: number, newDate: string) => {
  if (!newDate) {
    setBulkFormData({ ...bulkFormData, [`email_${emailNumber}_date`]: newDate });
    return;
  }
  
  const dates: any = { ...bulkFormData };
  for (let i = emailNumber; i <= 5; i++) {
    if (i === emailNumber) {
      dates[`email_${i}_date`] = newDate;
    } else {
      const previousDate = new Date(dates[`email_${i-1}_date`]);
      if (dates[`email_${i-1}_date`]) {
        previousDate.setDate(previousDate.getDate() + 3);
        dates[`email_${i}_date`] = previousDate.toISOString().split("T")[0];
      }
    }
  }
  setBulkFormData(dates);
};

// Crear campañas masivas
const handleBulkSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!bulkFormData.gartner_role || !bulkFormData.template_id || bulkFormData.selected_contacts.length === 0) {
    toast({
      title: "Error",
      description: "Por favor completa todos los campos y selecciona al menos un contacto",
      variant: "destructive",
    });
    return;
  }

  try {
    const campaignsToCreate = bulkFormData.selected_contacts.map(contactId => ({
      contact_id: contactId,
      template_id: bulkFormData.template_id,
      start_campaign: bulkFormData.start_campaign,
      email_1_date: bulkFormData.email_1_date || null,
      email_2_date: bulkFormData.email_2_date || null,
      email_3_date: bulkFormData.email_3_date || null,
      email_4_date: bulkFormData.email_4_date || null,
      email_5_date: bulkFormData.email_5_date || null,
      status: bulkFormData.start_campaign ? "activa" : "pendiente",
    }));

    const { error } = await supabase
      .from("campaigns")
      .insert(campaignsToCreate);

    if (error) throw error;

    toast({
      title: "Éxito",
      description: `${campaignsToCreate.length} campañas creadas correctamente`,
    });

    setIsBulkDialogOpen(false);
    resetBulkForm();
    fetchCampaigns();
  } catch (error) {
    console.error("Error creating bulk campaigns:", error);
    toast({
      title: "Error",
      description: "No se pudieron crear las campañas",
      variant: "destructive",
    });
  }
};

// Resetear formulario masivo
const resetBulkForm = () => {
  setBulkFormData({
    gartner_role: "",
    template_id: "",
    selected_contacts: [],
    start_campaign: false,
    email_1_date: "",
    email_2_date: "",
    email_3_date: "",
    email_4_date: "",
    email_5_date: "",
  });
  setBulkFilteredTemplates([]);
  setBulkFilteredContacts([]);
};
  if (loading) return <div className="p-6">Cargando...</div>;

  return (
  <div className="bg-card rounded-lg shadow p-6">
  {/* Header con título y botones de campañas */}
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">Campañas</h2>
    <div className="flex gap-2 items-center">
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" />Nueva Campaña Individual</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCampaign ? "Editar Campaña" : "Nueva Campaña Individual"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Organización</Label>
            <Select value={formData.organization} onValueChange={handleOrganizationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(contacts.map(c => c.organization))].map((org) => (
                  <SelectItem key={org} value={org}>{org}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contacto</Label>
            <Select 
              value={formData.contact_id} 
              onValueChange={handleContactChange}
              disabled={!formData.organization}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.organization ? "Seleccionar" : "Primero selecciona una organización"} />
              </SelectTrigger>
              <SelectContent>
                {contacts
                  .filter(c => c.organization === formData.organization)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.title})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plantilla</Label>
            <Select value={formData.template_id} onValueChange={(v) => setFormData({ ...formData, template_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Fechas de envío */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Fechas de Envío</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Al cambiar una fecha, las siguientes se recalcularán automáticamente (+3 días)
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Fecha Email 1</Label>
                  <Input
                    type="date"
                    value={formData.email_1_date || ''}
                    onChange={(e) => handleDateChange(1, e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Fecha Email 2</Label>
                  <Input
                    type="date"
                    value={formData.email_2_date || ''}
                    onChange={(e) => handleDateChange(2, e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Fecha Email 3</Label>
                  <Input
                    type="date"
                    value={formData.email_3_date || ''}
                    onChange={(e) => handleDateChange(3, e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Fecha Email 4</Label>
                  <Input
                    type="date"
                    value={formData.email_4_date || ''}
                    onChange={(e) => handleDateChange(4, e.target.value)}
                  />
                </div>
              </div>

              <div className="w-1/2">
                <Label>Fecha Email 5</Label>
                <Input
                  type="date"
                  value={formData.email_5_date || ''}
                  onChange={(e) => handleDateChange(5, e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.start_campaign} onCheckedChange={(v) => setFormData({ ...formData, start_campaign: v as boolean })} />
            <Label>Iniciar automáticamente la campaña</Label>
          </div>
          <div className="flex justify-between items-center">
            {editingCampaign && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => handleDelete(editingCampaign.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!editingCampaign && <div></div>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingCampaign ? "Actualizar" : "Crear"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    {/* Dialog para campañas masivas */}
    <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={resetBulkForm} variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Campaña Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Campaña Masiva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {/* Rol de campaña */}
          <div>
            <Label>Rol de Campaña</Label>
            <Select value={bulkFormData.gartner_role} onValueChange={handleBulkRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set(templates.map(t => t.gartner_role))).map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plantilla */}
          <div>
            <Label>Plantilla</Label>
            <Select 
              value={bulkFormData.template_id} 
              onValueChange={(v) => setBulkFormData({ ...bulkFormData, template_id: v })}
              disabled={!bulkFormData.gartner_role}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plantilla" />
              </SelectTrigger>
              <SelectContent>
                {bulkFilteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selección de contactos */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Contactos ({bulkFormData.selected_contacts.length} seleccionados)</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={selectAllContacts}
                  disabled={!bulkFormData.gartner_role}
                >
                  Seleccionar todos
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={deselectAllContacts}
                  disabled={bulkFormData.selected_contacts.length === 0}
                >
                  Deseleccionar todos
                </Button>
              </div>
            </div>
            
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
              {!bulkFormData.gartner_role ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecciona un rol para ver los contactos disponibles
                </p>
              ) : bulkFilteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay contactos disponibles para este rol
                </p>
              ) : (
                bulkFilteredContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={bulkFormData.selected_contacts.includes(contact.id)}
                      onCheckedChange={() => toggleContactSelection(contact.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1" onClick={() => toggleContactSelection(contact.id)}>
                      {contact.organization} - {contact.first_name} {contact.last_name} ({contact.title}) [Tier {contact.tier}]
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fechas de envío */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Fechas de Envío</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Al cambiar una fecha, las siguientes se recalcularán automáticamente (+3 días)
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Fecha Email 1</Label>
                  <Input
                    type="date"
                    value={bulkFormData.email_1_date}
                    onChange={(e) => handleBulkDateChange(1, e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Fecha Email 2</Label>
                  <Input
                    type="date"
                    value={bulkFormData.email_2_date}
                    onChange={(e) => handleBulkDateChange(2, e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Fecha Email 3</Label>
                  <Input
                    type="date"
                    value={bulkFormData.email_3_date}
                    onChange={(e) => handleBulkDateChange(3, e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Fecha Email 4</Label>
                  <Input
                    type="date"
                    value={bulkFormData.email_4_date}
                    onChange={(e) => handleBulkDateChange(4, e.target.value)}
                  />
                </div>
              </div>

              <div className="w-1/2">
                <Label>Fecha Email 5</Label>
                <Input
                  type="date"
                  value={bulkFormData.email_5_date}
                  onChange={(e) => handleBulkDateChange(5, e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Iniciar campaña */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={bulkFormData.start_campaign}
              onCheckedChange={(v) => setBulkFormData({ ...bulkFormData, start_campaign: v as boolean })}
            />
            <Label>Iniciar automáticamente las campañas</Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear {bulkFormData.selected_contacts.length} Campaña{bulkFormData.selected_contacts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</div>

  {/* Sección de verificación de emails - NUEVO */}
  <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <p className="text-sm font-medium">Verificación de respuestas de campañas</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {(() => {
            const lastCheck = localStorage.getItem('last_email_check');
            if (!lastCheck) return 'No se ha verificado aún';
            
            const checkDate = new Date(parseInt(lastCheck));
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - checkDate.getTime()) / (1000 * 60));
            
            // Mostrar hora específica
            const timeString = checkDate.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            if (diffMinutes < 1) return `Última verificación: hace menos de 1 minuto (${timeString})`;
            if (diffMinutes < 60) return `Última verificación: hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} (${timeString})`;
            
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `Última verificación: hace ${diffHours} hora${diffHours > 1 ? 's' : ''} (${timeString})`;
            
            const diffDays = Math.floor(diffHours / 24);
            const dateString = checkDate.toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: '2-digit' 
            });
            return `Última verificación: hace ${diffDays} día${diffDays > 1 ? 's' : ''} (${dateString} ${timeString})`;
          })()}
        </p>
      </div>
      <Button 
        variant="secondary"
        size="sm"
        onClick={() => {
          checkAllReplies();
          localStorage.setItem('last_email_check', Date.now().toString());
        }}
        disabled={checkingReplies}
      >
        {checkingReplies ? 'Verificando...' : 'Verificar ahora'}
      </Button>
    </div>
  </div>
  
  <Table className="w-full table-fixed">
          <colgroup>
            <col className="w-[100px]" />
            <col className="w-[160px]" />
            <col className="w-[100px]" />
            <col className="w-[100px]" />
            <col className="w-[100px]" />
            <col className="w-[70px]" />
            <col className="w-[70px]" />
            <col className="w-[70px]" />
            <col className="w-[70px]" />
            <col className="w-[70px]" />
            <col className="w-[120px]" />
          </colgroup>
    <TableHeader>
      <TableRow>
        <TableHead className="text-center">Organización</TableHead>
        <TableHead className="text-center">Nombre</TableHead>
        <TableHead className="text-center">Cargo</TableHead>
        <TableHead className="text-center">Rol Campaña</TableHead>
        <TableHead className="text-center">Estado</TableHead>
        <TableHead className="text-center">Email 1</TableHead>
        <TableHead className="text-center">Email 2</TableHead>
        <TableHead className="text-center">Email 3</TableHead>
        <TableHead className="text-center">Email 4</TableHead>
        <TableHead className="text-center">Email 5</TableHead>
        <TableHead className="text-center">Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {campaigns.map((campaign) => (
        <TableRow key={campaign.id} className={`text-center ${campaign.start_campaign ? "bg-blue-100/50" : ""}`}>
          <TableCell className="p-1">{campaign.contacts.organization}</TableCell>
          <TableCell>
              <div className="flex flex-col items-center">
                <span className="font-medium">{campaign.contacts.first_name} {campaign.contacts.last_name}</span>
                <span className="text-xs text-muted-foreground">{campaign.contacts.email}</span>
              </div>
          </TableCell>
          <TableCell className="p-1 text-xs">{campaign.contacts.title}</TableCell>
          <TableCell className="p-1">
              <div className="flex flex-col items-center">
                <span className="font-medium">{campaign.contacts.gartner_role}</span>
                <span className="text-muted-foreground">{campaign.campaign_templates.name}</span>
              </div>
          </TableCell>
            <TableCell className="p-1">
              {(() => {
                const campaignStatus = getCampaignStatus(campaign);
                return (
                  <div className="flex flex-col items-center gap-1">
                    {campaign.has_replied && campaign.response_text ? (
                      // Badge clickeable
                      <Badge 
                        variant={campaignStatus.variant}
                        className="bg-green-500 hover:bg-green-600 text-white cursor-pointer transition-all"
                        onClick={() => {
                          setSelectedResponse({
                            name: `${campaign.contacts.first_name} ${campaign.contacts.last_name}`,
                            email: campaign.contacts.email,
                            organization: campaign.contacts.organization,
                            replyDate: campaign.last_reply_date || '',
                            responseText: campaign.response_text || ''
                          });
                        }}
                      >
                        {campaignStatus.status}
                      </Badge>
                    ) : (
                      // Badge normal (no clickeable)
                      <Badge 
                        variant={campaignStatus.variant}
                        className={
                          campaignStatus.status === "Email incorrecto"
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : campaignStatus.status === "Respondido" 
                            ? "bg-green-500 hover:bg-green-600 text-white" 
                            : campaignStatus.status === "En curso"
                            ? "bg-gray-400 hover:bg-gray-600 text-white"
                            : campaignStatus.status === "Completada sin respuesta"
                            ? "bg-orange-500 hover:bg-orange-600 text-white"
                            : ""
                        }
                      >
                        {campaignStatus.status}
                      </Badge>
                    )}
                    
                    {campaign.has_replied && campaign.last_reply_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateES(campaign.last_reply_date)}
                      </span>
                    )}
                  </div>
                );
              })()}
            </TableCell>
          <TableCell>
            <div className="flex justify-center">
              <span className={`px-2 py-4 rounded text-xs ${campaign.emails_sent >= 1 ? "bg-green-500/20" : ""}`}>
                {formatDateES(campaign.email_1_date)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-center">
              <span className={`px-2 py-4 rounded text-xs ${campaign.emails_sent >= 2 ? "bg-green-500/20" : ""}`}>
                {formatDateES(campaign.email_2_date)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-center">
              <span className={`px-2 py-4 rounded text-xs ${campaign.emails_sent >= 3 ? "bg-green-500/20" : ""}`}>
                {formatDateES(campaign.email_3_date)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-center">
              <span className={`px-2 py-4 rounded text-xs ${campaign.emails_sent >= 4 ? "bg-green-500/20" : ""}`}>
                {formatDateES(campaign.email_4_date)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-center">
              <span className={`px-2 py-4 rounded text-xs ${campaign.emails_sent >= 5 ? "bg-green-500/20" : ""}`}>
                {formatDateES(campaign.email_5_date)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-center gap-3">
              {/* Si el email es incorrecto, solo mostrar botón de eliminar */}
              {campaign.email_incorrect ? (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de eliminar esta campaña?\n\nContacto: ${campaign.contacts.first_name} ${campaign.contacts.last_name}\nEmail incorrecto: ${campaign.contacts.email}`)) {
                      handleDelete(campaign.id);
                    }
                  }}
                  title="Eliminar campaña con email incorrecto"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ) : (
                <>
                  {/* Botón "Enviar hoy" - deshabilitado si respondió o completó */}
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => sendTodayEmails(campaign)}
                    disabled={campaign.has_replied || campaign.emails_sent >= 5}
                    title={
                      campaign.has_replied 
                        ? "Campaña respondida - no se pueden enviar más emails" 
                        : campaign.emails_sent >= 5 
                        ? "Campaña completada - todos los emails fueron enviados"
                        : "Enviar emails pendientes de hoy"
                    }
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                  
                  {/* Botón "Editar" - deshabilitado si respondió o completó */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => openEditDialog(campaign)}
                    disabled={campaign.has_replied || campaign.emails_sent >= 5}
                    title={
                      campaign.has_replied 
                        ? "No se puede editar - campaña respondida" 
                        : campaign.emails_sent >= 5 
                        ? "No se puede editar - campaña completada"
                        : "Editar campaña"
                    }
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  
                  {/* Botón "Enviar siguiente" - solo si está activa y no ha respondido */}
                  {campaign.start_campaign && 
                  !campaign.has_replied && 
                  campaign.emails_sent < 5 && 
                  getNextEmailNumber(campaign) && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => sendEmail(campaign, getNextEmailNumber(campaign)!)}
                      title={`Enviar email ${getNextEmailNumber(campaign)} manualmente`}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
      
      
      {/* Diálogo de confirmación de respuesta */}
  <AlertDialog open={!!repliedContact} onOpenChange={(open) => !open && setRepliedContact(null)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          ¡El contacto ha respondido!
        </AlertDialogTitle>
        <AlertDialogDescription className="space-y-2">
          <p className="text-base">
            <strong className="text-foreground">
              {repliedContact?.name}
            </strong>
            {' '}ha respondido a la campaña.
          </p>
          <p className="text-sm text-muted-foreground">
            📧 Email: {repliedContact?.email}
          </p>
          <p className="text-sm text-muted-foreground">
            📅 Fecha de respuesta: {repliedContact?.replyDate ? formatDateES(repliedContact.replyDate) : 'Hoy'}
          </p>
          {/* Mostrar preview del texto de respuesta si existe */}
            {repliedContact?.responseText && (
              <div className="mt-3 p-3 bg-muted rounded-md max-h-40 overflow-y-auto overflow-x-hidden">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Vista previa del mensaje:</p>
                <div className="text-sm text-foreground italic break-all whitespace-pre-wrap overflow-wrap-anywhere">
                  "{renderTextWithLinks(repliedContact.responseText)}..."
                </div>
              </div>
            )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction 
          onClick={() => setRepliedContact(null)}
          className="bg-green-500 hover:bg-green-600"
        >
          Entendido
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

      {/* Diálogo para ver respuesta de campaña */}
  <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          Respuesta de {selectedResponse?.name}
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            📧 Email: {selectedResponse?.email}
          </p>
          <p className="text-sm text-muted-foreground">
            🏢 Organización: {selectedResponse?.organization}
          </p>
          <p className="text-sm text-muted-foreground">
            📅 Fecha de respuesta: {selectedResponse?.replyDate ? formatDateES(selectedResponse.replyDate) : '-'}
          </p>
        </div>
        <div className="mt-4 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto overflow-x-hidden">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Contenido de la respuesta:
          </p>
          <div className="text-sm text-foreground whitespace-pre-wrap break-all overflow-wrap-anywhere">
            {selectedResponse?.responseText && renderTextWithLinks(selectedResponse.responseText)}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button onClick={() => setSelectedResponse(null)}>Cerrar</Button>
      </div>
    </DialogContent>
  </Dialog>
    </div>
  );
};