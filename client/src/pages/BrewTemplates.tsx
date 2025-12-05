import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, GUEST_LIMITS } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Trash2, FileText, GripVertical, Copy } from "lucide-react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { BrewTemplate, BrewTemplateField } from "@/contexts/AppContext";

export default function BrewTemplates() {
  const { brewTemplates, addBrewTemplate, updateBrewTemplate, deleteBrewTemplate, isGuest, guestLimitReached } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BrewTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [templateName, setTemplateName] = useState("");
  const [fields, setFields] = useState<BrewTemplateField[]>([]);
  const [editingField, setEditingField] = useState<BrewTemplateField | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [adminTemplates, setAdminTemplates] = useState<BrewTemplate[]>([]);
  const [showAdminPicker, setShowAdminPicker] = useState(false);

  useEffect(() => {
    api.admin.getBrewTemplates().then(setAdminTemplates).catch(() => setAdminTemplates([]));
  }, []);

  const handleAdd = () => {
    if (guestLimitReached("templates")) {
      toast({
        title: "Guest Limit Reached",
        description: `Guest users can only add ${GUEST_LIMITS.templates} brew templates. Sign up for unlimited access.`,
        variant: "destructive",
      });
      return;
    }
    setEditingTemplate(null);
    setTemplateName("");
    setFields([]);
    setShowAdminPicker(false);
    setDialogOpen(true);
  };

  const handleCopyFromAdmin = (adminTemplate: BrewTemplate) => {
    setTemplateName(adminTemplate.name);
    setFields([...adminTemplate.fields.map(f => ({ ...f, id: Date.now().toString() + Math.random() }))]);
    setShowAdminPicker(false);
    toast({ title: "Copied", description: `Copied "${adminTemplate.name}" template` });
  };

  const handleEdit = (template: BrewTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setFields([...template.fields]);
    setDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "At least one field required",
        description: "Please add at least one field to the template",
        variant: "destructive",
      });
      return;
    }

    const templateData = { name: templateName, fields };

    if (editingTemplate) {
      updateBrewTemplate(editingTemplate.id, templateData);
      toast({
        title: "Template updated",
        description: "Brew template has been updated successfully",
      });
    } else {
      addBrewTemplate(templateData);
      toast({
        title: "Template created",
        description: "Brew template has been created successfully",
      });
    }

    setDialogOpen(false);
    setTemplateName("");
    setFields([]);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBrewTemplate(id);
      setDeleteId(null);
      toast({
        title: "Template deleted",
        description: "Brew template has been removed successfully",
      });
    } catch (error) {
      setDeleteId(null);
      toast({
        title: "Cannot delete",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: BrewTemplateField) => {
    setEditingField(field);
    setFieldDialogOpen(true);
  };

  const handleSaveField = (field: BrewTemplateField) => {
    if (editingField) {
      setFields(fields.map(f => f.id === editingField.id ? field : f));
    } else {
      setFields([...fields, { ...field, id: Date.now().toString() }]);
    }
    setFieldDialogOpen(false);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Brew Note Templates</h1>
          </div>
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Custom Observation Fields</CardTitle>
            <CardDescription>
              Create templates with custom fields to track specific observations during brewing
            </CardDescription>
          </CardHeader>
        </Card>

        {brewTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No brew templates created yet</p>
              <Button onClick={handleAdd}>Create Your First Template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {brewTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {template.fields.map((field) => (
                            <div
                              key={field.id}
                              className="px-2 py-1 bg-muted rounded text-xs"
                            >
                              {field.label} ({field.type})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Template Editor Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                Add custom fields to track specific observations during brewing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!editingTemplate && adminTemplates.length > 0 && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAdminPicker(!showAdminPicker)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy from templates
                  </Button>
                  {showAdminPicker && (
                    <div className="border rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto bg-muted/50">
                      {adminTemplates.map((at) => (
                        <Button
                          key={at.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleCopyFromAdmin(at)}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="truncate">
                              <span className="font-medium">{at.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({at.fields.length} field{at.fields.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="e.g., Espresso Dialing, Pour Over Notes"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fields</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddField}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    No fields added yet. Click "Add Field" to create your first field.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{field.label}</div>
                          <div className="text-xs text-muted-foreground">
                            Type: {field.type} • {field.required ? 'Required' : 'Optional'}
                            {field.type === 'select' && field.options && (
                              <> • Options: {field.options.join(', ')}</>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditField(field)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Field Editor Dialog */}
        <FieldEditorDialog
          open={fieldDialogOpen}
          onOpenChange={setFieldDialogOpen}
          field={editingField}
          onSave={handleSaveField}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Field Editor Dialog Component
function FieldEditorDialog({
  open,
  onOpenChange,
  field,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: BrewTemplateField | null;
  onSave: (field: BrewTemplateField) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"text" | "number" | "rating" | "select">("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const { toast } = useToast();

  useState(() => {
    if (field) {
      setLabel(field.label);
      setType(field.type);
      setRequired(field.required);
      setOptions(field.options?.join(", ") || "");
    } else {
      setLabel("");
      setType("text");
      setRequired(false);
      setOptions("");
    }
  });

  const handleSave = () => {
    if (!label.trim()) {
      toast({
        title: "Field label required",
        description: "Please enter a label for the field",
        variant: "destructive",
      });
      return;
    }

    if (type === "select" && !options.trim()) {
      toast({
        title: "Options required",
        description: "Please enter options for the select field",
        variant: "destructive",
      });
      return;
    }

    const fieldData: BrewTemplateField = {
      id: field?.id || "",
      label: label.trim(),
      type,
      required,
      ...(type === "select" && {
        options: options.split(",").map(opt => opt.trim()).filter(Boolean),
      }),
    };

    onSave(fieldData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? "Edit Field" : "Add Field"}</DialogTitle>
          <DialogDescription>
            Configure the field properties for your brew notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fieldLabel">Field Label</Label>
            <Input
              id="fieldLabel"
              placeholder="e.g., Bloom Time, First Crack"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fieldType">Field Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger id="fieldType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="rating">Rating (1-5)</SelectItem>
                <SelectItem value="select">Select (Dropdown)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "select" && (
            <div className="space-y-2">
              <Label htmlFor="fieldOptions">Options (comma-separated)</Label>
              <Input
                id="fieldOptions"
                placeholder="e.g., Light, Medium, Dark"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter options separated by commas
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="fieldRequired"
              checked={required}
              onCheckedChange={setRequired}
            />
            <Label htmlFor="fieldRequired">Required field</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {field ? "Update" : "Add"} Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
