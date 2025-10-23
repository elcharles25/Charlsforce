import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export function WebinarEmailEditor() {
  const [emailConfig, setEmailConfig] = useState({
    subject: "Webinars disponibles este mes",
    html: `<h2>Hola {{nombre}},</h2>
<p>Aquí están los webinars disponibles para este mes en tu organización {{organizacion}}.</p>
<p>Adjuntamos el PDF con toda la información.</p>
<p>Saludos,<br>El equipo</p>`,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    const { data } = await supabase.from("settings").select("*").eq("key", "webinar_email_template").maybeSingle();
    if (data) {
      const value = data.value as any;
      setEmailConfig(value || emailConfig);
    }
  };

  const saveEmailConfig = async () => {
    const { data: existing } = await supabase.from("settings").select("*").eq("key", "webinar_email_template").maybeSingle();

    if (existing) {
      await supabase
        .from("settings")
        .update({ value: emailConfig })
        .eq("key", "webinar_email_template");
    } else {
      await supabase.from("settings").insert({ key: "webinar_email_template", value: emailConfig });
    }

    toast({ title: "Éxito", description: "Plantilla de email guardada" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar Email de Webinars</CardTitle>
        <CardDescription>Esta plantilla se usará para todos los envíos de webinars</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="subject">Asunto del Email</Label>
          <Input
            id="subject"
            value={emailConfig.subject}
            onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="html">Plantilla HTML</Label>
          <Textarea
            id="html"
            value={emailConfig.html}
            onChange={(e) => setEmailConfig({ ...emailConfig, html: e.target.value })}
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Variables disponibles: {"{{nombre}}"}, {"{{apellido}}"}, {"{{organizacion}}"}
          </p>
        </div>
        <Button onClick={saveEmailConfig}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Plantilla
        </Button>
      </CardContent>
    </Card>
  );
}
