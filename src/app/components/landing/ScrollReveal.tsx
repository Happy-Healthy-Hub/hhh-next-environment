/**
 * Structural wrapper retained for the landing-page composition. Content is
 * visible in the server-rendered HTML and does not depend on JavaScript.
 */
export function ScrollReveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
