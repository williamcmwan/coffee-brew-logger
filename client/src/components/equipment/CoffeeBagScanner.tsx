import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, Upload, X, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { compressImage, validateImageFile } from "@/lib/imageUtils";

interface CoffeeBagScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (data: {
    name: string;
    roaster: string;
    country: string;
    region: string;
    altitude: string;
    varietal: string;
    process: string;
    roastLevel: string;
    roastFor: string;
    tastingNotes: string;
    url: string;
    photo: string;
    roastDate: string;
    weight: number;
  }) => void;
}

export function CoffeeBagScanner({ open, onOpenChange, onScanComplete }: CoffeeBagScannerProps) {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const frontCameraRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (img: string | null) => void
  ) => {
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

    try {
      const compressed = await compressImage(file, 1024, 1024, 0.85);
      setImage(compressed);
    } catch {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async () => {
    if (!frontImage && !backImage) {
      toast({
        title: "No images",
        description: "Please add at least one photo of the coffee bag",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Resize images to 768x768 for API (good balance of quality vs tokens)
      const resizeForApi = async (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            // Use 768x768 - good for text recognition while minimizing tokens
            const size = 768;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Fill with white background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, size, size);
              // Calculate scaling to fit image in square while maintaining aspect ratio
              const scale = Math.min(size / img.width, size / img.height);
              const x = (size - img.width * scale) / 2;
              const y = (size - img.height * scale) / 2;
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(dataUrl);
            }
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
      };

      const images: string[] = [];
      if (frontImage) images.push(await resizeForApi(frontImage));
      if (backImage) images.push(await resizeForApi(backImage));

      const result = await api.ai.analyzeCoffeeBag(images);
      
      toast({
        title: "Scan complete",
        description: "Coffee bag information extracted successfully",
      });
      
      // Include the first image as the bean photo
      onScanComplete({
        ...result,
        photo: frontImage || backImage || "",
      });
      onOpenChange(false);
      resetImages();
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze coffee bag",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetImages = () => {
    setFrontImage(null);
    setBackImage(null);
    if (frontInputRef.current) frontInputRef.current.value = "";
    if (backInputRef.current) backInputRef.current.value = "";
    if (frontCameraRef.current) frontCameraRef.current.value = "";
    if (backCameraRef.current) backCameraRef.current.value = "";
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      onOpenChange(false);
      resetImages();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Scan Coffee Bag
          </DialogTitle>
          <DialogDescription>
            Take photos of the front and back of your coffee bag to automatically extract information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Front Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Front of Bag</label>
            {frontImage ? (
              <div className="relative">
                <img
                  src={frontImage}
                  alt="Front of coffee bag"
                  className="w-full h-40 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setFrontImage(null)}
                  disabled={isAnalyzing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => frontInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => frontCameraRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
              </div>
            )}
          </div>

          {/* Back Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Back of Bag (optional)</label>
            {backImage ? (
              <div className="relative">
                <img
                  src={backImage}
                  alt="Back of coffee bag"
                  className="w-full h-40 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setBackImage(null)}
                  disabled={isAnalyzing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backCameraRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
              </div>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={frontInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, setFrontImage)}
            className="hidden"
          />
          <input
            ref={frontCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleImageSelect(e, setFrontImage)}
            className="hidden"
          />
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, setBackImage)}
            className="hidden"
          />
          <input
            ref={backCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleImageSelect(e, setBackImage)}
            className="hidden"
          />

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isAnalyzing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!frontImage && !backImage)}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
