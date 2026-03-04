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
                    {ancestor.icon && <span className="mr-1">{ancestor.icon}</span>}
                    {ancestor.title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={`/documents/${ancestor._id}`}>
                      {ancestor.icon && <span className="mr-1">{ancestor.icon}</span>}
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
