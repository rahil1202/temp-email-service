import { ContentPage } from "@/components/content-page";

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Terms"
      title="Terms of Use"
      intro="This service is intended for temporary mailbox workflows. By using it, users agree to operate within lawful and reasonable limits."
      sections={[
        {
          heading: "Acceptable Use",
          body: [
            "Users may not use the service for abuse, phishing, fraud, harassment, malware distribution, or any unlawful activity.",
            "Automated high-volume use may be rate-limited or blocked to protect service stability."
          ]
        },
        {
          heading: "Service Limits",
          body: [
            "Inboxes are temporary and may be deleted, rotated, or reset without notice as part of normal operation.",
            "Availability, retention, and delivery are provided on a best-effort basis and are not guaranteed."
          ]
        },
        {
          heading: "Liability",
          body: [
            "The service is provided as is without warranties of continuous availability, message delivery, or long-term preservation.",
            "Users remain responsible for how they use generated addresses and any data received through them."
          ]
        }
      ]}
    />
  );
}
