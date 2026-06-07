import { Link } from 'react-router-dom';
import { BookOpen, Users, Clock, Shield, Zap, BarChart2 } from 'lucide-react';

export default function Landing() {
  const features = [
    { icon: BookOpen,  title: 'All Question Types',  desc: 'MCQ, True/False, Short Answer, Essay, Fill-in-the-Blank, File Upload — every format you need.' },
    { icon: Users,     title: 'Multi-Institution',   desc: 'Tutors and students from the same institution auto-linked. Separate, secure workspaces.' },
    { icon: Clock,     title: 'Deadline + Duration', desc: 'Set quiz expiry and per-student time limits. Auto-submit when time is up.' },
    { icon: Shield,    title: 'Live Proctoring',     desc: 'Monitor tab switches, focus loss, and paste attempts in real time. Flag suspicious behaviour.' },
    { icon: Zap,       title: 'Instant Results',     desc: 'Students see their score, correct answers, and explanations the moment they submit.' },
    { icon: BarChart2, title: 'Rich Analytics',      desc: 'Average scores, pass rates, flagged submissions — clear dashboards for both roles.' },
  ];

  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-terracotta-500 flex items-center justify-center shadow-warm">
            <span className="font-serif text-white text-2xl font-bold leading-none">Ε</span>
          </div>
          <span className="font-serif text-2xl text-[var(--text)]">Exétasi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/register" className="btn-primary text-sm py-2.5">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-terracotta-50 border border-terracotta-100 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-terracotta-500 animate-pulse" />
          <span className="text-sm font-bold text-terracotta-600">The modern quiz platform for educators</span>
        </div>

        <h1 className="font-serif text-5xl sm:text-7xl text-[var(--text)] mb-6 leading-tight">
          Quiz your way to<br />
          <span className="text-terracotta-500 italic">true understanding.</span>
        </h1>

        <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Exétasi (ἐξέτασις) is Greek for <em>examination</em>. Create, share, and monitor quizzes
          with live proctoring, instant results, and deep insights — all in one warm, academic platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-base w-full sm:w-auto">
            Start for free →
          </Link>
          <Link to="/login" className="btn-outline text-base w-full sm:w-auto">
            I have an account
          </Link>
        </div>

        <div className="greek-border mt-16 max-w-xs mx-auto" />
      </section>

      {/* Stats row */}
      <section className="bg-terracotta-500 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: '6+',   label: 'Question types' },
            { value: '∞',    label: 'Quiz codes' },
            { value: 'Live', label: 'Proctoring' },
            { value: '100%', label: 'Instant results' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-serif text-4xl text-white mb-1">{value}</p>
              <p className="text-sm text-terracotta-100 font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-serif text-4xl text-center text-[var(--text)] mb-2">Everything you need.</h2>
        <p className="text-center text-[var(--text-muted)] mb-12">
          Built for educators who want more than just multiple choice.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:shadow-warm-lg transition-shadow duration-200">
              <div className="w-11 h-11 rounded-2xl bg-terracotta-50 flex items-center justify-center mb-4">
                <Icon size={22} className="text-terracotta-500" />
              </div>
              <h3 className="font-serif text-xl mb-2 text-[var(--text)]">{title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-4xl text-center text-[var(--text)] mb-12">Simple for everyone.</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-serif text-2xl text-terracotta-500 mb-6">For Tutors</h3>
              <div className="space-y-4">
                {[
                  'Create a quiz with any mix of question types',
                  'Set deadline & per-student time limit',
                  'Generate a 6-character shareable code',
                  'Monitor students live — see every tab switch',
                  'View results, grades & insights instantly',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-terracotta-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-violet-500 mb-6">For Students</h3>
              <div className="space-y-4">
                {[
                  'Sign up and join your institution',
                  'Enter the quiz code from your tutor',
                  'Answer within the allowed time',
                  'Upload files if the question needs it',
                  'See your full result the moment you submit',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-serif text-5xl text-[var(--text)] mb-4">Ready to begin?</h2>
        <p className="text-[var(--text-muted)] mb-8">
          Join educators and learners on Exétasi — examination, reimagined.
        </p>
        <Link to="/register" className="btn-primary text-base">
          Create your account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-terracotta-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-terracotta-500 flex items-center justify-center">
              <span className="font-serif text-white text-sm font-bold">Ε</span>
            </div>
            <span className="font-serif text-[var(--text)] text-lg">Exétasi</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Exétasi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}