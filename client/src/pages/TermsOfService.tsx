import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
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

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: February 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using MojiTax Connect (&quot;the Platform&quot;),
              operated by MojiTax Ltd, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the
              Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years of age and a registered MojiTax
              customer to use this Platform. By using the Platform, you
              represent and warrant that you meet these eligibility
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              3. Account Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You agree to notify us immediately of any unauthorised
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                Post content that is unlawful, defamatory, or infringes on
                intellectual property rights
              </li>
              <li>
                Use the Platform to distribute spam, malware, or other harmful
                content
              </li>
              <li>
                Attempt to gain unauthorised access to other accounts or
                Platform systems
              </li>
              <li>
                Share confidential tax advice received through the Platform with
                third parties
              </li>
              <li>
                Use the Platform for any purpose other than its intended use
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              5. Intellectual Property
            </h2>
            <p>
              All content, features, and functionality of the Platform are owned
              by MojiTax Ltd and are protected by copyright, trademark, and
              other intellectual property laws. You may not reproduce,
              distribute, or create derivative works without our express written
              consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              6. Limitation of Liability
            </h2>
            <p>
              The Platform is provided &quot;as is&quot; without warranties of
              any kind. MojiTax Ltd shall not be liable for any indirect,
              incidental, or consequential damages arising from your use of the
              Platform. Content shared on the Platform does not constitute
              professional tax advice unless explicitly stated by a qualified
              MojiTax advisor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              7. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account at any
              time for violation of these terms or for any other reason at our
              discretion. Upon termination, your right to use the Platform will
              immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              8. Governing Law
            </h2>
            <p>
              These terms shall be governed by and construed in accordance with
              the laws of England and Wales. Any disputes arising from these
              terms shall be subject to the exclusive jurisdiction of the courts
              of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              9. Contact
            </h2>
            <p>
              If you have questions about these Terms of Service, please contact
              us at{" "}
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
