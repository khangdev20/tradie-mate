export default function ProblemSolution() {
  return (
    <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-low">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-gutter-md">
        <div className="tradie-card p-gutter-md">
          <div className="w-12 h-12 bg-primary-fixed rounded-lg flex items-center justify-center mb-gutter-sm">
            <span className="material-symbols-outlined text-primary">
              payments
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md mb-2">
            No more chasing payments
          </h3>
          <p className="font-body text-body text-on-surface-variant">
            Generate an invoice and collect payment on-site. Professional PDFs
            sent in seconds.
          </p>
        </div>
        <div className="tradie-card p-gutter-md">
          <div className="w-12 h-12 bg-secondary-fixed rounded-lg flex items-center justify-center mb-gutter-sm">
            <span className="material-symbols-outlined text-secondary">
              calendar_today
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md mb-2">
            Never miss a job
          </h3>
          <p className="font-body text-body text-on-surface-variant">
            The smart dashboard shows your today's schedule at a glance. No more
            paper diaries.
          </p>
        </div>
        <div className="tradie-card p-gutter-md">
          <div className="w-12 h-12 bg-tertiary-fixed rounded-lg flex items-center justify-center mb-gutter-sm">
            <span className="material-symbols-outlined text-tertiary">
              assignment_turned_in
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md mb-2">
            Keep your licences in order
          </h3>
          <p className="font-body text-body text-on-surface-variant">
            Manage your documents and get proactive expiry alerts for trade
            licences and insurance.
          </p>
        </div>
      </div>
    </section>
  );
}
