import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      toast({ title: "Success", description: "Your password has been reset" });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Invalid or missing reset token.</p>
            <Button onClick={() => navigate("/forgot-password")}>Request New Reset Link</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              {success ? <CheckCircle className="h-8 w-8 text-green-500" /> : <Coffee className="h-8 w-8 text-primary" />}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{success ? "Password Reset!" : "Set New Password"}</CardTitle>
          <CardDescription>{success ? "You can now log in with your new password" : "Enter your new password below"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="********" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="********" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} disabled={isLoading} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Resetting..." : "Reset Password"}</Button>
            </form>
          ) : (
            <Button className="w-full" onClick={() => navigate("/login")}>Go to Login</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
