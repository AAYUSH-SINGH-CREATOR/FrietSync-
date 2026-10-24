import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDown, FiArrowRight, FiBarChart2, FiCheck, FiMenu, FiSend, FiSettings, FiUsers, FiX, FiZap } from 'react-icons/fi';
import { AiFillBug } from 'react-icons/ai';
import { getAccessToken } from '../../../features/auth/services/authApi';
import lnheroimg from '../../../assets/lnheroimg.png';
import lnrender from '../../../assets/lnrender.png';
import lncard1 from '../../../assets/lncard1.jpg';
import lncard2 from '../../../assets/lncard2.webp';
import lncard3 from '../../../assets/lncard3.webp';
import lncard4 from '../../../assets/lncard4.jpg';
import lnlaptopMockup from '../../../assets/lnlaptop_mockup.png';
import lnissuesPreview from '../../../assets/lnissues_preview.png';
import lnuser1 from '../../../assets/lnuser1.png';
import lnuser2 from '../../../assets/lnuser2.png';
import lnuser3 from '../../../assets/lnuser3.png';
import logoIcon from '../../../assets/logo.svg';
import faviconLogo from '../../../assets/favicon.svg';

const initialTasks = [
  { id: 1, text: 'Investigate token expiration', completed: true },
  { id: 2, text: 'Add refresh token rotation', completed: true },
  { id: 3, text: 'Update error handling', completed: false },
  { id: 4, text: 'Add unit tests', completed: false },
];

const metrics = [
  { value: '100+', label: 'Projects launched by team worldwide' },
  { value: '5+', label: 'Integrations with your tools' },
  { value: '10+', label: 'Workflows customized for every team' },
  { value: '90%', label: 'More clarity across projects and team' },
];

const featurePillars = [
  {
    icon: FiZap,
    title: 'Turn ideas into action',
    description: 'Turn plans into progress with agile task management and milestone tracking.',
  },
  {
    icon: FiUsers,
    title: 'Keep your team aligned',
    description: 'Never miss what matters with real-time project messaging and updates.',
  },
  {
    icon: FiBarChart2,
    title: 'Track your progress',
    description: 'Use interactive boards, lists, timelines, and audit history effortlessly.',
  },
  {
    icon: FiSettings,
    title: 'Manage your workspace',
    description: 'Configure roles, customize sprints, and streamline member collaboration.',
  },
];

const testimonials = [
  {
    initial: 'M',
    name: 'Maya Chen',
    title: 'Product Lead, Northstar',
    color: 'bg-violet-600',
    quote: 'Frietsync gave us one source of truth for product, design. We finally stopped chasing updates across Slack, email, and spreadsheets.',
  },
  {
    initial: 'J',
    name: 'Jordan Lee',
    title: 'Engineering Manager, Relay',
    color: 'bg-sky-600',
    quote: 'We used to lose issues between Jira and Trello. Frietsync made it easy to keep everything in one place and still feel lightweight.',
  },
  {
    initial: 'A',
    name: 'Alex Rivera',
    title: 'Operations Director, Atlas',
    color: 'bg-emerald-600',
    quote: 'The collaboration features are what won us over. Stakeholders can comment, attach files, and follow progress without extra overhead.',
  },
];

const workspaceTools = [ ['Backlog', '#FF5259'], ['Kanban charts', '#70D982'], ['Issue reviews', '#D19BFA'], ['Calendar', '#99D1F1'], ['Tasks', '#FFB671'], ['My work', '#B06982'], ['Chats', '#6987C9'], ['Sprints managment', '#FF95C9'], ['Project Updates', '#FFD269']];

const showcaseCards = [lncard1, lncard2, lncard3, lncard4];
const roleCards = ['Project manager', 'Reporter', 'Senior Designer', 'Full-Stack Developer'];

const ArrowLink = ({ to = '/signup', children, className = '' }) => (
  <Link
    to={to}
    className={`group inline-flex items-center gap-3 rounded-full bg-[#A8DFFF] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-300 sm:px-8 sm:py-4 sm:text-base ${className}`}
  >
    <span>{children}</span>
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/30 transition-transform group-hover:translate-x-1">
      <FiArrowRight size={15} />
    </span>
  </Link>
);

const SectionIntro = ({ eyebrow, title, description }) => (
  <div className="space-y-4 sm:space-y-4">
    <span className="inline-block text-xs font-bold text-slate-700">{eyebrow}</span>
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-8">
      <h2 className="text-3xl font-semibold leading-tight text-slate-900 lg:col-span-7 sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-slate-700 lg:col-span-5 sm:text-lg">
        {description}
      </p>
    </div>
  </div>
);

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const isAuthenticated = Boolean(getAccessToken());
  const completedCount = tasks.filter((task) => task.completed).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTask = (id) => {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === id ? { ...task, completed: !task.completed } : task
    )));
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white font-sans text-slate-900 antialiased selection:bg-sky-200 selection:text-slate-900">
      <Header isAuthenticated={isAuthenticated} scrolled={scrolled} scrollToSection={scrollToSection} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main>
        <Hero scrollToSection={scrollToSection} />
        <AboutSection />
        <PlanSection />
        <WhySection />
        <TestimonialsSection />
        <QuickAccessSection />
        <ShowcaseSection />
        <ProductCardsSection tasks={tasks} completedCount={completedCount} toggleTask={toggleTask} />
      </main>
      <Footer scrollToSection={scrollToSection} />
    </div>
  );
};

function Header({ isAuthenticated, scrolled, scrollToSection, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/10 bg-slate-900/80 py-3 shadow-lg backdrop-blur-md' : 'bg-transparent py-3 sm:py-5'}`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-14">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <img src={logoIcon || faviconLogo} alt="Frietsync logo" className="h-7 w-7 object-contain transition-transform group-hover:scale-105 sm:h-9 sm:w-9" />
          <span className="text-lg font-bold tracking-tight text-white sm:text-2xl">Frietsync</span>
        </Link>
        <nav className="hidden items-center md:flex">
          <button type="button" onClick={() => scrollToSection('features')} className="rounded-full px-5 py-1.5 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white">
          Features
          </button>
        </nav>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          {isAuthenticated ? (
            <Link to="/dashboard" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-slate-100">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full border border-white/40 bg-white/90 px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-900 shadow-md transition hover:bg-slate-50">Join us</Link>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] sm:hidden"
          />
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 mx-auto max-w-sm rounded-2xl border border-slate-200/80 bg-white p-3 text-slate-900 shadow-2xl shadow-slate-950/20 sm:hidden"
          >
            <div className="space-y-1">
              {[
                { label: 'Features', section: 'features' },
                { label: 'About', section: 'about' },
              ].map(({ label, section }) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => scrollToSection(section)}
                  className="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  {label}
                  <FiArrowRight className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" size={16} />
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="col-span-2 rounded-xl bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                    Log in
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-xl bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
                    Join us
                  </Link>
                </>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

function Hero({ scrollToSection }) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#6EB0EF] via-[#8195EF] to-[#74A7EF] pb-12 pt-24 sm:pb-24 sm:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1440px] -translate-x-1/2 select-none opacity-80">
        <div className="absolute left-10 top-10 h-[400px] w-[500px] rounded-full bg-[#7E7AFE]/60 blur-[140px]" />
        <div className="absolute right-20 top-40 h-[350px] w-[450px] rounded-full bg-[#75A5EF]/70 blur-[120px]" />
      </div>

      <div className="relative mx-auto mb-5 w-full max-w-[1440px] select-none px-2 text-center sm:mb-10 sm:px-8 lg:px-14">
        <h1 className="w-full whitespace-nowrap font-anton text-[clamp(2rem,9vw,10rem)] uppercase leading-none tracking-tight text-white/90">
          Make Work Flow
        </h1>
      </div>

      <div className="relative mx-auto max-w-[1282px] px-4 sm:px-8">
        <div className="overflow-hidden rounded-[24px] border border-white/25 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-2xl sm:rounded-[36px] sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-6 text-left sm:space-y-8 lg:col-span-4">
              <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-[34px]">
                Sync projects,<br />sprints, and issues<br />in one workspace<br />with Frietsync.
              </h2>
              <div>
                <Link to="/signup" className="group inline-flex items-center gap-3 rounded-full bg-[#FFF16B] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-xl transition hover:bg-yellow-300 sm:text-base">
                  <span>Get started</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/30"><FiArrowRight size={15} /></span>
                </Link>
                <button type="button" onClick={() => scrollToSection('features')} className="mt-2 block text-xs text-white underline underline-offset-2 sm:text-sm">Explore Platform</button>
              </div>
            </div>

            <div className="flex items-center justify-center py-2 lg:col-span-5 sm:py-0">
              <img src={lnheroimg} alt="Frietsync workspace illustration" className="w-full max-w-[420px] object-contain drop-shadow-2xl transition-transform hover:scale-[1.02] sm:max-w-[480px]" />
            </div>

            <div className="flex flex-col justify-between space-y-6 text-left lg:col-span-3 lg:pl-4">
              <div>
                <div className="font-anton text-4xl tracking-tight text-white sm:text-5xl">2K+</div>
                <div className="font-anton text-2xl text-white/90 sm:text-3xl">Teams</div>
              </div>
              <div className="flex -space-x-2 sm:-space-x-3">
                {[lnuser1, lnuser2, lnuser3].map((image, index) => (
                  <img key={image} src={image} alt={`Frietsync team member ${index + 1}`} className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-md" />
                ))}
              </div>
              <p className="max-w-[200px] text-xs font-normal leading-relaxed text-white/85 sm:text-sm">
                From startups to scale-ups, teams trust FrietSync to keep work moving.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 text-center sm:mt-12">
        <button type="button" onClick={() => scrollToSection('about')} className="group mt-2 flex flex-col items-center gap-1.5 text-slate-900 transition hover:text-slate-800">
          <span className="text-xs font-semibold tracking-wide">Scroll to explore</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FA8CC7] text-white shadow-md transition-transform group-hover:translate-y-1">
            <FiArrowDown size={15} />
          </span>
        </button>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="relative z-10 -mt-5 w-full rounded-t-[26px] bg-white py-14 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-12 px-6 sm:space-y-20 sm:px-12 lg:px-20">
        <SectionIntro
          eyebrow="About Frietsync"
          title={<>Great work happens when<br />everything is in sync.</>}
          description="Frietsync brings your projects, sprints, and issues together in one clear, connected workspace so your team can move faster, stay aligned, and turn ideas into progress."
        />
        <div className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {metrics.map(({ value, label }) => (
            <div key={value} className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-6 sm:p-7">
              <div className="font-anton text-5xl leading-none text-[#FF5AA8] sm:text-7xl lg:text-8xl">{value}</div>
              <p className="text-sm font-medium leading-snug text-slate-800 sm:text-lg">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#FFF3A1] via-[#FFAACF] to-[#C1E8FF] py-14 sm:py-28">
      <div className="relative z-10 mx-auto max-w-[1440px] px-6 sm:px-12 lg:px-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 text-left sm:space-y-8 lg:col-span-6">
            <h2 className="font-anton text-5xl leading-[0.95] tracking-tight text-slate-950 sm:text-7xl lg:text-8xl">Plan.<br />Track.<br />Collaborate.</h2>
            <p className="max-w-lg text-base font-medium leading-relaxed text-slate-800 sm:text-xl">From big ideas to tiny bugs, Frietsync keeps your work organized, your team aligned, and your goals in sight.</p>
            <ArrowLink>Create your project</ArrowLink>
          </div>
          <div className="flex items-center justify-center lg:col-span-6">
            <img src={lnrender} alt="A visual preview of planning, tracking, and collaboration" className="w-full max-w-[640px] object-contain drop-shadow-2xl transition-transform hover:scale-[1.02]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section id="features" className="w-full bg-white py-14 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-12 px-6 sm:space-y-16 sm:px-12 lg:px-20">
        <SectionIntro
          eyebrow="Why Frietsync?"
          title={<>Everything you need to<br />move work forward.</>}
          description="Powerful features, a delightful experience, and the flexibility to fit any team. FrietSync helps you go from chaos to clarity without the busywork."
        />
        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {featurePillars.map(({ icon: Icon, title, description }) => (
            <article key={title} className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-7 transition hover:border-sky-300 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-[#007DFE]">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-bold leading-snug text-slate-900">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="w-full rounded-t-[24px] bg-[#FFA7CE] py-14 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-10 px-6 sm:space-y-16 sm:px-12 lg:px-20">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          See how teams bring their projects, people, and ideas together with Frietsync.
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 sm:gap-8">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="flex flex-col justify-between space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8">
              <div className="space-y-4">
                <div aria-label="5 out of 5 stars" className="select-none text-lg tracking-widest text-amber-400">★★★★★</div>
                <p className="text-sm italic leading-relaxed text-slate-700 sm:text-base">“{testimonial.quote}”</p>
              </div>
              <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${testimonial.color}`}>
                  {testimonial.initial}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-900">{testimonial.name}</h3>
                  <p className="text-xs text-slate-500">{testimonial.title}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickAccessSection() {
  return (
    <section className="w-full bg-white py-14 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-10 px-6 text-center sm:space-y-12 sm:px-12 lg:px-20">
        <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">Quickly access<br />what you need frequently</h2>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 pt-2 sm:gap-4 sm:pt-4">
          {workspaceTools.map(([label, color]) => (
            <div key={label} className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-200 sm:px-5 sm:py-2.5 sm:text-sm">
              <span className="h-2.5 w-2.5 rounded-full shadow-xs" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  return (
    <section className="w-full overflow-hidden bg-[#C1E8FF] py-14 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-10 px-6 text-center sm:space-y-12 sm:px-12">
        <h2 className="text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">One Platform. Endless Possibilities</h2>
        <div className="showcase-marquee overflow-hidden pb-4 pt-2" aria-label="Frietsync product feature cards">
          <div className="showcase-marquee-track flex w-max">
            {[0, 1].map((setIndex) => (
              <div key={setIndex} className="flex shrink-0 items-center gap-3 pr-3 sm:gap-6 sm:pr-6" aria-hidden={setIndex === 1}>
                {showcaseCards.map((image, index) => (
                  <div key={`${setIndex}-${image}`} className={`w-[140px] shrink-0 overflow-hidden rounded-2xl border border-white/40 shadow-lg transition-transform duration-300 hover:-translate-y-2 sm:w-[220px] ${index % 2 ? '-translate-y-2 sm:-translate-y-3' : ''}`}>
                    <img src={image} alt={setIndex === 0 ? `Frietsync platform feature ${index + 1}` : ''} className="h-auto w-full object-cover" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCardsSection({ tasks, completedCount, toggleTask }) {
  return (
    <section className="w-full bg-white py-14 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-10 px-6 sm:space-y-16 sm:px-12 lg:px-20">
        <h2 className="text-center text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">Simplify work. Amplify progress.</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 sm:gap-8">
          <ChatCard />
          <ChecklistCard tasks={tasks} completedCount={completedCount} toggleTask={toggleTask} />
          <RolesCard />
        </div>
      </div>
    </section>
  );
}

function ProductCard({ title, color, children }) {
  return (
    <article className={`flex flex-col justify-between space-y-6 rounded-[32px] border p-6 shadow-lg sm:p-8 ${color}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">{title}</h3>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10">
            <FiArrowRight className="text-slate-900" size={14} />
          </span>
        </div>
        {children}
      </div>
    </article>
  );
}

function ChatCard() {
  return (
    <ProductCard title="Real-time team chat" color="border-pink-300/60 bg-[#FFAACF]">
      <div className="space-y-3 pt-2">
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">DJ</span>
          <p className="max-w-[220px] rounded-2xl rounded-tl-sm bg-white/90 p-3 text-xs leading-relaxed text-slate-900 shadow-xs">
            can you tell me the deadline for the task submission ?
          </p>
        </div>
        <div className="flex items-start justify-end gap-2.5">
          <p className="max-w-[220px] rounded-2xl rounded-tr-sm bg-slate-900 p-3 text-xs leading-relaxed text-white shadow-xs">Sure, its on Monday next week</p>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">SV</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-4 py-2.5 shadow-sm">
        <span className="flex-1 text-xs text-slate-400">Type here....</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white shadow-xs"><FiSend size={11} /></span>
      </div>
    </ProductCard>
  );
}

function ChecklistCard({ tasks, completedCount, toggleTask }) {
  return (
    <ProductCard title="Keep tasks organized" color="border-amber-300/60 bg-[#FFF2A1]">
      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
          <span>Checklist</span>
          <span className="text-slate-500">{completedCount} / {tasks.length} completed</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
        </div>
        <div className="space-y-2 pt-1">
          {tasks.map((task) => (
            <button key={task.id} type="button" onClick={() => toggleTask(task.id)} className="flex w-full cursor-pointer select-none items-center gap-2.5 text-left text-xs text-slate-800 transition hover:text-slate-950">
              <span className={`flex h-4 w-4 items-center justify-center rounded-md text-[10px] transition ${task.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'}`}>
                {task.completed && <FiCheck size={8} />}
              </span>
              <span className={task.completed ? 'font-medium text-slate-400 line-through' : 'font-semibold text-slate-800'}>{task.text}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-700">
        Click tasks above to interact with the live checklist!
      </p>
    </ProductCard>
  );
}

function RolesCard() {
  return (
    <ProductCard title="Made for everyone" color="border-sky-300/60 bg-[#C1E8FF]">
      <div className="grid grid-cols-2 gap-3 pt-2">
        {roleCards.map((role) => (
          <div key={role} className="flex h-24 flex-col justify-between rounded-2xl bg-white/90 p-4 shadow-xs transition hover:bg-white">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-xs font-bold leading-snug text-slate-900">{role}</span>
          </div>
        ))}
      </div>
      <p className="text-xs font-medium leading-relaxed text-slate-700">Tailored views, permission controls, and notifications built for every team role.</p>
    </ProductCard>
  );
}

function Footer({ scrollToSection }) {
  return (
    <footer className="w-full overflow-hidden border-t border-amber-200/60 bg-[#FFF6C2] py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] space-y-12 px-6 sm:space-y-16 sm:px-12 lg:px-20">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          You can find everything you need right here
        </h2>

        <div className="relative mx-auto flex max-w-lg items-center justify-center">
          <div className="relative w-full max-w-[440px] sm:max-w-[480px]">
            <img src={lnlaptopMockup} alt="Frietsync laptop preview" className="relative z-20 h-auto w-full select-none object-contain drop-shadow-2xl" />
            <div className="absolute left-[13%] top-[8%] z-10 h-[74%] w-[74%] overflow-hidden rounded-md bg-slate-900">
              <img src={lnissuesPreview} alt="Frietsync issue tracking screen" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 border-t border-amber-300/40 pt-8 md:grid-cols-12">
          <div className="space-y-4 text-left md:col-span-6">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={logoIcon || faviconLogo} alt="Frietsync logo" className="h-8 w-8 object-contain" />
              <span className="text-2xl font-bold tracking-tight text-slate-900">Frietsync</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-600">
              Empowering teams to coordinate issues, manage sprints, and communicate effortlessly all in one workspace.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col space-y-3 text-sm font-medium text-slate-700 md:col-span-6 md:items-end">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Links</h3>
            <Link to="/signup" className="transition hover:text-slate-950">Sign up</Link>
            <Link to="/login" className="transition hover:text-slate-950">Log in</Link>
            <button type="button" onClick={() => scrollToSection('features')} className="text-left transition hover:text-slate-950 md:text-right">Features</button>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-amber-300/40 pt-6 text-xs font-semibold text-slate-800 sm:text-base">
          <RibbonItem Icon={FiZap}>Organize Projects</RibbonItem>
          <RibbonItem Icon={FiUsers}>Collaborate with teams</RibbonItem>
          <RibbonItem Icon={FiBarChart2}>Track real progress</RibbonItem>
          <RibbonItem Icon={AiFillBug}>Resolve issues</RibbonItem>
        </div>
      </div>
    </footer>
  );
}

function RibbonItem({ Icon, children }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <Icon size={16} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default LandingPage;
