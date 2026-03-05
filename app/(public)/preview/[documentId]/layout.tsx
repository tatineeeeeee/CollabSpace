import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ documentId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { documentId } = await params;

  try {
    const document = await fetchQuery(
      api.documents.getPublishedById,
      { id: documentId as Id<"documents"> },
      { url: process.env.NEXT_PUBLIC_CONVEX_URL }
    );

    if (!document) {
      return {
        title: "Document not available — CollabSpace",
        description: "This document may not be published or doesn't exist.",
      };
    }

    return {
      title: `${document.title} — CollabSpace`,
      description: `Read "${document.title}" on CollabSpace.`,
      openGraph: {
        title: document.title,
        description: `Read "${document.title}" on CollabSpace.`,
        type: "article",
      },
    };
  } catch {
    return {
      title: "CollabSpace",
      description: "A real-time team collaboration workspace.",
    };
  }
}

export default function PreviewLayout({ children }: Props) {
  return <>{children}</>;
}
