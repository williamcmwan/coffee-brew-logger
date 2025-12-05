import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setAuthToken, api } from "@/lib/api";
import ReCAPTCHA from "react-google-recaptcha";
import { GuestMigrationDialog } from "@/components/GuestMigrationDialog";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [isNewAccountForMigration, setIsNewAccountForMigration] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { login, signup, guestLogin, user } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    if (error) {
      toast({ title: "Sign-in failed", description: error.replace(/_/g, " "), variant: "destructive" });
      setSearchParams({});
      return;
    }
    if (token) {
      setAuthToken(token);
      // Fetch full user info including isAdmin
      api.auth.getCurrentUser().then(userData => {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("userId", String(userData.id));
        // Check for guest data migration after Google OAuth
        const guestDeviceId = localStorage.getItem("guestDeviceId");
        if (guestDeviceId) {
          api.auth.getGuestData(guestDeviceId).then(guestData => {
            if (guestData.exists && guestData.counts) {
              const totalItems = Object.values(guestData.counts).reduce((a, b) => a + b, 0);
              if (totalItems > 0) {
                setIsNewAccountForMigration(false);
                setShowMigrationDialog(true);
                setPendingRedirect(true);
                setSearchParams({});
                return;
              }
            }
            localStorage.removeItem("guestDeviceId");
            window.location.href = "/dashboard";
          }).catch(() => {
            localStorage.removeItem("guestDeviceId");
            window.location.href = "/dashboard";
          });
        } else {
          window.location.href = "/dashboard";
        }
      }).catch(() => {
        // Fallback if getCurrentUser fails
        localStorage.setItem("user", JSON.stringify({ id: 0 }));
        window.location.href = "/dashboard";
      });
    }
  }, [searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = () => {
    setSocialLoading("google");
    window.location.href = "/api/auth/google";
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await guestLogin();
      toast({ title: "Welcome!", description: "You're using the app as a guest with limited features" });
      window.location.href = "/dashboard";
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to continue as guest", variant: "destructive" });
      setGuestLoading(false);
    }
  };

  const checkGuestDataAndProceed = async (isNewAccount: boolean) => {
    const guestDeviceId = localStorage.getItem("guestDeviceId");
    if (guestDeviceId) {
      try {
        const guestData = await api.auth.getGuestData(guestDeviceId);
        if (guestData.exists && guestData.counts) {
          const totalItems = Object.values(guestData.counts).reduce((a, b) => a + b, 0);
          if (totalItems > 0) {
            setIsNewAccountForMigration(isNewAccount);
            setShowMigrationDialog(true);
            setPendingRedirect(true);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to check guest data:", e);
      }
      localStorage.removeItem("guestDeviceId");
    }
    window.location.href = "/dashboard";
  };

  const handleMigrate = async () => {
    const guestDeviceId = localStorage.getItem("guestDeviceId");
    if (guestDeviceId) {
      await api.auth.migrateGuest(guestDeviceId);
      toast({ title: "Success", description: "Your guest data has been migrated to your account" });
    }
  };

  const handleMigrationComplete = () => {
    if (pendingRedirect) {
      window.location.href = "/dashboard";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require CAPTCHA for signup only
    if (!isLogin && RECAPTCHA_SITE_KEY && !captchaToken) {
      toast({ title: "Please complete the CAPTCHA", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        toast({ title: "Welcome back!", description: "You have successfully logged in" });
        await checkGuestDataAndProceed(false);
      } else {
        if (!name.trim()) throw new Error("Please enter your name");
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        await signup(email.trim(), password, confirmPassword, name.trim());
        toast({ title: "Account created!", description: "Welcome to your brew journal" });
        await checkGuestDataAndProceed(true);
      }
    } catch (error) {
      toast({ title: isLogin ? "Login failed" : "Sign up failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
      setIsLoading(false);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  const isAnyLoading = isLoading || socialLoading !== null || guestLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Coffee className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{isLogin ? "Welcome back" : "Create account"}</CardTitle>
          <CardDescription>{isLogin ? "Enter your credentials to access your brew journal" : "Sign up to start tracking your perfect brews"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full h-[44px]" onClick={handleGuestLogin} disabled={isAnyLoading}>
            {guestLoading ? "Please wait..." : (
              <span className="flex items-center">
                <Coffee className="mr-2 h-4 w-4" />
                Continue Without Signing In
              </span>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground -mt-2">
            Guest mode has limited features (max 2 items per category)
          </p>
          {GOOGLE_CLIENT_ID && (
            <Button variant="outline" className="w-full h-[44px]" onClick={handleGoogleSignIn} disabled={isAnyLoading}>
              {socialLoading === "google" ? "Redirecting to Google..." : (
                <span className="flex items-center">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </span>
              )}
            </Button>
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with email</span></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isAnyLoading} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isAnyLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isAnyLoading} />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="********" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isAnyLoading} />
              </div>
            )}
            {!isLogin && RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setCaptchaToken} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isAnyLoading || (!isLogin && !!RECAPTCHA_SITE_KEY && !captchaToken)}>{isLoading ? "Please wait..." : (isLogin ? "Sign in" : "Sign up")}</Button>
          </form>
          <div className="text-center text-sm space-y-2">
            {isLogin && (
              <button type="button" onClick={() => navigate("/forgot-password")} className="text-muted-foreground hover:text-primary hover:underline block w-full" disabled={isAnyLoading}>
                Forgot your password?
              </button>
            )}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setEmail(""); setPassword(""); setConfirmPassword(""); setName(""); setCaptchaToken(null); recaptchaRef.current?.reset(); }} className="text-primary hover:underline" disabled={isAnyLoading}>
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>

      <GuestMigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
        isNewAccount={isNewAccountForMigration}
        onMigrate={handleMigrate}
        onSkip={handleMigrationComplete}
      />
    </div>
  );
}
