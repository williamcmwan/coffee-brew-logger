import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { uploadImage, deleteImage, validateImageFile } from "@/lib/imageUtils";
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with value prop when it changes externally
  useEffect(() => {
    setPreview(value || "");
  }, [value]);

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
      const url = await uploadImage(file);
      setPreview(url);
      onChange(url);
      toast({
        title: "Image uploaded",
        description: "Your image has been successfully uploaded.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    // Delete from server if it's an uploaded file
    if (preview && preview.startsWith('/uploads/')) {
      try {
        await deleteImage(preview);
      } catch (e) {
        // Ignore delete errors
      }
    }
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
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
      const url = await uploadImage(file);
      setPreview(url);
      onChange(url);
      toast({
        title: "Image uploaded",
        description: "Your image has been successfully uploaded.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      
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
        
        <div 
          className={`relative w-full h-24 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors cursor-pointer overflow-hidden ${
            isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-border bg-muted/20'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="relative z-10 flex items-center gap-2">
                <p className="text-sm text-foreground font-medium">
                  {isDragging ? 'Drop to replace' : 'Drop or click to replace'}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isDragging ? 'Drop image here' : 'Drag & drop image here'}
            </p>
          )}
        </div>
      </div>

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
