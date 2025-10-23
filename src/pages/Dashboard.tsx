import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Mail, Users, Target, CalendarCheck } from "lucide-react";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalContacts: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    responseRate: 0,
    webinarsSent: 0,
  });

  const [campaignsByRole, setCampaignsByRole] = useState<any[]>([]);
  const [campaignsByTemplate, setCampaignsByTemplate] = useState<any[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const { data: contacts } = await supabase.from("contacts").select("*");
    const { data: campaigns } = await supabase.from("campaigns").select("*, contacts(gartner_role), campaign_templates(name)");
    const { data: webinars } = await supabase.from("webinar_distributions").select("*");

    const totalEmailsSent = campaigns?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0;
    const responseCampaigns = campaigns?.filter(c => c.response_date).length || 0;
    const responseRate = campaigns?.length ? ((responseCampaigns / campaigns.length) * 100).toFixed(1) : 0;

    setMetrics({
      totalContacts: contacts?.length || 0,
      activeCampaigns: campaigns?.filter(c => c.status === 'active').length || 0,
      emailsSent: totalEmailsSent,
      responseRate: Number(responseRate),
      webinarsSent: webinars?.filter(w => w.sent).length || 0,
    });

    // Group by role
    const roleGroups = campaigns?.reduce((acc: any, c: any) => {
      const role = c.contacts?.gartner_role || 'Sin rol';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    setCampaignsByRole(Object.entries(roleGroups || {}).map(([name, value]) => ({ name, value })));

    // Group by template
    const templateGroups = campaigns?.reduce((acc: any, c: any) => {
      const template = c.campaign_templates?.name || 'Sin plantilla';
      acc[template] = (acc[template] || 0) + 1;
      return acc;
    }, {});

    setCampaignsByTemplate(Object.entries(templateGroups || {}).map(([name, value]) => ({ name, value })));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard - Sales Rocket Campaign</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contactos Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalContacts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeCampaigns}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.emailsSent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Respuesta</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.responseRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webinars Enviados</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.webinarsSent}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Campañas por Rol Gartner</CardTitle>
              <CardDescription>Distribución de campañas según el rol objetivo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={campaignsByRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {campaignsByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campañas por Plantilla</CardTitle>
              <CardDescription>Distribución de campañas según la plantilla utilizada</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={campaignsByTemplate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
