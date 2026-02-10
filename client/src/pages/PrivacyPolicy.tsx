import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: February 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              1. Introduction
            </h2>
            <p>
              MojiTax Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
              operates MojiTax Connect. This Privacy Policy explains how we
              collect, use, and protect your personal information when you use
              our Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              2. Information We Collect
            </h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                <strong>Account information:</strong> Name, email address, and
                login credentials provided during registration
              </li>
              <li>
                <strong>Usage data:</strong> Messages sent, channels joined, and
                interaction patterns on the Platform
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type,
                device information, and cookies
              </li>
              <li>
                <strong>Support data:</strong> Information provided through
                support tickets and conversations with our team
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              3. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Provide and maintain the Platform</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Send you service-related communications and notifications</li>
              <li>Respond to your support requests</li>
              <li>Improve the Platform and develop new features</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              4. Data Sharing
            </h2>
            <p>
              We do not sell your personal information. We may share your data
              with:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                Service providers who help us operate the Platform (e.g.
                hosting, email delivery)
              </li>
              <li>
                Law enforcement or regulatory authorities when required by law
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              5. Cookies
            </h2>
            <p>
              We use essential cookies to maintain your session and authenticate
              your account. These cookies are strictly necessary for the
              Platform to function and cannot be disabled.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              6. Data Security
            </h2>
            <p>
              We implement appropriate technical and organisational measures to
              protect your personal data, including encryption, secure hosting,
              and access controls. However, no method of transmission over the
              Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              7. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is active
              or as needed to provide you services. We may also retain data as
              necessary to comply with legal obligations, resolve disputes, and
              enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              8. Your Rights
            </h2>
            <p>
              Under UK data protection law (UK GDPR), you have the right to:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Request data portability</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, please contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              9. Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or wish to
              exercise your data rights, please contact us at{" "}
              <a
                href="mailto:support@mojitax.co.uk"
                className="text-primary hover:underline"
              >
                support@mojitax.co.uk
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
