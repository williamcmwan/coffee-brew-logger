import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Settings, Plus, History, TrendingUp, GitCompare, Package } from "lucide-react";

export default function Dashboard() {
  const { user, brews, logout } = useApp();
  const navigate = useNavigate();

  const recentBrews = brews.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hello, {user?.name}</h1>
              <p className="text-sm text-muted-foreground">Ready to brew?</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Start brewing</p>
                <h2 className="text-lg font-bold">New Brew Session</h2>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/brew")}
                className="rounded-full h-12 w-12"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/settings")}>
            <CardContent className="p-4 text-center">
              <Settings className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="font-medium text-xs">Settings</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/analytics")}>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="font-medium text-xs">Analytics</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/comparison")}>
            <CardContent className="p-4 text-center">
              <GitCompare className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="font-medium text-xs">Compare</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/inventory")}>
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="font-medium text-xs">Inventory</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Brews</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/history")}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBrews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No brews yet. Start your first brew session!
              </p>
            ) : (
              <div className="space-y-3">
                {recentBrews.map((brew) => (
                  <div
                    key={brew.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">Brew #{brew.id.slice(0, 6)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(brew.date).toLocaleDateString()}
                      </p>
                    </div>
                    {brew.rating && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{brew.rating}</span>
                        <span className="text-xs text-muted-foreground">/5</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
