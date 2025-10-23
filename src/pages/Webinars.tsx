import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Send, Trash2 } from "lucide-react";
import { WebinarEmailEditor } from "@/components/webinars/WebinarEmailEditor";
import { useOutlookDraftBatch } from "@/hooks/useOutlookDraft";
import { formatDateES } from "@/utils/dateFormatter";

interface WebinarDistribution {
  id: string;
  month: string;
  file_url: string;
  file_name: string;
  email_subject: string;
  email_html: string;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}

interface WebinarInfo {
  title: string;
  date: string;
  time: string;
  analyst: string;
  reason: string;
}

const Webinars = () => {
  const [distributions, setDistributions] = useState<WebinarDistribution[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const [availablePdfs, setAvailablePdfs] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState("");
  const { toast } = useToast();
  const { mutate: createDraftsBatch, isPending: isCreatingDrafts } = useOutlookDraftBatch();
  const [webinarsByRole, setWebinarsByRole] = useState<Record<string, WebinarInfo[]>>({});
  const [analyzingDistId, setAnalyzingDistId] = useState<string | null>(null);
  const [completedAnalysisDistIds, setCompletedAnalysisDistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDistributions();
    fetchAvailablePdfs();
  }, []);

  const fetchDistributions = async () => {
    const { data } = await supabase.from("webinar_distributions").select("*").order("created_at", { ascending: false });
    setDistributions(data || []);
  };

  const fetchAvailablePdfs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/webinars/list-pdfs');
      if (!response.ok) throw new Error('Error obteniendo PDFs');
      const data = await response.json();
      setAvailablePdfs(data.pdfs || []);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast({ 
        title: "Advertencia", 
        description: "No se pudo obtener la lista de PDFs disponibles",
        variant: "destructive" 
      });
    }
  };

  const extractTextFromPdf = async (pdfUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const pdfjsScript = document.createElement('script');
      pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      
      pdfjsScript.onload = async () => {
        try {
          const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
          
          if (!pdfjsLib) {
            throw new Error('PDF.js no cargó correctamente');
          }
          
          pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }

          resolve(fullText);
        } catch (err) {
          reject(new Error(`Error extrayendo PDF: ${err instanceof Error ? err.message : String(err)}`));
        }
      };
      
      pdfjsScript.onerror = () => {
        reject(new Error('No se pudo cargar PDF.js desde CDN'));
      };
      
      document.head.appendChild(pdfjsScript);
    });
  };

  const analyzeWithGemini = async (pdfText: string): Promise<Record<string, WebinarInfo[]>> => {
    const geminiKey = (window as any).__GEMINI_API_KEY__ || '';
    
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }

    const prompt = `Analiza este contenido de webinars e identifica para cada rol los temas/webinars más relevantes que sean en inglés o español.

Roles a considerar: CIO, CISO, CDAO, Talent, Workplace, Procurement, Enterprise Architect, CAIO, Infrastructure & Operations

Para cada rol:
1. Identifica sus principales prioridades y desafíos
2. Selecciona los 2 webinars/temas más relevantes
3. Explica por qué son relevantes

Contenido del PDF (primeros 8000 caracteres):
${pdfText.substring(0, 8000)}

Devuelve SOLO un JSON válido (sin markdown, sin comillas adicionales) con esta estructura exacta:
{
  "CIO": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "CISO": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "CDAO": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "Talent": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "Workplace": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "Procurement": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "Enterprise Architect": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ],
  "CAIO": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ]
  "Infrastructure & Operations": [
    { "title": "Título del webinar 1", "date": "2025-01-15", "time": "14:00", "analyst": "Nombre Analista" },
    { "title": "Título del webinar 2", "date": "2025-01-22", "time": "15:30", "analyst": "Nombre Analista" }
  ]
}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      console.log('URL de Gemini:', url.replace(geminiKey, 'XXXX'));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('Status de respuesta:', response.status);
      console.log('Headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Error Gemini API: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Respuesta Gemini:', data);
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Respuesta inesperada de Gemini');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta de Gemini');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new Error(`Error analizando con Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleAnalysisStart = async (distributionId: string, pdfUrl: string) => {
    setAnalyzingDistId(distributionId);
    
    try {
      const pdfText = await extractTextFromPdf(pdfUrl);
      
      if (!pdfText || typeof pdfText !== 'string' || pdfText.length < 100) {
        throw new Error('El PDF parece estar vacío o no contiene texto suficiente');
      }

      const analysisData = await analyzeWithGemini(pdfText);
      setWebinarsByRole(analysisData);
      console.log('Datos de webinars recibidos:', analysisData);
      toast({
        title: "Éxito",
        description: "Análisis completado correctamente",
      });
      setCompletedAnalysisDistIds(prev => new Set(prev).add(distributionId));
      setAnalyzingDistId(null);
    } catch (error) {
      console.error('Error en análisis:', error);
      toast({
        title: "Error",
        description: `Error al analizar: ${error instanceof Error ? error.message : 'Desconocido'}`,
        variant: "destructive",
      });
      setAnalyzingDistId(null);
    }
  };

  const handleSaveDistribution = async () => {
    if (!selectedPdf) {
      toast({ 
        title: "Error", 
        description: "Por favor selecciona un archivo PDF",
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);

    try {
      const { data: templateData } = await supabase.from("settings").select("*").eq("key", "webinar_email_template").maybeSingle();
      const template = (templateData?.value as any) || {
        subject: "Webinars disponibles este mes",
        html: "<h2>Hola {{Nombre}},</h2><p>Aquí están los webinars disponibles para este mes.</p>",
      };

      const fileName = selectedPdf.split('\\').pop() || selectedPdf;
      const pdfPath = `Webinars/${selectedPdf}`;

      const { data: insertData, error: insertError } = await supabase
        .from("webinar_distributions")
        .insert([
          {
            month: month,
            file_url: pdfPath,
            file_name: fileName,
            email_subject: template.subject,
            email_html: template.html,
          },
        ])
        .select()
        .single();

      if (insertError) {
        toast({ title: "Error", description: `No se pudo guardar: ${insertError.message}`, variant: "destructive" });
        setUploading(false);
        return;
      }

      toast({ title: "Éxito", description: `Distribución guardada: ${fileName}` });
      setSelectedPdf("");
      fetchDistributions();
      fetchAvailablePdfs();
    } catch (error) {
      toast({ title: "Error", description: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const replaceWebinarVariables = (html: string, role: string): string => {
    let modifiedHtml = html;
    const roleWebinars = webinarsByRole[role] || [];

    const simpleReplace = (text: string, pattern: string, replacement: string): string => {
      return text.split(pattern).join(replacement);
    };

    for (let i = 0; i < 10; i++) {
      const webinarIndex = i + 1;
      const webinar = roleWebinars[i];

      if (webinar) {
        modifiedHtml = simpleReplace(modifiedHtml, '{{Webinar' + webinarIndex + '}}', webinar.title);
        modifiedHtml = simpleReplace(modifiedHtml, '{{Titulo' + webinarIndex + '}}', webinar.title);
        modifiedHtml = simpleReplace(modifiedHtml, '{{Título' + webinarIndex + '}}', webinar.title);
        modifiedHtml = simpleReplace(modifiedHtml, '{{Fecha' + webinarIndex + '}}', webinar.date);
        modifiedHtml = simpleReplace(modifiedHtml, '{{Hora' + webinarIndex + '}}', webinar.time);
        modifiedHtml = simpleReplace(modifiedHtml, '{{Analista' + webinarIndex + '}}', webinar.analyst);
        modifiedHtml = simpleReplace(modifiedHtml, '{{Razon' + webinarIndex + '}}', webinar.reason);
      } else {
        modifiedHtml = simpleReplace(modifiedHtml, '{{Webinar' + webinarIndex + '}}', '');
        modifiedHtml = simpleReplace(modifiedHtml, '{{Titulo' + webinarIndex + '}}', '');
        modifiedHtml = simpleReplace(modifiedHtml, '{{Título' + webinarIndex + '}}', '');
        modifiedHtml = simpleReplace(modifiedHtml, '{{Fecha' + webinarIndex + '}}', '');
        modifiedHtml = simpleReplace(modifiedHtml, '{{Hora' + webinarIndex + '}}', '');
        modifiedHtml = simpleReplace(modifiedHtml, '{{Analista' + webinarIndex + '}}', '');
        modifiedHtml = simpleReplace(modifiedHtml, '{{Razon' + webinarIndex + '}}', '');
      }
    }

    return modifiedHtml;
  };

 const handleCreateDrafts = async (distributionId: string) => {
  setCreatingDrafts(true);

  try {
    toast({ title: "Preparando", description: "Obteniendo contactos y configuración..." });

    let signature = "";
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "email_signature")
        .single();
      
      if (data && data.value) {
        const value = data.value as any;
        let sig = value?.signature || "";
        sig = sig.trim();
        if (sig.startsWith('"') && sig.endsWith('"')) {
          sig = sig.slice(1, -1);
        }
        sig = sig.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\//g, '/');
        signature = sig;
      }
    } catch (e) {
      console.log('No signature configured');
    }

    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, email, first_name, webinar_role")
      .eq("webinars_subscribed", true);

    if (contactsError) {
      console.error('Error en consulta de contactos:', contactsError);
      toast({
        title: "Error",
        description: `Error al obtener contactos: ${contactsError.message}`,
        variant: "destructive",
      });
      setCreatingDrafts(false);
      return;
    }

    if (!contacts || contacts.length === 0) {
      toast({
        title: "Advertencia",
        description: "No hay contactos suscritos a webinars",
        variant: "destructive",
      });
      setCreatingDrafts(false);
      return;
    }

    const distribution = distributions.find(d => d.id === distributionId);
    if (!distribution) {
      toast({
        title: "Error",
        description: "No se encontró la distribución",
        variant: "destructive",
      });
      setCreatingDrafts(false);
      return;
    }

    if (!distribution.file_url) {
      toast({
        title: "Error",
        description: "No hay archivo PDF asociado a esta distribución",
        variant: "destructive",
      });
      setCreatingDrafts(false);
      return;
    }

    // Descargar el PDF y convertir a base64
    console.log('Descargando PDF desde:', distribution.file_url);
    let pdfBase64 = "";
    try {
      const pdfResponse = await fetch(distribution.file_url);
      if (!pdfResponse.ok) {
        throw new Error(`Error descargando PDF: ${pdfResponse.status}`);
      }
      const pdfBlob = await pdfResponse.blob();
      pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onload = () => {
          const result = reader.result as string;
          // Extraer solo la parte base64 (sin el prefijo data:application/pdf;base64,)
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      console.log('PDF convertido a base64, tamaño:', pdfBase64.length);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast({
        title: "Advertencia",
        description: "No se pudo adjuntar el PDF, se crearán los borradores sin adjunto",
        variant: "destructive",
      });
    }

    const [ano, mes] = distribution.month.split('-');
    const mesesEnEspanol = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNombre = mesesEnEspanol[parseInt(mes) - 1];

    const simpleReplace = (text: string, pattern: string, replacement: string): string => {
      return text.split(pattern).join(replacement);
    };

    const emailsToCreate = (contacts as any[]).map((contact: any) => {
      const contactRole = contact.webinar_role ? String(contact.webinar_role) : 'CIO';
      const contactFirstName = contact.first_name ? String(contact.first_name) : '';
      const contactEmail = contact.email ? String(contact.email) : '';
      
      let body = replaceWebinarVariables(distribution.email_html, contactRole);
      
      let bodyFinal = simpleReplace(body, '{{Nombre}}', contactFirstName);
      bodyFinal = simpleReplace(bodyFinal, '{{nombre}}', contactFirstName);

      if (signature) {
        bodyFinal = bodyFinal + signature;
      }

      let subject = distribution.email_subject;
      subject = simpleReplace(subject, '{{mes}}', mesNombre);
      subject = simpleReplace(subject, '{{anio}}', ano);

      const email: any = {
        to: contactEmail,
        subject: subject,
        body: bodyFinal,
      };

      // Incluir PDF en adjuntos si está disponible
      if (pdfBase64) {
        email.attachments = [
          {
            filename: distribution.file_name,
            content: pdfBase64
          }
        ];
      }

      return email;
    });

    createDraftsBatch(
      { emails: emailsToCreate },
      {
        onSuccess: async () => {
          const { error } = await supabase
            .from("webinar_distributions")
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq("id", distributionId);

          if (!error) {
            toast({
              title: "Éxito",
              description: "Borradores creados y estado actualizado",
            });
            fetchDistributions();
          }
          setCreatingDrafts(false);
        },
        onError: () => {
          setCreatingDrafts(false);
        },
      }
    );
  } catch (error) {
    console.error("Error creating drafts:", error);
    toast({
      title: "Error",
      description: `Error: ${error instanceof Error ? error.message : 'Desconocido'}`,
      variant: "destructive",
    });
    setCreatingDrafts(false);
  }
};

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("¿Eliminar esta distribución?")) return;

    const fileName = fileUrl.split("/").pop();
    if (fileName) {
      await supabase.storage.from("webinars").remove([fileName]);
    }

    const { error } = await supabase.from("webinar_distributions").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Distribución eliminada" });
      fetchDistributions();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Webinars</h1>
          <Button onClick={() => setShowEmailEditor(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Email
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cargar Nuevo Webinar</CardTitle>
            <CardContent className="p-0 text-sm">Es necesario cargar el calendario PDF de webinars en la carpeta Webinars, dentro la ruta de la aplicación</CardContent>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Mes</label>
                <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Seleccionar el calendario de webinars</label>
                <select
                  value={selectedPdf}
                  onChange={(e) => setSelectedPdf(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  disabled={uploading}
                >
                  <option value="">-- Selecciona un PDF --</option>
                  {availablePdfs
                    .filter(pdf => !distributions.some(dist => dist.file_name === pdf.split('\\').pop()))
                    .map((pdf) => (
                    <option key={pdf} value={pdf}>
                      {pdf.split('\\').pop()}
                    </option>
                  ))}
                </select>
                {availablePdfs.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No hay PDFs disponibles. Coloca archivos en la carpeta Webinars del proyecto.
                  </p>
                )}
              </div>
            </div>
            <Button onClick={handleSaveDistribution} disabled={uploading || !selectedPdf} className="w-full">
              Guardar Distribución
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuciones de Webinars</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Mes</TableHead>
                  <TableHead className="text-center">Archivo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Fecha Envío</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map((dist) => (
                  <TableRow key={dist.id} className="text-sm leading-tight text-center align-middle">
                    <TableCell className="p-4">{dist.month}</TableCell>
                    <TableCell className="p-4">
                      <a href={dist.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {dist.file_name}
                      </a>
                    </TableCell>
                    <TableCell className="p-4">
                      <span className={`leading-tight rounded text-xs ${dist.sent ? "px-10 py-2.5 bg-green-500/20" : "px-9 py-2.5 bg-yellow-500/20"}`}>
                        {dist.sent ? "Enviado" : "Pendiente"}
                      </span>
                    </TableCell>
                    <TableCell className="p-4">{formatDateES(dist.sent_at)}</TableCell>
                    <TableCell className="p-4">
                      <div className="flex justify-center gap-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 py-0" 
                          onClick={() => handleAnalysisStart(dist.id, dist.file_url)} 
                          disabled={dist.sent || analyzingDistId === dist.id || completedAnalysisDistIds.has(dist.id)}
                          title={
                            dist.sent 
                              ? "No se puede analizar - webinar enviado" 
                              : analyzingDistId === dist.id 
                              ? "Analizando..."
                              : completedAnalysisDistIds.has(dist.id)
                              ? "Análisis completado"
                              : "Analizar con AI"
                          }
                        >
                          {analyzingDistId === dist.id 
                            ? 'Analizando con IA...' 
                            : completedAnalysisDistIds.has(dist.id)
                            ? 'Análisis con AI completado'
                            : 'Analizar con AI'
                          }
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 px-2 py-0" 
                          onClick={() => handleCreateDrafts(dist.id)} 
                          disabled={dist.sent || creatingDrafts || isCreatingDrafts || analyzingDistId !== null || Object.keys(webinarsByRole).length === 0} 
                          title={
                            dist.sent
                              ? "No se pueden crear borradores - webinar enviado"
                              : Object.keys(webinarsByRole).length === 0
                              ? "Primero analiza con AI"
                              : "Crear borradores en Outlook"
                          }
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="h-8 px-2 py-0" 
                          onClick={() => handleDelete(dist.id, dist.file_url)}
                          disabled={dist.sent}
                          title={
                            dist.sent
                              ? "No se puede eliminar - webinar enviado"
                              : "Eliminar distribución"
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showEmailEditor} onOpenChange={setShowEmailEditor}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurar Plantilla de Email</DialogTitle>
            </DialogHeader>
            <WebinarEmailEditor />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Webinars;