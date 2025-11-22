import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { compressImage, validateImageFile } from "@/lib/imageUtils";
import { toast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  className?: string;
}

export default function ImageUpload({ value, onChange, label = "Photo", className = "" }: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(value || "");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid image",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
      onChange(compressed);
      toast({
        title: "Image uploaded",
        description: "Your image has been successfully uploaded.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isLoading ? "Processing..." : "Upload"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isLoading}
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              {isLoading ? "Processing..." : "Camera"}
            </Button>
          </div>
          
          <div className="w-full h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
            <p className="text-sm text-muted-foreground">No image selected</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
