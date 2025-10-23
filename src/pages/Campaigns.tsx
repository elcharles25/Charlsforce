import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignList } from "@/components/campaigns/CampaignList";
import { TemplateList } from "@/components/campaigns/TemplateList";

const Campaigns = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Campañas</h1>

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campañas</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <CampaignList />
          </TabsContent>

          <TabsContent value="templates">
            <TemplateList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Campaigns;
