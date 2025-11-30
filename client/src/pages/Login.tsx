import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setAuthToken } from "@/lib/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
  const { login, signup, user } = useApp();
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
      localStorage.setItem("user", JSON.stringify({ id: 0 }));
      window.location.href = "/dashboard";
    }
  }, [searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = () => {
    setSocialLoading("google");
    window.location.href = "/api/auth/google";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        toast({ title: "Welcome back!", description: "You have successfully logged in" });
      } else {
        if (!name.trim()) throw new Error("Please enter your name");
        await signup(email.trim(), password, name.trim());
        toast({ title: "Account created!", description: "Welcome to your brew journal" });
      }
      window.location.href = "/dashboard";
    } catch (error) {
      toast({ title: isLogin ? "Login failed" : "Sign up failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const isAnyLoading = isLoading || socialLoading !== null;

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
            <Button type="submit" className="w-full" disabled={isAnyLoading}>{isLoading ? "Please wait..." : (isLogin ? "Sign in" : "Sign up")}</Button>
          </form>
          <div className="text-center text-sm">
            <button type="button" onClick={() => { setIsLogin(!isLogin); setEmail(""); setPassword(""); setName(""); }} className="text-primary hover:underline" disabled={isAnyLoading}>
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
