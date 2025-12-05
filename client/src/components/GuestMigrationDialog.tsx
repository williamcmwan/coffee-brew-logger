import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, GuestDataCounts } from "@/lib/api";
import { Loader2, Package, Bean, Coffee, GlassWater, BookOpen, FileText, History } from "lucide-react";

interface GuestMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNewAccount: boolean;
  onMigrate: () => Promise<void>;
  onSkip: () => void;
}

export function GuestMigrationDialog({ open, onOpenChange, isNewAccount, onMigrate, onSkip }: GuestMigrationDialogProps) {
  const [counts, setCounts] = useState<GuestDataCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (open) {
      const deviceId = localStorage.getItem("guestDeviceId");
      if (deviceId) {
        api.auth.getGuestData(deviceId).then(data => {
          setCounts(data.counts);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [open]);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await onMigrate();
      localStorage.removeItem("guestDeviceId");
      onOpenChange(false);
      // Redirect to dashboard after successful migration
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Migration failed:", error);
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    localStorage.removeItem("guestDeviceId");
    onSkip();
    onOpenChange(false);
  };

  const totalItems = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  const itemList = [
    { key: "beans", label: "Coffee Beans", icon: Bean },
    { key: "grinders", label: "Grinders", icon: Coffee },
    { key: "brewers", label: "Brewers", icon: Package },
    { key: "servers", label: "Coffee Servers", icon: GlassWater },
    { key: "recipes", label: "Recipes", icon: BookOpen },
    { key: "templates", label: "Brew Templates", icon: FileText },
    { key: "brews", label: "Brew History", icon: History },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNewAccount ? "Transfer Guest Data" : "Migrate Guest Data"}
          </DialogTitle>
          <DialogDescription>
            {isNewAccount
              ? "We found data from your guest session. Would you like to transfer it to your new account?"
              : "You have data from a previous guest session. Would you like to migrate it to your account?"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : totalItems === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No guest data found to migrate.
          </p>
        ) : (
          <div className="space-y-2 py-4">
            <p className="text-sm font-medium mb-3">Items to migrate:</p>
            <div className="grid grid-cols-2 gap-2">
              {itemList.map(({ key, label, icon: Icon }) => {
                const count = counts?.[key] || 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                    <span className="ml-auto font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={migrating}>
            {totalItems === 0 ? "Continue" : "Skip & Discard"}
          </Button>
          {totalItems > 0 && (
            <Button onClick={handleMigrate} disabled={migrating}>
              {migrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                "Migrate Data"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
