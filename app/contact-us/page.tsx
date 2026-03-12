import { ContentPage } from "@/components/content-page";

export default function ContactUsPage() {
  return (
    <ContentPage
      eyebrow="Contact"
      title="Contact Us"
      intro="Questions, support requests, or partnership inquiries can be sent through the channels below. Keep messages concise and include any context needed to reproduce an issue."
      sections={[
        {
          heading: "Support",
          body: [
            "For product questions or technical issues, contact support@tempmail.local with the inbox address and a short description of the problem.",
            "If a message fails to load, include the approximate send time and whether the issue affects HTML, plain text, or attachments."
          ]
        },
        {
          heading: "Business",
          body: [
            "For partnerships, integrations, or deployment requests, contact hello@tempmail.local.",
            "Include expected volume, intended use case, and any security or compliance requirements."
          ]
        },
        {
          heading: "Response Times",
          body: [
            "General inquiries are typically reviewed within two business days.",
            "Critical service-impacting issues should clearly state urgency in the subject line."
          ]
        }
      ]}
    />
  );
}
