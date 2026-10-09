/**
 * Every word on the site lives here — edit this file to update the portfolio.
 */

export interface Link {
  label: string;
  href: string;
}

export interface Project {
  id: string;
  index: string;
  title: string;
  tagline: string;
  category: string;
  badge?: string;
  summary: string;
  highlights: string[];
  stack: string[];
  visual: 'agents' | 'sdlc' | 'rateload' | 'broker';
  visualTitle: string;
  link?: Link;
}

export interface SkillGroup {
  id: 'ai' | 'platforms' | 'backend' | 'frontend' | 'languages' | 'cloud';
  title: string;
  kicker: string;
  blurb: string;
  items: string[];
}

export interface JourneyStop {
  start: string;
  period: string;
  role: string;
  org: string;
  place: string;
  points: string[];
  tags: string[];
  badges?: string[];
  link?: Link;
}

export interface Highlight {
  kicker: string;
  value: string;
  caption: string;
  small?: boolean;
  links?: Link[];
}

export const profile = {
  name: 'Mukund Bajpai',
  firstName: 'Mukund',
  lastName: 'Bajpai',
  initials: 'MB',
  role: 'AI Engineer',
  headline: 'AI Engineer · Full-Stack Developer',
  location: 'Noida, India',
  timeZone: 'Asia/Kolkata',
  email: 'mukundbajpaii@gmail.com',
  resume: 'Mukund-Bajpai-Resume.pdf',
  /** Portrait on the About ID card (a transparent cut-out works best). Set to null for the monogram. */
  photo: 'figure/mukund-portrait.webp' as string | null,
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/mukundbajpai/' },
    { label: 'GitHub', href: 'https://github.com/MukundBajpai' },
    { label: 'X / Twitter', href: 'https://twitter.com/Mukundbajpaii' },
    { label: 'GeeksforGeeks', href: 'https://www.geeksforgeeks.org/user/bloodpriulhx/' },
  ] satisfies Link[],
};

export const heroRoles = [
  'agentic AI systems.',
  'multi-agent orchestration.',
  'RAG pipelines over MCP.',
  'AI-driven SDLC platforms.',
  'full-stack AI products.',
];

export let heroLede =
  'GenAI engineer with 1.5+ years turning LLMs into autonomous systems — multi-agent IT operations, AI-driven software delivery and RAG over enterprise data — built with Python, .NET, Angular and Azure.';

/** Used by data/content.ts to apply the owner's published edit. */
export function setHeroLede(value: string): void {
  heroLede = value;
}

/** Sample run shown in the hero card — illustrative, mirrors the AIxITOPS flow. */
export const agentTrace = [
  { t: '+0.00s', who: 'devops', msg: 'ticket #4821 received' },
  { t: '+0.21s', who: 'orchestrator', msg: 'intent: incident → route' },
  { t: '+0.48s', who: 'rag·mcp', msg: '5 known errors retrieved', ok: 'grounded' },
  { t: '+0.93s', who: 'triage', msg: 'priority P2 · team network', ok: 'done' },
  { t: '+1.30s', who: 'update', msg: 'assignment + comment posted', ok: 'done' },
];

export const marquee = {
  primary: [
    'Agentic AI',
    'Multi-Agent Orchestration',
    'RAG',
    'Model Context Protocol',
    'Prompt Chaining',
    'LLM Integration',
    'Solution Architecture',
  ],
  secondary: ['Angular', '.NET 8', 'Python', 'Azure', 'TypeScript', 'LangGraph', 'n8n', 'Cosmos DB', 'FastAPI'],
};

/** `em: true` renders a word in the accent serif italic. */
export const manifesto: { text: string; em?: boolean }[] = [
  { text: 'I build AI that doesn’t just' },
  { text: 'answer', em: true },
  { text: '— it' },
  { text: 'acts.', em: true },
  {
    text: 'Agents that triage and route IT tickets, pipelines that turn requirements into design, APIs, code, tests and infrastructure, and RAG systems that ground every decision in',
  },
  { text: 'real enterprise knowledge.', em: true },
];

export const bio = [
  'Today I’m an AI Engineer in Architecture Services at Xceedance, driving the architecture and technical direction of a 12-member GenAI initiative — shaping solution roadmaps with VPs and Solution Architects, and designing reusable agents, orchestration patterns and tool integrations for enterprise workflows.',
  'I integrate OpenAI, Azure OpenAI, Anthropic Claude and Azure AI services into full-stack products — then sweat the edge cases, scalability and integrations that make them hold up in production.',
];

export const stats = [
  { value: 1.5, decimals: 1, suffix: '+', label: 'Years engineering GenAI systems' },
  { value: 12, decimals: 0, suffix: '', label: 'Member GenAI initiative — I drive its architecture' },
  { value: 70, decimals: 0, suffix: '%', prefix: '~', label: 'Less generation time on AI-DLC' },
  { value: 500, decimals: 0, suffix: '+', label: 'DSA problems solved' },
];

export const idCard = [
  { k: 'Base', v: 'Noida, IN' },
  { k: 'Focus', v: 'Agentic AI · RAG' },
  { k: 'Stack', v: '.NET · Angular · Python' },
  { k: 'Alma mater', v: 'HBTU Kanpur ’25' },
];

export const projects: Project[] = [
  {
    id: 'aixitops',
    index: '01',
    title: 'AIxITOPS',
    tagline: 'Autonomous multi-agent platform for IT operations',
    category: 'Agentic AI · IT Ops',
    badge: 'In production',
    summary:
      'An agentic orchestrator reads incoming Azure DevOps tickets and hands each one to the right specialised agent — so updates, assignments and workflow actions happen on their own.',
    highlights: [
      'Architected the orchestrator, agent roles and routing of a production multi-agent platform.',
      'Designed a RAG pipeline exposed through MCP — embeddings over historical tickets and known-error data in Cosmos DB ground every agent’s answer.',
    ],
    stack: ['Agentic AI', 'n8n', 'RAG', 'MCP', 'Azure DevOps', 'Cosmos DB'],
    visual: 'agents',
    visualTitle: 'orchestrator.flow',
  },
  {
    id: 'ai-dlc',
    index: '02',
    title: 'AI-DLC',
    tagline: 'AI-driven SDLC automation platform',
    category: 'GenAI · Software Engineering',
    summary:
      'LLMs and agentic workflows that carry a project from raw requirements to design, APIs, code, test cases and infrastructure-as-code — each phase handing rich context to the next.',
    highlights: [
      'Architected the platform that generates requirements, design, API specs, code, test cases and deployment IaC.',
      'Designed interconnected micro-frontend AI workflows with prompt chaining, context optimisation, the Responses API and AI agents — cutting overall generation time by ~70%.',
    ],
    stack: ['.NET 8', 'Angular 20', 'Azure', 'LLMs', 'AI Agents', 'Responses API'],
    visual: 'sdlc',
    visualTitle: 'sdlc.pipeline',
  },
  {
    id: 'rate-load',
    index: '03',
    title: 'DC Rate Load',
    tagline: 'GenAI configurator for insurance rate data',
    category: 'GenAI · Insurance',
    summary:
      'Azure OpenAI reads uploaded Excel rate sheets and classifies every column into a context-aware role based on business rules — turning messy spreadsheets into load-ready data.',
    highlights: [
      'Built the classification service on .NET 8 Azure Functions and Azure OpenAI, driven by business rules.',
      'Developed the end-to-end Angular workflow: Excel upload, SheetJS parsing, AI classification, manual overrides, validation and downstream loading.',
    ],
    stack: ['Angular 20', '.NET 8', 'Azure Functions', 'Azure OpenAI', 'SheetJS'],
    visual: 'rateload',
    visualTitle: 'classify.columns',
  },
  {
    id: 'marine',
    index: '04',
    title: 'Marine',
    tagline: 'Broker portal for flood insurance',
    category: 'Full-Stack · Insurance',
    badge: 'Open source',
    summary:
      'A role-based insurance portal where brokers generate dynamic quotes, calculate premiums and manage the full quote lifecycle.',
    highlights: [
      'Built authentication, dynamic quote generation, premium calculation and quote management on Angular, .NET 8 and SQL Server.',
      'Shipped multi-step workflows, analytics dashboards, search & filtering, PDF exports, document handling and EmailJS + Google Maps integrations.',
    ],
    stack: ['Angular 19', '.NET 8', 'SQL Server', 'EmailJS', 'Google Maps'],
    visual: 'broker',
    visualTitle: 'broker.portal',
    link: { label: 'View on GitHub', href: 'https://github.com/MukundBajpai/Marine-Flood-Insurance-Portal' },
  },
];

export const skillGroups: SkillGroup[] = [
  {
    id: 'ai',
    title: 'AI / GenAI',
    kicker: 'Core discipline',
    blurb: 'Agents that plan, retrieve and act — orchestrated, grounded and built for enterprise workflows.',
    items: [
      'LLMs',
      'Generative AI',
      'AI Agents',
      'Agentic AI',
      'Autonomous Agents',
      'Multi-Agent Systems',
      'RAG',
      'Embeddings',
      'Prompt Engineering',
      'Prompt Chaining',
    ],
  },
  {
    id: 'platforms',
    title: 'AI Platforms',
    kicker: 'Frameworks & models',
    blurb: 'The toolkits I reach for to wire models, tools and memory together.',
    items: [
      'LangChain',
      'LangGraph',
      'LangFuse',
      'n8n',
      'MCP',
      'OpenAI',
      'Anthropic Claude',
      'Azure AI Foundry',
      'OpenAI Agents SDK',
    ],
  },
  {
    id: 'backend',
    title: 'Backend & APIs',
    kicker: 'Services',
    blurb: 'Typed, testable services that put AI behind clean contracts.',
    items: ['.NET', 'Azure Functions', 'Web API', 'MVC', 'FastAPI', 'REST APIs', 'SQL Server'],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    kicker: 'Interfaces',
    blurb: 'Interfaces that make complex AI workflows feel obvious.',
    items: ['Angular', 'React.js', 'Tailwind CSS', 'Bootstrap', 'UI/UX Design'],
  },
  {
    id: 'languages',
    title: 'Languages',
    kicker: 'Fluent in',
    blurb: 'From DSA in C++ to agents in Python and services in C#.',
    items: ['Python', 'C#', 'TypeScript', 'C++', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    id: 'cloud',
    title: 'Cloud & Tools',
    kicker: 'Ship & operate',
    blurb: 'Azure-first delivery with a modern, AI-assisted workflow.',
    items: [
      'Microsoft Azure',
      'Azure Functions',
      'Azure Blob Storage',
      'Azure Table Storage',
      'Cosmos DB',
      'Git',
      'GitHub',
      'Visual Studio',
      'VS Code',
      'PyCharm',
      'SSMS',
      'GitHub Copilot',
      'Windsurf',
    ],
  },
];

export const journey: JourneyStop[] = [
  {
    start: '2025',
    period: 'Jan 2025 — Present',
    role: 'AI Engineer — Architecture Services',
    org: 'Xceedance Consulting India Pvt. Ltd.',
    place: 'Noida, UP',
    points: [
      'Drive architecture and technical direction for a 12-member GenAI initiative, defining solution roadmaps with VPs and Solution Architects.',
      'Architect autonomous, agentic AI systems — reusable agents, orchestration patterns, tool integrations and decision-making workflows.',
      'Ship LLM-powered solutions with RAG, embeddings, prompt engineering and chaining across OpenAI, Azure OpenAI, Anthropic Claude and Azure AI.',
      'Build full-stack AI applications with Python, C#, .NET, Angular, TypeScript, REST APIs and Azure.',
    ],
    tags: ['Agentic AI', 'RAG', 'Azure OpenAI', '.NET', 'Angular'],
    badges: ['SPOT Award', 'Bravo Certificate'],
  },
  {
    start: '2023',
    period: 'Jun 2023 — Jul 2023',
    role: 'SDE Intern',
    org: 'Bright Hint Pvt. Ltd.',
    place: 'Meerut, UP',
    points: [
      'Developed responsive, interactive React.js interfaces from reusable components, improving usability and the frontend experience.',
      'Worked with design and backend teams to integrate frontend components with existing application services.',
    ],
    tags: ['React.js', 'UI Engineering'],
    link: {
      label: 'Certificate',
      href: 'https://drive.google.com/file/d/1RvHZD1izOej99zBS89CRjLTlvUXHCu_7/view?usp=sharing',
    },
  },
  {
    start: '2021',
    period: '2021 — 2025',
    role: 'B.Tech, Computer Science & Engineering',
    org: 'Harcourt Butler Technical University (HBTI)',
    place: 'Kanpur, UP',
    points: [
      'Student Head of Training & Placement — led recruitment initiatives, collaborated with HR teams and served as a panel reviewer.',
      'Built a deep DSA foundation: 500+ problems solved and a global rank of 214 in CodeChef Starters 140.',
    ],
    tags: ['CSE', 'DSA', 'Leadership'],
    link: {
      label: 'T&P role',
      href: 'https://drive.google.com/file/d/1rAJ_DxUMM2nB3TK-x-q5m-LP4Qsl90Fa/view?usp=sharing',
    },
  },
];

const certificationsHref = 'https://www.linkedin.com/in/mukundbajpai/details/certifications/';

export const highlights: Highlight[] = [
  {
    kicker: 'Competitive programming',
    value: '#214',
    caption: 'Global rank in CodeChef Starters 140 (Div. 3) — out of 27,000+ participants.',
  },
  {
    kicker: 'Problem solving',
    value: '500+',
    caption: 'DSA problems solved across LeetCode, GeeksforGeeks and Coding Ninjas.',
    links: [{ label: 'Profile', href: 'https://www.geeksforgeeks.org/user/bloodpriulhx/' }],
  },
  {
    kicker: 'Recognition · Xceedance',
    value: 'SPOT',
    caption: 'SPOT Award for outstanding performance — plus Bravo and Excellence certificates.',
    links: [{ label: 'Certificates', href: certificationsHref }],
  },
  {
    kicker: 'Leadership',
    value: 'T&P',
    caption: 'Student Head of Training & Placement — recruitment drives, HR partnerships and interview panels.',
    links: [
      {
        label: 'Letter',
        href: 'https://drive.google.com/file/d/1rAJ_DxUMM2nB3TK-x-q5m-LP4Qsl90Fa/view?usp=sharing',
      },
    ],
  },
  {
    kicker: 'Certification',
    value: 'Anthropic',
    small: true,
    caption: 'Anthropic certifications — building with Claude.',
    links: [{ label: 'View', href: certificationsHref }],
  },
  {
    kicker: 'Virtual experience',
    value: 'J.P. Morgan',
    small: true,
    caption: 'Software Engineering Virtual Experience on Forage.',
    links: [
      {
        label: 'Certificate',
        href: 'https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/J.P.%20Morgan/R5iK7HMxJGBgaSbvk_J.P.%20Morgan_NziPo5t2iqEb6onwF_1698349238653_completion_certificate.pdf',
      },
    ],
  },
  {
    kicker: 'Training · IIT Bombay',
    value: 'Web + JS',
    small: true,
    caption: 'Web Development and JavaScript training from IIT Bombay.',
    links: [
      { label: 'Web Dev', href: 'https://drive.google.com/file/d/1qFl1JmgrSHJ8TspwrneDTCxGb0cRiDrL/view?usp=sharing' },
      { label: 'JS', href: 'https://drive.google.com/file/d/1FWgR9CfLC_PyWkl577se-Tp55wx0Gyof/view?usp=sharing' },
    ],
  },
];

/**
 * The 3D collectible. `image` must be a transparent cut-out (PNG/WebP) — its outline is traced
 * and extruded into the figure. Everything else is printed on the packaging.
 */
export const collectible = {
  image: 'figure/mukund-bust.webp',
  series: 'Agentic AI Series',
  edition: 'Collector’s Edition · Vol. 01',
  team: 'Architecture Services',
  blurb:
    'Every engineer should ship with accessories. This one comes with a laptop full of agents, a tiny autonomous sidekick and a cup of chai — plus a multi-agent orchestrator and a RAG pipeline over MCP. Drag it, flip it, unbox it.',
  specs: [
    { k: 'Series', v: 'Agentic AI · Vol. 01' },
    { k: 'Finish', v: 'Glossy vinyl' },
    { k: 'Accessories', v: 'Laptop · AI agent · Chai' },
  ],
  features: [
    'Multi-agent orchestration',
    'RAG pipelines exposed over MCP',
    'AI-driven SDLC · ~70% faster generation',
    'Architecture for a 12-member GenAI initiative',
    '.NET 8 · Angular · Python · Azure',
  ],
  stats: [
    { v: '1.5+', k: 'Years in GenAI' },
    { v: '12', k: 'Member initiative' },
    { v: '~70%', k: 'Faster AI-DLC' },
    { v: '500+', k: 'DSA solved' },
    { v: '#214', k: 'CodeChef rank' },
  ],
  links: ['linkedin.com/in/mukundbajpai', 'github.com/MukundBajpai'],
};

export const navLinks = [
  { id: 'about', label: 'About' },
  { id: 'figure', label: 'Figure' },
  { id: 'work', label: 'Work' },
  { id: 'stack', label: 'Stack' },
  { id: 'journey', label: 'Journey' },
  { id: 'highlights', label: 'Reel' },
  { id: 'contact', label: 'Contact' },
];
