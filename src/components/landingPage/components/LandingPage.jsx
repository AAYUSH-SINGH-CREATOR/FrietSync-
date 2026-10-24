import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDown, FiArrowRight, FiBarChart2, FiCheck, FiSend, FiSettings, FiUsers, FiZap } from 'react-icons/fi';
import { AiFillBug } from 'react-icons/ai';
import { getAccessToken } from '../../../features/auth/services/authApi';
import lnheroimg from '../../../assets/lnheroimg.png';
import lnrender from '../../../assets/lnrender.png';
import lncard1 from '../../../assets/lncard1.jpg';
import lncard2 from '../../../assets/lncard2.webp';
import lncard3 from '../../../assets/lncard3.webp';
import lncard4 from '../../../assets/lncard4.jpg';
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
        <Hero scrollToSection={scrollToSection} />
        <AboutSection />
        <PlanSection />
        <WhySection />
        <TestimonialsSection />
        <QuickAccessSection />
        <ShowcaseSection />
        <ProductCardsSection tasks={tasks} completedCount={completedCount} toggleTask={toggleTask} />
      </main>
      <Footer />
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

function Hero({ scrollToSection }) {
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

function TestimonialsSection() {
  return (
    <section className="w-full rounded-t-[24px] bg-[#FFA7CE] py-8 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-5 px-8 sm:space-y-16 sm:px-12 lg:px-20">
        <h2 className="mx-auto max-w-3xl text-center text-[16px] font-semibold leading-tight text-slate-900 sm:text-5xl">
          See how teams bring their projects, people, and ideas together with Frietsync.
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-8">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="flex flex-col justify-between space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition hover:shadow-md sm:space-y-6 sm:rounded-3xl sm:p-8">
              <div className="space-y-2 sm:space-y-4">
                <div aria-label="5 out of 5 stars" className="select-none text-[7px] tracking-widest text-amber-400 sm:text-lg">★★★★★</div>
                <p className="text-[6px] italic leading-tight text-slate-700 sm:text-base sm:leading-relaxed">“{testimonial.quote}”</p>
              </div>
              <div className="flex items-center gap-1 border-t border-slate-100 pt-1 sm:gap-3 sm:pt-4">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[6px] font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:text-sm ${testimonial.color}`}>
                  {testimonial.initial}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[6px] font-bold text-slate-900 sm:text-sm">{testimonial.name}</h3>
                  <p className="text-[6px] text-slate-500 sm:text-xs">{testimonial.title}</p>
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
    <section className="w-full bg-white py-8 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-6 px-8 text-center sm:space-y-12 sm:px-12 lg:px-20">
        <h2 className="text-[16px] font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">Quickly access<br />what you need frequently</h2>
        <div className="mx-auto grid max-w-4xl grid-cols-3 items-center justify-items-center gap-x-1 gap-y-2 pt-1 sm:flex sm:flex-wrap sm:justify-center sm:gap-4 sm:pt-4">
          {workspaceTools.map(([label, color]) => (
            <div key={label} className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-100 px-2 py-1 text-[7px] font-semibold text-slate-800 shadow-xs transition hover:bg-slate-200 sm:gap-2.5 sm:rounded-full sm:px-5 sm:py-2.5 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full shadow-xs sm:h-2.5 sm:w-2.5" style={{ backgroundColor: color }} />
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
    <section className="w-full overflow-hidden bg-[#C1E8FF] py-8 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-5 px-0 text-center sm:space-y-12 sm:px-12">
        <h2 className="text-[16px] font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">One Platform. Endless Possibilities</h2>
        <div className="flex flex-nowrap items-center justify-center gap-2 overflow-hidden pb-2 pt-1 sm:gap-6 sm:overflow-x-auto sm:pb-4 sm:pt-4">
          {showcaseCards.map((image, index) => (
            <div key={`${image}-${index}`} className={`w-[82px] shrink-0 overflow-hidden rounded-lg border border-white/40 shadow-lg transition duration-300 hover:-translate-y-2 sm:w-[220px] sm:rounded-2xl ${index > 2 ? 'hidden sm:block' : ''} ${index % 2 ? '-translate-y-1 sm:-translate-y-3' : ''}`}>
              <img src={image} alt={`Frietsync platform feature ${index + 1}`} className="h-auto w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCardsSection({ tasks, completedCount, toggleTask }) {
  return (
    <section className="w-full bg-white py-8 sm:py-28">
      <div className="mx-auto max-w-[1440px] space-y-5 px-8 sm:space-y-16 sm:px-12 lg:px-20">
        <h2 className="text-center text-[16px] font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">Simplify work. Amplify progress.</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-8">
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
    <article className={`flex flex-col justify-between space-y-2 rounded-lg border p-2 shadow-lg sm:space-y-6 sm:rounded-[32px] sm:p-8 ${color}`}>
      <div className="space-y-2 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[7px] font-semibold text-slate-950 sm:text-2xl">{title}</h3>
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-black/10 sm:h-7 sm:w-7">
            <FiArrowRight className="text-slate-900 sm:hidden" size={7} />
            <FiArrowRight className="hidden text-slate-900 sm:block" size={14} />
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
      <div className="space-y-2 pt-1 sm:space-y-3 sm:pt-2">
        <div className="flex items-start gap-1 sm:gap-2.5">
          <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[5px] font-bold text-white sm:h-7 sm:w-7 sm:text-[11px]">DJ</span>
          <p className="max-w-[220px] rounded-lg bg-white/90 p-1 text-[6px] leading-tight text-slate-900 shadow-xs sm:rounded-2xl sm:rounded-tl-sm sm:p-3 sm:text-xs sm:leading-relaxed">
            can you tell me the deadline for the task submission ?
          </p>
        </div>
        <div className="flex items-start justify-end gap-1 sm:gap-2.5">
          <p className="max-w-[220px] rounded-lg bg-slate-900 p-1 text-[6px] leading-tight text-white shadow-xs sm:rounded-2xl sm:rounded-tr-sm sm:p-3 sm:text-xs sm:leading-relaxed">Sure, its on Monday next week</p>
          <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[5px] font-bold text-white sm:h-7 sm:w-7 sm:text-[11px]">SV</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 rounded-full border border-white/60 bg-white/90 px-2 py-1 shadow-sm sm:mt-4 sm:gap-2 sm:px-4 sm:py-2.5">
        <span className="flex-1 text-[6px] text-slate-400 sm:text-xs">Type here....</span>
        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-sky-500 text-white shadow-xs sm:h-6 sm:w-6"><FiSend size={8} className="sm:hidden" /><FiSend size={11} className="ml-0.5 hidden sm:block" /></span>
      </div>
    </ProductCard>
  );
}

function ChecklistCard({ tasks, completedCount, toggleTask }) {
  return (
    <ProductCard title="Keep tasks organized" color="border-amber-300/60 bg-[#FFF2A1]">
      <div className="space-y-1 rounded-lg bg-white/90 p-1 shadow-sm sm:space-y-4 sm:rounded-2xl sm:p-5">
        <div className="flex items-center justify-between text-[6px] font-bold text-slate-900 sm:text-xs">
          <span>Checklist</span>
          <span className="text-slate-500">{completedCount} / {tasks.length} completed</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 sm:h-2">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
        </div>
        <div className="space-y-1 pt-1 sm:space-y-2">
          {tasks.map((task) => (
            <button key={task.id} type="button" onClick={() => toggleTask(task.id)} className="flex w-full cursor-pointer select-none items-center gap-1 text-left text-[6px] text-slate-800 transition hover:text-slate-950 sm:gap-2.5 sm:text-xs">
              <span className={`flex h-2 w-2 items-center justify-center rounded-sm text-[6px] transition sm:h-4 sm:w-4 sm:rounded-md sm:text-[10px] ${task.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'}`}>
                {task.completed && <FiCheck size={8} />}
              </span>
              <span className={task.completed ? 'font-medium text-slate-400 line-through' : 'font-semibold text-slate-800'}>{task.text}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-[6px] font-semibold text-slate-700 sm:text-xs">
        <span className="sm:hidden">Tap tasks to check them.</span>
        <span className="hidden sm:inline">Click tasks above to interact with the live checklist!</span>
      </p>
    </ProductCard>
  );
}

function RolesCard() {
  return (
    <ProductCard title="Made for everyone" color="border-sky-300/60 bg-[#C1E8FF]">
      <div className="grid grid-cols-2 gap-1 pt-1 sm:gap-3 sm:pt-2">
        {roleCards.map((role) => (
          <div key={role} className="flex h-9 flex-col justify-between rounded-md bg-white/90 p-1 shadow-xs transition hover:bg-white sm:h-24 sm:rounded-2xl sm:p-4">
            <span className="h-1 w-1 rounded-full bg-sky-500 sm:h-2.5 sm:w-2.5" />
            <span className="text-[6px] font-bold leading-snug text-slate-900 sm:text-xs">{role}</span>
          </div>
        ))}
      </div>
      <p className="text-[6px] font-medium leading-relaxed text-slate-700 sm:text-xs">Tailored views, permission controls, and notifications built for every team role.</p>
    </ProductCard>
  );
}

function Footer() {
  return (
    <footer className="w-full bg-[#FFF6C2] px-3 py-6 text-black sm:px-8 sm:py-7">
      <div className="mx-auto flex max-w-[1440px] flex-nowrap items-center justify-between gap-1 text-[9px] font-normal sm:gap-6 sm:text-xl">
        <RibbonItem Icon={FiZap}>Organize Projects</RibbonItem>
        <RibbonItem Icon={FiUsers}>Collaborate with teams</RibbonItem>
        <RibbonItem Icon={FiBarChart2}>Track real progress</RibbonItem>
        <RibbonItem Icon={AiFillBug}>Resolve issues</RibbonItem>
      </div>
    </footer>
  );
}

function RibbonItem({ Icon, children }) {
  return (
    <div className="flex items-center gap-1 whitespace-nowrap sm:gap-2">
      <Icon size={10} className="shrink-0 sm:hidden" />
      <Icon size={19} className="hidden shrink-0 sm:block" />
      <span>{children}</span>
    </div>
  );
}

export default LandingPage;
