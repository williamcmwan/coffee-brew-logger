import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coffee, Droplet, BookOpen, Bean, FileText, GlassWater, ChevronRight } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  const sections = [
    { title: "Coffee Beans", icon: Bean, path: "/settings/beans", description: "Manage your coffee collection" },
    { title: "Grinders", icon: Coffee, path: "/settings/grinders", description: "Your grinding equipment" },
    { title: "Brewers", icon: Droplet, path: "/settings/brewers", description: "Brewing devices" },
    { title: "Coffee Servers", icon: GlassWater, path: "/settings/servers", description: "Serving vessels" },
    { title: "Recipes", icon: BookOpen, path: "/settings/recipes", description: "Saved brew recipes" },
    { title: "Brew Templates", icon: FileText, path: "/brew-templates", description: "Custom note templates" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center gap-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Equipment & Settings</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sections.map((section) => (
            <button
              key={section.path}
              className="group relative flex flex-col items-center p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 text-left"
              onClick={() => navigate(section.path)}
            >
              <div className="rounded-full bg-primary/10 p-3 mb-2 group-hover:bg-primary/20 transition-colors">
                <section.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium text-sm text-center">{section.title}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">{section.description}</span>
              <ChevronRight className="absolute top-3 right-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
