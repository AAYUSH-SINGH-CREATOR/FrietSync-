import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDown, FiArrowRight, FiBarChart2, FiCheck, FiGithub, FiGlobe, FiLinkedin, FiSend, FiSettings, FiTwitter, FiUsers, FiZap} from 'react-icons/fi';
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

const showcaseCards = [lncard1, lncard2, lncard3, lncard4, lncard1, lncard2];
const roleCards = ['Project manager', 'Reporter', 'Senior Designer', 'Full-Stack Developer'];

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com', Icon: FiGithub },
  { label: 'Twitter / X', href: 'https://twitter.com', Icon: FiTwitter },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: FiLinkedin },
  { label: 'Website', href: 'https://frietsync.me', Icon: FiGlobe },
];

const ArrowLink = ({ to = '/signup', children, className = '' }) => (
  <Link
    to={to}
    className={`group inline-flex items-center gap-1 rounded-lg bg-[#A8DFFF] px-2 py-1 text-[7px] font-semibold text-slate-950 shadow-sm transition hover:bg-sky-300 sm:gap-3 sm:rounded-full sm:px-8 sm:py-4 sm:text-base ${className}`}
  >
    <span>{children}</span>
    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-white/30 transition-transform group-hover:translate-x-1 sm:h-7 sm:w-7">
      <FiArrowRight className="sm:hidden" size={8} />
      <FiArrowRight className="hidden sm:block" size={15} />
    </span>
  </Link>
);

const SectionIntro = ({ eyebrow, title, description }) => (
  <div className="space-y-1 sm:space-y-4">
    <span className="inline-block text-[7px] font-bold text-slate-700 sm:text-xs">{eyebrow}</span>
    <div className="grid grid-cols-[1.1fr_0.9fr] items-start gap-4 sm:grid-cols-12 sm:gap-8">
      <h2 className="text-[16px] font-semibold leading-tight text-slate-900 sm:col-span-7 sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      <p className="text-[7px] leading-relaxed text-slate-700 sm:col-span-5 sm:text-lg">
        {description}
      </p>
    </div>
  </div>
);

const LandingPage = () => {
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
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTask = (id) => {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === id ? { ...task, completed: !task.completed } : task
    )));
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white font-sans text-slate-900 antialiased selection:bg-sky-200 selection:text-slate-900">
      <Header isAuthenticated={isAuthenticated} scrolled={scrolled} scrollToSection={scrollToSection} />
      <main>
        <Hero isAuthenticated={isAuthenticated} scrollToSection={scrollToSection} />
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

function Header({ isAuthenticated, scrolled, scrollToSection }) {
  return (
    <header className={`fixed inset-x-0 top-0 z-50 py-2 transition-all duration-300 sm:py-4 ${scrolled ? 'border-b border-white/10 bg-slate-900/80 shadow-lg backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-4 sm:px-8 lg:px-14">
        <Link to="/" className="group flex shrink-0 items-center gap-1.5">
          <img src={logoIcon || faviconLogo} alt="Frietsync logo" className="h-4 w-4 object-contain transition-transform group-hover:scale-105 sm:h-8 sm:w-8" />
          <span className="text-[10px] font-bold tracking-tight text-white sm:text-xl">Frietsync</span>
        </Link>
        <button type="button" onClick={() => scrollToSection('features')} className="rounded-full px-2 py-1 text-[8px] font-medium text-white/90 transition hover:bg-white/10 hover:text-white sm:px-5 sm:text-sm">
          Features
        </button>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard" className="rounded-full bg-white px-2.5 py-1 text-[8px] font-semibold text-slate-900 shadow-md transition hover:bg-slate-100 sm:px-5 sm:py-2 sm:text-sm">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full border border-white/40 bg-white/90 px-2.5 py-1 text-[8px] font-semibold text-slate-900 shadow-sm transition hover:bg-white sm:px-5 sm:py-2 sm:text-sm">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-2.5 py-1 text-[8px] font-bold text-slate-900 shadow-md transition hover:bg-slate-50 sm:px-5 sm:py-2 sm:text-sm">Join us</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ isAuthenticated, scrollToSection }) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#6EB0EF] via-[#8195EF] to-[#74A7EF] pb-8 pt-12 sm:pb-24 sm:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1440px] -translate-x-1/2 select-none opacity-80">
        <div className="absolute left-10 top-10 h-[400px] w-[500px] rounded-full bg-[#7E7AFE]/60 blur-[140px]" />
        <div className="absolute right-20 top-40 h-[350px] w-[450px] rounded-full bg-[#75A5EF]/70 blur-[120px]" />
      </div>

      <div className="relative mx-auto mb-2 w-full max-w-[1440px] select-none px-2 text-center sm:mb-10 sm:px-8 lg:px-14">
        <h1 className="whitespace-nowrap font-anton text-[clamp(2.65rem,12vw,10.625rem)] uppercase leading-none tracking-tight text-white/90 sm:text-[110px] md:text-[140px] lg:text-[170px]">
          Make Work Flow
        </h1>
      </div>

      <div className="relative mx-auto max-w-[1282px] px-3 sm:px-8">
        <div className="overflow-hidden rounded-[18px] border border-white/25 bg-white/[0.08] p-3 shadow-2xl backdrop-blur-2xl sm:rounded-[36px] sm:p-10 lg:p-12">
          <div className="grid grid-cols-[1fr_1.2fr_0.55fr] items-center gap-2 sm:grid-cols-12 sm:gap-8">
            <div className="space-y-2 text-left sm:col-span-4 sm:space-y-8">
              <h2 className="text-[11px] font-semibold leading-tight text-white sm:text-3xl lg:text-[34px]">
                Sync projects,<br />sprints, and issues<br />in one workspace<br />with Frietsync.
              </h2>
              <div>
                <Link to="/signup" className="group inline-flex items-center gap-1 rounded-full bg-[#FFF16B] px-2 py-1 text-[7px] font-semibold text-slate-950 shadow-xl transition hover:bg-yellow-300 sm:gap-3 sm:px-6 sm:py-3.5 sm:text-base">
                  <span>Get started</span>
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-white/30 sm:h-7 sm:w-7"><FiArrowRight size={8} className="sm:hidden" /><FiArrowRight size={15} className="hidden sm:block" /></span>
                </Link>
                <button type="button" onClick={() => scrollToSection('features')} className="mt-1 block text-[7px] text-white underline underline-offset-2 sm:text-xs">Explore Platform</button>
              </div>
            </div>

            <div className="flex items-center justify-center sm:col-span-5">
              <img src={lnheroimg} alt="Frietsync workspace illustration" className="w-full max-w-[480px] object-contain drop-shadow-2xl transition-transform hover:scale-[1.02]" />
            </div>

            <div className="flex flex-col justify-center space-y-1 text-left sm:col-span-3 sm:space-y-6 sm:pl-4">
              <div>
                <div className="font-anton text-lg tracking-tight text-white sm:text-5xl">2K+</div>
                <div className="font-anton text-[10px] text-white/90 sm:text-3xl">Teams</div>
              </div>
              <div className="flex -space-x-2 sm:-space-x-3">
                {[lnuser1, lnuser2, lnuser3].map((image, index) => (
                  <img key={image} src={image} alt={`Frietsync team member ${index + 1}`} className="h-4 w-4 rounded-full border border-white object-cover shadow-md sm:h-12 sm:w-12 sm:border-2" />
                ))}
              </div>
              <p className="max-w-[200px] text-[7px] leading-tight text-white/85 sm:text-sm sm:leading-relaxed">
                From startups to scale-ups, teams trust FrietSync to keep work moving.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center justify-center gap-1 text-center sm:mt-12 sm:gap-4">
        <button type="button" onClick={() => scrollToSection('about')} className="group mt-0 flex flex-col items-center gap-0.5 text-slate-900 transition hover:text-slate-800 sm:mt-2 sm:gap-1.5">
          <span className="text-[7px] font-semibold tracking-wide sm:text-xs">Scroll to explore</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FA8CC7] text-white shadow-md transition-transform group-hover:translate-y-1 sm:h-8 sm:w-8">
            <FiArrowDown className="sm:hidden" size={9} /><FiArrowDown className="hidden sm:block" size={15} />
          </span>
        </button>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="relative z-10 -mt-5 w-full rounded-t-[26px] bg-white py-8 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-6 px-8 sm:space-y-20 sm:px-12 lg:px-20">
        <SectionIntro
          eyebrow="About Frietsync"
          title={<>Great work happens when<br />everything is in sync.</>}
          description="Frietsync brings your projects, sprints, and issues together in one clear, connected workspace so your team can move faster, stay aligned, and turn ideas into progress."
        />
        <div className="grid grid-cols-4 gap-2 sm:gap-8">
          {metrics.map(({ value, label }) => (
            <div key={value} className="space-y-1 sm:space-y-3 sm:rounded-3xl sm:border sm:border-slate-100 sm:bg-slate-50/80 sm:p-6">
              <div className="font-anton text-[26px] leading-none text-[#FF5AA8] sm:text-7xl lg:text-8xl">{value}</div>
              <p className="text-[7px] font-medium leading-snug text-slate-800 sm:text-lg">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#FFF3A1] via-[#FFAACF] to-[#C1E8FF] py-8 sm:py-28">
      <div className="relative z-10 mx-auto max-w-[1440px] px-8 sm:px-12 lg:px-20">
        <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-3 sm:grid-cols-12 sm:gap-10">
          <div className="space-y-2 text-left sm:col-span-6 sm:space-y-8">
            <h2 className="font-anton text-[25px] leading-[0.95] tracking-tight text-slate-950 sm:text-7xl lg:text-8xl">Plan.<br />Track.<br />Collaborate.</h2>
            <p className="max-w-lg text-[7px] font-medium leading-relaxed text-slate-800 sm:text-xl">From big ideas to tiny bugs, Frietsync keeps your work organized, your team aligned, and your goals in sight.</p>
            <ArrowLink>Create your project</ArrowLink>
          </div>
          <div className="flex items-center justify-center sm:col-span-6">
            <img src={lnrender} alt="A visual preview of planning, tracking, and collaboration" className="w-full max-w-[640px] object-contain drop-shadow-2xl transition-transform hover:scale-[1.02]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section id="features" className="w-full bg-white py-8 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-6 px-8 sm:space-y-16 sm:px-12 lg:px-20">
        <SectionIntro
          eyebrow="Why Frietsync?"
          title={<>Everything you need to<br />move work forward.</>}
          description="Powerful features, a delightful experience, and the flexibility to fit any team. FrietSync helps you go from chaos to clarity without the busywork."
        />
        <div className="grid grid-cols-4 gap-2 sm:gap-6">
          {featurePillars.map(({ icon: Icon, title, description }) => (
            <article key={title} className="space-y-1 rounded-xl bg-transparent p-0 transition hover:border-sky-300 hover:shadow-lg sm:space-y-4 sm:rounded-3xl sm:border sm:border-slate-100 sm:bg-slate-50 sm:p-7">
              <div className="flex h-7 w-7 items-center justify-center rounded-2xl text-[#007DFE] sm:h-12 sm:w-12 sm:bg-sky-100">
                <Icon size={22} />
              </div>
              <h3 className="text-[7px] font-bold leading-snug text-slate-900 sm:text-lg">{title}</h3>
              <p className="text-[7px] leading-tight text-slate-600 sm:text-sm sm:leading-relaxed">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
