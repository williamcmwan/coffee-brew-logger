import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Coffee, Droplet, BookOpen, Bean, FileText } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  const sections = [
    { title: "Grinders", icon: Coffee, path: "/settings/grinders" },
    { title: "Brewers", icon: Droplet, path: "/settings/brewers" },
    { title: "Recipes", icon: BookOpen, path: "/settings/recipes" },
    { title: "Coffee Beans", icon: Bean, path: "/settings/beans" },
    { title: "Brew Note Templates", icon: FileText, path: "/brew-templates" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Equipment & Settings</h1>
        </div>

        <div className="space-y-3">
          {sections.map((section) => (
            <Card
              key={section.path}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(section.path)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-lg">{section.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
