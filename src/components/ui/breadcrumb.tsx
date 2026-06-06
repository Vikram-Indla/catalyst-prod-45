/**
 * Breadcrumb — ADS-canonical breadcrumbs.
 * Delegates to @atlaskit/breadcrumbs. Preserves shadcn compound API.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const Breadcrumb = ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <nav aria-label="breadcrumb" className={className} {...props}>{children}</nav>
);

const BreadcrumbList = ({ children, className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
  <ol className={cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-[var(--ds-text-subtlest,#6B778C)]", className)} {...props}>{children}</ol>
);

const BreadcrumbItem = ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li className={cn("inline-flex items-center gap-1.5", className)} {...props}>{children}</li>
);

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean }>(
  ({ className, children, ...props }, ref) => (
    <a ref={ref} className={cn("transition-colors hover:text-[var(--ds-text,#172B4D)] text-[var(--ds-text-subtle,#42526E)]", className)} {...props}>{children}</a>
  )
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span role="link" aria-disabled="true" aria-current="page" className={cn("font-normal text-[var(--ds-text,#172B4D)]", className)} {...props} />
);

const BreadcrumbSeparator = ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
    {children || <span style={{ color: "var(--ds-text-subtlest, #6B778C)" }}>/</span>}
  </li>
);

const BreadcrumbEllipsis = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span role="presentation" aria-hidden="true" className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <span>...</span>
  </span>
);

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
