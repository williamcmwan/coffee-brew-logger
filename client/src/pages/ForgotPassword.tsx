import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      toast({ title: "Please complete the CAPTCHA", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.auth.forgotPassword(email.trim());
      setSubmitted(true);
      // In development, show the reset link if provided
      if (response.resetLink) {
        setResetLink(response.resetLink);
      }
      toast({ title: "Check your email", description: response.message });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Coffee className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            {submitted ? "Check your email for a reset link" : "Enter your email to receive a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
              </div>
              {RECAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setCaptchaToken} />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || (!!RECAPTCHA_SITE_KEY && !captchaToken)}>{isLoading ? "Sending..." : "Send Reset Link"}</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If an account exists with that email, you'll receive a password reset link shortly.
              </p>
              {resetLink && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Development mode - Reset link:</p>
                  <a href={resetLink} className="text-sm text-primary hover:underline break-all">{resetLink}</a>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => { setSubmitted(false); setEmail(""); setResetLink(null); setCaptchaToken(null); recaptchaRef.current?.reset(); }}>
                Try another email
              </Button>
            </div>
          )}
          <div className="text-center">
            <button type="button" onClick={() => navigate("/login")} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
