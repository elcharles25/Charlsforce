import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Rocket, Users, Mail, Video } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rocket className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold text-foreground">Charlsforce - Rocks your CRM and Campaigns</h1>
          </div>
          <p className="text-xl text-muted-foreground">Gestión de Campañas y CRM Automatizado</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/crm")}>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Módulo CRM</CardTitle>
              <CardDescription>Gestiona todos tus contactos, clientes y prospects en un solo lugar</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Acceder a CRM</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/campaigns")}>
            <CardHeader>
              <Mail className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Módulo Campañas</CardTitle>
              <CardDescription>Crea y gestiona campañas de email automatizadas con plantillas personalizables</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Gestionar Campañas</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/webinars")}>
            <CardHeader>
              <Video className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Módulo Webinars</CardTitle>
              <CardDescription>Envía información de webinars mensuales a tus clientes seleccionados</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Gestionar Webinars</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto bg-primary/5">
            <CardHeader>
              <CardTitle>Funcionalidades Principales</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-left space-y-2 text-muted-foreground">
                <li>✓ Gestión completa de contactos con segmentación por rol y tipo</li>
                <li>✓ Campañas de email automatizadas con 5 correos programables</li>
                <li>✓ Plantillas HTML personalizables con variables dinámicas</li>
                <li>✓ Distribución mensual de webinars vía email con archivos adjuntos</li>
                <li>✓ Seguimiento de estado y respuestas de campañas</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
