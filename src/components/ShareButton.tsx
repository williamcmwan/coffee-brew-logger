import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Share2, 
  Copy, 
  Twitter, 
  Facebook, 
  MessageCircle,
  Send
} from "lucide-react";
import {
  canShare,
  nativeShare,
  copyToClipboard,
  shareToTwitter,
  shareToFacebook,
  shareToWhatsApp,
  shareToTelegram,
} from "@/lib/shareUtils";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  text: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({ title, text, variant = "outline", size = "sm" }: ShareButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleNativeShare = async () => {
    try {
      await nativeShare({ title, text });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share using native sharing",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(text);
    setIsOpen(false);
  };

  const handleTwitter = () => {
    shareToTwitter(text);
    setIsOpen(false);
  };

  const handleFacebook = () => {
    shareToFacebook();
    setIsOpen(false);
  };

  const handleWhatsApp = () => {
    shareToWhatsApp(text);
    setIsOpen(false);
  };

  const handleTelegram = () => {
    shareToTelegram(text);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
        <DropdownMenuLabel>Share via</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {canShare() && (
          <>
            <DropdownMenuItem onClick={handleNativeShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Native Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleTwitter}>
          <Twitter className="h-4 w-4 mr-2" />
          Twitter / X
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleFacebook}>
          <Facebook className="h-4 w-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleTelegram}>
          <Send className="h-4 w-4 mr-2" />
          Telegram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
