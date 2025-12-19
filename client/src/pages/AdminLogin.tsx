import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleAdminLogin = () => {
    setIsLoggingIn(true);
    // Placeholder: In production, this would validate admin credentials
    // For now, we'll just set a simple flag in localStorage
    localStorage.setItem("admin_session", "true");
    
    // Redirect to admin area after brief delay
    setTimeout(() => {
      setLocation("/admin");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6" />
              MojiTax Connect
            </CardTitle>
            <CardDescription className="mt-2">Admin Access</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Administrative access to MojiTax Connect platform.</p>
            <p className="mt-2">Click below to enter the admin area.</p>
          </div>
          
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleAdminLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Logging in..." : "Enter Admin Area"}
          </Button>

          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => setLocation("/")}
              className="text-sm"
            >
              ← Back to Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
