"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { IconRenderer } from "@/components/shared/icon-renderer";
import type { Id } from "@/convex/_generated/dataModel";

interface DocumentBreadcrumbProps {
  documentId: Id<"documents">;
}

export function DocumentBreadcrumb({ documentId }: DocumentBreadcrumbProps) {
  const ancestors = useQuery(api.documents.getAncestors, { id: documentId });

  if (!ancestors) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/documents">Documents</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {ancestors.map((ancestor, index) => {
          const isLast = index === ancestors.length - 1;
          return (
            <Fragment key={ancestor._id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>
                    {ancestor.icon && <IconRenderer icon={ancestor.icon} className="mr-1 inline-flex h-4 w-4 text-sm" />}
                    {ancestor.title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={`/documents/${ancestor._id}`}>
                      {ancestor.icon && <IconRenderer icon={ancestor.icon} className="mr-1 inline-flex h-4 w-4 text-sm" />}
                      {ancestor.title}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
