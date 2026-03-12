import { InboxWorkspace } from "@/components/inbox-workspace";

type InboxPageProps = {
  params: {
    email: string;
  };
};

export default function InboxRestorePage({ params }: InboxPageProps) {
  return <InboxWorkspace initialEmailAddress={decodeURIComponent(params.email)} />;
}
