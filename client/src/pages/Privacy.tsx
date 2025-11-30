import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <p className="text-muted-foreground text-sm">Last updated: November 2024</p>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">1. Information We Collect</h3>
              <p className="text-sm text-muted-foreground">
                We collect information you provide directly to us, including your name, email address, 
                and brewing data (equipment, recipes, and brew logs) that you enter into the application.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">2. How We Use Your Information</h3>
              <p className="text-sm text-muted-foreground">
                Your data is used solely for the purpose of providing and improving the Brew Journal 
                application. We do not sell, share, or use your personal information for any purpose 
                other than operating this application.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">3. Data Storage</h3>
              <p className="text-sm text-muted-foreground">
                Your data is stored securely and is only accessible to you through your account. 
                We implement appropriate security measures to protect your personal information.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">4. Cookies</h3>
              <p className="text-sm text-muted-foreground">
                We use essential cookies and local storage to maintain your session and remember 
                your preferences. These are necessary for the application to function properly.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">5. Third-Party Services</h3>
              <p className="text-sm text-muted-foreground">
                If you choose to sign in with Google, we receive basic profile information 
                (name, email, profile picture) from Google. This information is used only for 
                authentication and account creation.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">6. Your Rights</h3>
              <p className="text-sm text-muted-foreground">
                You have the right to access, update, or delete your personal data at any time 
                through the application settings.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold mt-4 mb-2">7. Contact</h3>
              <p className="text-sm text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us through 
                the application.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
