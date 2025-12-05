import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Coffee, Droplet, BookOpen, Bean, FileText, GlassWater, ChevronRight, ChevronDown, Key, Coins, HelpCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

export default function Settings() {
  const navigate = useNavigate();
  const { user, changePassword } = useApp();
  const { toast } = useToast();
  const { currency, setCurrency, currencies } = useCurrency();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword, confirmNewPassword);
      toast({ title: "Success", description: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to change password", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isEmailUser = (user?.authProvider === 'email' || !user?.authProvider) && user?.authProvider !== 'guest';

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
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Equipment & Settings</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/guide")} title="User Guide">
            <HelpCircle className="h-5 w-5" />
          </Button>
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

        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Currency
            </CardTitle>
            <CardDescription>Set your preferred currency for prices</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(currencies).map(([code, config]) => (
                  <SelectItem key={code} value={code}>
                    {config.symbol} - {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isEmailUser && (
          <Collapsible open={isPasswordSectionOpen} onOpenChange={setIsPasswordSectionOpen}>
            <Card className="mt-6">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Change Password
                    </span>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isPasswordSectionOpen ? "rotate-180" : ""}`} />
                  </CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isChangingPassword} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} disabled={isChangingPassword} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                      <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required minLength={6} disabled={isChangingPassword} />
                    </div>
                    <Button type="submit" disabled={isChangingPassword}>{isChangingPassword ? "Changing..." : "Change Password"}</Button>
                  </form>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
