/**
 * The "unmistakable development-only indicator" the mock-data patch
 * requires wherever mock records are shown, so nobody mistakes a demo
 * screen for live operational data. See mock_data_for_web/README.md.
 */
export function DemoDataBanner({ what }: { what: string }) {
  return (
    <div className="hhh-demo-banner" role="status">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      DEMO DATA — {what} shown here is fictional sample data, not real records.
    </div>
  );
}
