import { ContentPage } from "@/components/content-page";

export default function PrivacyPolicyPage() {
  return (
    <ContentPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This temporary mail service is designed to keep the interface light and the inbox disposable. The points below explain what is stored, how it is used, and what users should expect when using the service."
      sections={[
        {
          heading: "What We Store",
          body: [
            "We store the generated inbox address, temporary access token, inbox metadata, and emails required to operate the session. Attachments may also be stored for the duration of the inbox lifecycle.",
            "Browser-side session data can be cached locally to restore the inbox experience on the same device."
          ]
        },
        {
          heading: "How Data Is Used",
          body: [
            "Stored data is used only to create inboxes, fetch incoming mail, render message content, and support restore links.",
            "We do not position this service as a place for sensitive, regulated, or long-term communication."
          ]
        },
        {
          heading: "Retention",
          body: [
            "Inboxes are temporary by design. Messages and attachments are expected to expire and may be deleted automatically after the configured retention window.",
            "Users should not rely on the service for permanent storage or archival."
          ]
        }
      ]}
    />
  );
}
