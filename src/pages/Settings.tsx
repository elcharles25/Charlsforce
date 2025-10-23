import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const Settings = () => {
  const [signature, setSignature] = useState("");
  const [accountManager, setAccountManager] = useState({
    name: "",
    role: "",
    email: "",
    surname: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchAccountManager();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("settings").select("*").eq("key", "email_signature").maybeSingle();
    if (data) {
      const value = data.value as any;
      setSignature(value?.signature || "");
    }
  };

  const fetchAccountManager = async () => {
    const { data } = await supabase.from("settings").select("*").eq("key", "account_manager").maybeSingle();
    if (data) {
      const value = data.value as any;
      setAccountManager({
        name: value?.name || "",
        role: value?.role || "",
        email: value?.email || "",
        surname: value?.surname || "",
      });
    }
  };

  const saveSignature = async () => {
    const { data: existing } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "email_signature")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("settings")
        .update({ value: { signature } })
        .eq("key", "email_signature");
    } else {
      await supabase.from("settings").insert({ key: "email_signature", value: { signature } });
    }

    toast({ title: "Éxito", description: "Firma guardada correctamente" });
  };

  const saveAccountManager = async () => {
    if (!accountManager.name || !accountManager.role || !accountManager.email) {
      toast({ title: "Error", description: "Todos los campos son requeridos", variant: "destructive" });
      return;
    }

    const { data: existing } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "account_manager")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("settings")
        .update({ value: accountManager })
        .eq("key", "account_manager");
    } else {
      await supabase.from("settings").insert({ key: "account_manager", value: accountManager });
    }

    toast({ title: "Éxito", description: "Datos del Account Executive guardados" });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>

        <Tabs defaultValue="account-manager">
          <TabsList>
            <TabsTrigger value="account-manager">Account Executive</TabsTrigger>
            <TabsTrigger value="signature">Firma de Email</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="account-manager">
            <Card>
              <CardHeader>
                <CardTitle>Información del Account Executive</CardTitle>
                <CardDescription>Información del gestor de cuenta responsable</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="manager-name">Nombre</Label>
                  <Input
                    id="manager-name"
                    value={accountManager.name}
                    onChange={(e) => setAccountManager({ ...accountManager, name: e.target.value })}
                    placeholder="Nombre Account Executive"
                  />
                </div>
                <div>
                  <Label htmlFor="manager-surname">Apellidos</Label>
                  <Input
                    id="manager-surname"
                    value={accountManager.surname}
                    onChange={(e) => setAccountManager({ ...accountManager, surname: e.target.value })}
                    placeholder="Apellido Account Executive"
                  />
                </div>
                <div>
                  <Label htmlFor="manager-role">Rol</Label>
                  <Input
                    id="manager-role"
                    value={accountManager.role}
                    onChange={(e) => setAccountManager({ ...accountManager, role: e.target.value })}
                    placeholder="Rol"
                  />
                </div>
                <div>
                  <Label htmlFor="manager-email">Email</Label>
                  <Input
                    id="manager-email"
                    type="email"
                    value={accountManager.email}
                    onChange={(e) => setAccountManager({ ...accountManager, email: e.target.value })}
                    placeholder="email del Account Executive"
                  />
                </div>
                <Button onClick={saveAccountManager}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Account Executive
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signature">
            <Card>
              <CardHeader>
                <CardTitle>Firma de Email</CardTitle>
                <CardDescription>
                  Esta firma se incluirá automáticamente en todos los emails de campañas y webinars
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="signature">Firma HTML</Label>
                  <Textarea
                    id="signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    placeholder="<p>Saludos,<br>Carlos Andrés de Miguel<br>carlos.andresdemiguel@gartner.com</p>"
                  />
                </div>
                <Button onClick={saveSignature}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Firma
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza el aspecto de la aplicación</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configuración de apariencia próximamente...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>Ajustes básicos de la aplicación</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configuración general próximamente...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;