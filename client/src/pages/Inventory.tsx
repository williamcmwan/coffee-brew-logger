import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Package, 
  AlertTriangle, 
  Plus, 
  Edit, 
  TrendingDown,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { CoffeeBean, CoffeeBatch } from "@/contexts/AppContext";

export default function Inventory() {
  const { coffeeBeans, updateCoffeeBean } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedBean, setSelectedBean] = useState<CoffeeBean | null>(null);
  const [editingBatch, setEditingBatch] = useState<CoffeeBatch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [usageAmount, setUsageAmount] = useState("");
  const [usageNotes, setUsageNotes] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [updateWeightDialogOpen, setUpdateWeightDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  // Calculate inventory stats
  const inventoryStats = useMemo(() => {
    const stats = coffeeBeans.map(bean => {
      const totalStock = bean.batches.reduce((sum, batch) => sum + batch.currentWeight, 0);
      const totalOriginal = bean.batches.reduce((sum, batch) => sum + batch.weight, 0);
      const activeBatches = bean.batches.filter(b => b.isActive).length;
      const threshold = bean.lowStockThreshold || 100;
      const isLowStock = totalStock <= threshold && totalStock > 0;
      const isOutOfStock = totalStock === 0;
      
      return {
        bean,
        totalStock,
        totalOriginal,
        activeBatches,
        isLowStock,
        isOutOfStock,
        threshold
      };
    });

    const lowStockCount = stats.filter(s => s.isLowStock).length;
    const outOfStockCount = stats.filter(s => s.isOutOfStock).length;
    const totalValue = stats.reduce((sum, s) => {
      return sum + s.bean.batches.reduce((batchSum, batch) => {
        const remaining = batch.currentWeight / batch.weight;
        return batchSum + (batch.price * remaining);
      }, 0);
    }, 0);

    return { stats, lowStockCount, outOfStockCount, totalValue };
  }, [coffeeBeans]);

  const handleUpdateThreshold = (bean: CoffeeBean) => {
    if (!lowStockThreshold || isNaN(Number(lowStockThreshold))) {
      toast({
        title: "Invalid threshold",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    updateCoffeeBean(bean.id, { lowStockThreshold: Number(lowStockThreshold) });
    toast({
      title: "Threshold updated",
      description: "Low stock threshold has been updated",
    });
    setDialogOpen(false);
    setSelectedBean(null);
    setLowStockThreshold("");
  };

  const handleRecordUsage = () => {
    if (!selectedBean || !editingBatch || !usageAmount || isNaN(Number(usageAmount))) {
      toast({
        title: "Invalid usage",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(usageAmount);
    if (amount > editingBatch.currentWeight) {
      toast({
        title: "Invalid amount",
        description: "Usage amount exceeds current stock",
        variant: "destructive",
      });
      return;
    }

    const updatedBatches = selectedBean.batches.map(batch => {
      if (batch.id === editingBatch.id) {
        const newWeight = batch.currentWeight - amount;
        return {
          ...batch,
          currentWeight: newWeight,
          isActive: newWeight > 0,
          notes: usageNotes ? `${batch.notes || ""}\n${new Date().toLocaleDateString()}: Used ${amount}g - ${usageNotes}`.trim() : batch.notes
        };
      }
      return batch;
    });

    updateCoffeeBean(selectedBean.id, { batches: updatedBatches });
    
    toast({
      title: "Usage recorded",
      description: `${amount}g recorded for ${selectedBean.name}`,
    });

    setUsageDialogOpen(false);
    setUsageAmount("");
    setUsageNotes("");
    setEditingBatch(null);
  };

  const openThresholdDialog = (bean: CoffeeBean) => {
    setSelectedBean(bean);
    setLowStockThreshold(bean.lowStockThreshold?.toString() || "100");
    setDialogOpen(true);
  };

  const openUsageDialog = (bean: CoffeeBean, batch: CoffeeBatch) => {
    setSelectedBean(bean);
    setEditingBatch(batch);
    setUsageDialogOpen(true);
  };

  const openUpdateWeightDialog = (bean: CoffeeBean, batch: CoffeeBatch) => {
    setSelectedBean(bean);
    setEditingBatch(batch);
    setNewWeight(batch.currentWeight.toString());
    setUpdateWeightDialogOpen(true);
  };

  const handleUpdateWeight = () => {
    if (!selectedBean || !editingBatch || !newWeight || isNaN(Number(newWeight))) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    const weight = Number(newWeight);
    if (weight < 0) {
      toast({
        title: "Invalid weight",
        description: "Weight cannot be negative",
        variant: "destructive",
      });
      return;
    }

    const updatedBatches = selectedBean.batches.map(batch => {
      if (batch.id === editingBatch.id) {
        return {
          ...batch,
          currentWeight: weight,
          isActive: weight > 0,
        };
      }
      return batch;
    });

    updateCoffeeBean(selectedBean.id, { batches: updatedBatches });
    
    toast({
      title: "Weight updated",
      description: `${selectedBean.name} batch weight set to ${weight}g`,
    });

    setUpdateWeightDialogOpen(false);
    setNewWeight("");
    setEditingBatch(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Inventory Tracker</h1>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inventoryStats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">Beans below threshold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inventoryStats.outOfStockCount}</div>
              <p className="text-xs text-muted-foreground">Beans to reorder</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${inventoryStats.totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Current stock value</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Current Stock</h2>
          
          {inventoryStats.stats.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No coffee beans in inventory</p>
                <Button onClick={() => navigate("/coffee-beans")}>Add Coffee Beans</Button>
              </CardContent>
            </Card>
          ) : (
            inventoryStats.stats.map(({ bean, totalStock, totalOriginal, activeBatches, isLowStock, isOutOfStock, threshold }) => {
              const stockPercentage = totalOriginal > 0 ? (totalStock / totalOriginal) * 100 : 0;
              
              return (
                <Card key={bean.id} className={`${isOutOfStock ? 'border-destructive' : isLowStock ? 'border-amber-500' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{bean.name}</CardTitle>
                          {isOutOfStock && (
                            <Badge variant="destructive">Out of Stock</Badge>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <Badge variant="outline" className="border-amber-500 text-amber-500">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{bean.roaster} • {bean.country}</CardDescription>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current Stock</span>
                            <span className="font-semibold">{totalStock}g / {totalOriginal}g</span>
                          </div>
                          <Progress value={stockPercentage} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Active Batches: {activeBatches}</span>
                            <span>Alert Threshold: {threshold}g</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openThresholdDialog(bean)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Purchase History</h4>
                      
                      {bean.batches.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No purchase history</p>
                      ) : (
                        <div className="space-y-2">
                          {bean.batches.map((batch) => (
                            <div 
                              key={batch.id} 
                              className={`p-3 rounded-lg border ${batch.isActive ? 'bg-accent/50' : 'bg-muted/50'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={batch.isActive ? "default" : "secondary"} className="text-xs">
                                      {batch.isActive ? "Active" : "Depleted"}
                                    </Badge>
                                    <span className="text-sm font-medium">
                                      {batch.currentWeight}g / {batch.weight}g remaining
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Purchased: {new Date(batch.purchaseDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Roasted: {new Date(batch.roastDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      ${batch.price.toFixed(2)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <TrendingDown className="h-3 w-3" />
                                      ${(batch.price / batch.weight * 1000).toFixed(2)}/kg
                                    </div>
                                  </div>
                                  {batch.notes && (
                                    <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                                      {batch.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openUpdateWeightDialog(bean, batch)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Update Remaining
                                  </Button>
                                  {batch.isActive && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openUsageDialog(bean, batch)}
                                    >
                                      <TrendingDown className="h-4 w-4 mr-1" />
                                      Record Usage
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Threshold Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Low Stock Threshold</DialogTitle>
              <DialogDescription>
                {selectedBean && `Configure the low stock alert threshold for ${selectedBean.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold (grams)</Label>
                <Input
                  id="threshold"
                  type="number"
                  placeholder="100"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You'll be alerted when stock falls below this amount
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => selectedBean && handleUpdateThreshold(selectedBean)}>
                Save Threshold
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Usage Dialog */}
        <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Usage</DialogTitle>
              <DialogDescription>
                {selectedBean && editingBatch && (
                  <>Record how much coffee was used from this batch ({editingBatch.currentWeight}g available)</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="usage">Amount Used (grams)</Label>
                <Input
                  id="usage"
                  type="number"
                  placeholder="18"
                  value={usageAmount}
                  onChange={(e) => setUsageAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Pour over brew, espresso shots..."
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordUsage}>
                Record Usage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Remaining Dialog */}
        <Dialog open={updateWeightDialogOpen} onOpenChange={setUpdateWeightDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Remaining Weight</DialogTitle>
              <DialogDescription>
                {selectedBean && editingBatch && (
                  <>Set the current remaining weight for this batch (original: {editingBatch.weight}g)</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newWeight">Remaining Weight (grams)</Label>
                <Input
                  id="newWeight"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the actual remaining weight of coffee in this batch
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateWeightDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateWeight}>
                Update Remaining
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
