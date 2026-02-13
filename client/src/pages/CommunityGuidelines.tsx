import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CommunityGuidelines() {
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

        <h1 className="text-3xl font-bold mb-2">Community Guidelines</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: February 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Welcome to MojiTax Connect
            </h2>
            <p>
              MojiTax Connect is a community platform for MojiTax members to
              connect, share knowledge, and support one another. To keep this a
              welcoming and productive space for everyone, we ask all members to
              follow these guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              1. Be Respectful
            </h2>
            <p>
              Treat all community members with courtesy and respect. We welcome
              diverse perspectives and experiences. Personal attacks,
              harassment, bullying, or discriminatory language of any kind will
              not be tolerated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              2. Keep Conversations Relevant
            </h2>
            <p>
              Post messages in the appropriate channels. Each channel has a
              specific topic or purpose — please stay on topic to help everyone
              find the information they need. Use the General channel for
              off-topic or casual conversations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              3. No Professional Advice
            </h2>
            <p>
              While members may share general knowledge and experiences,
              community discussions do not constitute professional tax, legal,
              or financial advice. For personalised guidance, please consult
              directly with your MojiTax advisor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              4. Protect Privacy
            </h2>
            <p>
              Do not share personal or sensitive information — yours or anyone
              else&apos;s — in public channels. This includes tax reference
              numbers, financial details, addresses, or any other confidential
              data. If you need to share sensitive information, use the support
              chat to speak with a MojiTax team member directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              5. No Spam or Self-Promotion
            </h2>
            <p>
              Do not use the platform for advertising, unsolicited promotion, or
              spam. This includes posting repetitive messages, links to external
              products or services, or any form of commercial solicitation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              6. No Harmful Content
            </h2>
            <p>
              Do not post content that is illegal, defamatory, obscene,
              threatening, or otherwise harmful. This includes sharing malware,
              phishing links, or any material that could compromise the safety
              or security of other members.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              7. Use @moji Responsibly
            </h2>
            <p>
              Our AI assistant @moji is here to help answer questions about
              MojiTax services. Please use it in good faith and remember that
              @moji provides general information — not personalised tax advice.
              If @moji cannot help, it will connect you with a human team
              member.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              8. Report Concerns
            </h2>
            <p>
              If you encounter behaviour that violates these guidelines or makes
              you feel uncomfortable, please report it through the support chat.
              Our team will review all reports promptly and take appropriate
              action.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              9. Moderation
            </h2>
            <p>
              MojiTax administrators reserve the right to remove any content and
              suspend any account that violates these guidelines. Depending on
              the severity, actions may include:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>A warning from the moderation team</li>
              <li>Temporary suspension of your account</li>
              <li>Permanent removal from the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              10. Contact
            </h2>
            <p>
              If you have questions about these guidelines, please contact us at{" "}
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
