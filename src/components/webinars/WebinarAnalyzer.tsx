export const WebinarAnalyzer = ({ pdfUrl, onAnalysisComplete, onAnalysisStart }) => {
  const performAnalysis = async () => {
    try {
      if (!pdfUrl) {
        throw new Error('URL del PDF no proporcionada');
      }

      // Verificar clave de API desde variables globales
      const geminiKey = (window as any).__GEMINI_API_KEY__ || '';
      
      if (!geminiKey) {
        throw new Error('GEMINI_API_KEY no configurada');
      }

      // Extraer texto del PDF
      const pdfText = await extractTextFromPdf(pdfUrl);
      
      if (!pdfText || typeof pdfText !== 'string') {
        throw new Error('No se pudo extraer texto del PDF');
      }
      
      const charCount = pdfText.length;

      if (charCount < 100) {
        throw new Error('El PDF parece estar vacío o no contiene texto suficiente');
      }

      // Analizar con Gemini
      const analysisData = await analyzeWithGemini(pdfText, geminiKey);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisData);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error completo:', err);
      if (onAnalysisComplete) {
        onAnalysisComplete(null, errorMsg);
      }
    }
  };

  const extractTextFromPdf = async (pdfUrl: string) => {
    try {
      const pdfjsScript = document.createElement('script');
      pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      
      return new Promise((resolve, reject) => {
        pdfjsScript.onload = async () => {
          try {
            const pdfjsLib = window['pdfjs-dist/build/pdf'];
            
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
    } catch (err) {
      throw new Error(`Error procesando PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const analyzeWithGemini = async (pdfText: string, geminiKey: string) => {
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
}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
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
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error Gemini API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
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

  return {
    performAnalysis
  };
};