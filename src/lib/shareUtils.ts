import { toast } from "@/hooks/use-toast";
import type { Recipe, Brew, CoffeeBean } from "@/contexts/AppContext";

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

// Check if Web Share API is supported
export const canShare = () => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

// Native share using Web Share API
export const nativeShare = async (data: ShareData) => {
  if (!canShare()) {
    throw new Error('Web Share API is not supported');
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // User cancelled, don't show error
      return false;
    }
    throw error;
  }
};

// Copy to clipboard
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Share text has been copied to your clipboard",
    });
    return true;
  } catch (error) {
    toast({
      title: "Copy failed",
      description: "Could not copy to clipboard",
      variant: "destructive",
    });
    return false;
  }
};

// Generate recipe share text
export const generateRecipeShareText = (
  recipe: Recipe,
  grinderName: string,
  brewerName: string
) => {
  return `☕ ${recipe.name}

📋 Recipe Details:
• Grinder: ${grinderName}
• Brewer: ${brewerName}
• Dose: ${recipe.dose}g
• Water: ${recipe.water}g
• Ratio: ${recipe.ratio}
• Grind: ${recipe.grindSize}
• Temp: ${recipe.temperature}°C
• Time: ${recipe.brewTime}

#Coffee #BrewRecipe #Specialty`;
};

// Generate brew result share text
export const generateBrewShareText = (
  brew: Brew,
  beanName: string,
  grinderName: string,
  brewerName: string,
  recipeName: string
) => {
  const ratingStars = brew.rating ? '⭐'.repeat(brew.rating) : '';
  
  let text = `☕ Coffee Brew Session

📅 ${new Date(brew.date).toLocaleDateString()}
🫘 ${beanName}
${ratingStars} ${brew.rating ? `${brew.rating}/5` : ''}

🔧 Equipment:
• Grinder: ${grinderName}
• Brewer: ${brewerName}
• Recipe: ${recipeName}

📊 Parameters:
• Dose: ${brew.dose}g
• Water: ${brew.water}g
• Yield: ${brew.yield}g
• Grind: ${brew.grindSize}
• Temp: ${brew.temperature}°C
• Time: ${brew.brewTime}`;

  if (brew.tds !== undefined) {
    text += `\n• TDS: ${brew.tds.toFixed(2)}%`;
  }
  
  if (brew.extractionYield !== undefined) {
    text += `\n• EY: ${brew.extractionYield.toFixed(2)}%`;
  }

  if (brew.comment) {
    text += `\n\n💭 Notes: ${brew.comment}`;
  }

  text += '\n\n#Coffee #Brewing #Specialty';

  return text;
};

// Share to Twitter
export const shareToTwitter = (text: string) => {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'width=550,height=420');
};

// Share to Facebook
export const shareToFacebook = (url?: string) => {
  const shareUrl = url || window.location.href;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  window.open(facebookUrl, '_blank', 'width=550,height=420');
};

// Share to WhatsApp
export const shareToWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

// Share to Telegram
export const shareToTelegram = (text: string) => {
  const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};
