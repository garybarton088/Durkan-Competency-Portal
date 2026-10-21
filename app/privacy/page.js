import Link from 'next/link';

export const metadata = { title: 'Privacy notice | Durkan Regen Competency Portal' };

const UPDATED = '21 October 2026';

export default function PrivacyPage() {
  return (
    <div className="report" style={{ maxWidth: 780 }}>
      <h1>Privacy notice</h1>
      <p className="muted small">Durkan Regen Competency Portal · Last updated {UPDATED}</p>

      <section>
        <h2>Who we are</h2>
        <p>
          The portal is run by Durkan, your employer, which is the data controller for the information in it. If you have any
          questions about this notice or your data, contact <b>Durkan HR</b>.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your name, work email, job title, department, base, phone number, line manager and start date.</li>
          <li>Your qualifications, professional memberships and training.</li>
          <li>The clients you have worked for and the projects you have worked on, including your role on them.</li>
          <li>Your experience of higher-risk buildings, Gateway applications and other Building Safety Act activities.</li>
          <li>Your own competency ratings and evidence, and your reviewer&apos;s rating and comments.</li>
          <li>When you sign in and when you last confirmed your profile.</li>
        </ul>
        <p>
          Please don&apos;t enter sensitive personal details, such as information about your or anyone else&apos;s health, in
          any of the free-text boxes. The portal is only for work experience and competence.
        </p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>
            <b>To meet our legal duties.</b> The Building Safety Act 2022 and the Building Regulations require dutyholders,
            including Durkan, to make sure the people doing the work have the necessary skills, knowledge, experience and
            behaviours, and to be able to show this, particularly to the Building Safety Regulator for higher-risk buildings.
          </li>
          <li>
            <b>For our legitimate business interests.</b> We use it to put the right people on projects and bids, to provide
            evidence of competence to clients in tenders, and to plan training and development.
          </li>
        </ul>
        <p>
          We don&apos;t rely on your consent to use this information, but we do ask you to check it and confirm that it&apos;s
          accurate. No decisions about you are made automatically; the tender search only helps people find colleagues with
          relevant experience.
        </p>
      </section>

      <section>
        <h2>Who can see it</h2>
        <ul>
          <li><b>You</b> can see and edit everything about yourself, and view or print your own report.</li>
          <li><b>Your line manager</b> can see your profile and review your competency ratings.</li>
          <li><b>Senior reviewers</b> can see everyone&apos;s profiles and review competency ratings, but not their own.</li>
          <li><b>The bid team</b> can see and search profiles to staff tenders.</li>
          <li>Anyone signed in to the portal can see colleagues&apos; names and job titles, so they can choose their line manager.</li>
        </ul>
        <p>
          <b>Clients:</b> when we bid for work, we may include a summary of your relevant experience, qualifications and
          competence in our submission, as we already do with CVs. We include only what is relevant to that bid.
        </p>
        <p>
          <b>Suppliers:</b> the portal&apos;s database is provided by Supabase and the website is hosted by Vercel. They store and
          process the data on our behalf under data processing agreements and may not use it for their own purposes. Some of their
          services are run from outside the UK; where that happens, the transfer is protected by the safeguards UK law requires.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your information while you work for Durkan. We delete it from the portal within <b>6 months of you leaving</b>.
          Anything already submitted to a client as part of a bid stays in that bid&apos;s records and is kept in line with our
          usual document retention.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>access the information we hold about you (your own report shows all of it);</li>
          <li>correct anything inaccurate (you can edit most of it yourself);</li>
          <li>ask us to delete information, or to restrict or stop using it, where the law allows;</li>
          <li>object to how we use your information.</li>
        </ul>
        <p>
          To use any of these rights, or to raise a concern, contact <b>Durkan HR</b>. If you&apos;re not happy with our
          response, you can complain to the Information Commissioner&apos;s Office at{' '}
          <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.
        </p>
      </section>

      <p className="no-print">
        <Link href="/">← Back to the portal</Link>
      </p>
    </div>
  );
}
