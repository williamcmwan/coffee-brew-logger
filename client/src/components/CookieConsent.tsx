import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  // Add/remove body padding when banner is shown/hidden
  useEffect(() => {
    if (showBanner) {
      document.body.style.paddingBottom = "100px";
    } else {
      document.body.style.paddingBottom = "";
    }
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [showBanner]);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg">
      <div className="container max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          We use cookies to enhance your experience. By continuing to use this app, you agree to our{" "}
          <Link to="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
        <Button onClick={handleAccept} size="sm" className="shrink-0">
          Accept
        </Button>
      </div>
    </div>
  );
}
