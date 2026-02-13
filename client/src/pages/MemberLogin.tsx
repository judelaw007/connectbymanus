import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

type LoginStep = "email" | "code";

export default function MemberLogin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestCodeMutation = trpc.memberAuth.requestCode.useMutation({
    onSuccess: data => {
      setStep("code");
      setSuccess(data.message);
      setError(null);
      if (data.testNote) {
        // In test mode, show where the email went
        setSuccess(`${data.message} ${data.testNote}`);
      }
    },
    onError: err => {
      setError(err.message || "Failed to send verification code");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const verifyCodeMutation = trpc.memberAuth.verifyCode.useMutation({
    onSuccess: () => {
      setSuccess("Login successful! Redirecting...");
      setError(null);
      // Give a moment for the cookie to be set, then redirect
      setTimeout(() => {
        setLocation("/");
        window.location.reload(); // Refresh to pick up the new session
      }, 500);
    },
    onError: err => {
      setError(err.message || "Invalid verification code");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    requestCodeMutation.mutate({ email: email.trim().toLowerCase() });
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    verifyCodeMutation.mutate({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    });
  };

  const handleBack = () => {
    setStep("email");
    setCode("");
    setError(null);
    setSuccess(null);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 6 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img
              src="/mojitax-logo.png"
              alt="MojiTax"
              className="h-24 w-auto mx-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">MojiTax Connect</CardTitle>
            <CardDescription className="mt-2">Member Sign In</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Your Learnworlds Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the email address registered with your MojiTax Learnworlds
                  account.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setLocation("/")}
                  className="text-sm"
                >
                  Back to Connect
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="text-center text-sm text-muted-foreground mb-4">
                We sent a verification code to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={handleCodeChange}
                    required
                    disabled={isLoading}
                    autoComplete="one-time-code"
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your email. Code expires in 10
                  minutes.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verify & Sign In
                  </>
                )}
              </Button>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleBack}
                  className="text-sm"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Use different email
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setIsLoading(true);
                    setError(null);
                    setSuccess(null);
                    setCode("");
                    requestCodeMutation.mutate({
                      email: email.trim().toLowerCase(),
                    });
                  }}
                  className="text-sm"
                  disabled={isLoading}
                >
                  Resend code
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>Not a member yet?</p>
            <a
              href="https://mojitax.learnworlds.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Join MojiTax on Learnworlds
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
