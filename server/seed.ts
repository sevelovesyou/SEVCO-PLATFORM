import { storage } from "./storage";
import { db } from "./db";
import { articles, categories, revisions, citations, crosslinks, users, projects, services, playlists } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function promoteFounderToAdmin() {
  const founder = await storage.getUserByUsername("severin@sevelovesyou.com");
  if (founder && founder.role === "user") {
    await storage.updateUserRole(founder.id, "admin");
    console.log("Promoted severin@sevelovesyou.com to admin.");
  }
}

export async function markExistingUsersVerified() {
  const allUsers = await storage.getAllUsers();
  let count = 0;
  for (const user of allUsers) {
    if (!user.emailVerified && !user.emailVerificationToken) {
      await storage.updateEmailVerification(user.id, { emailVerified: true });
      count++;
    }
  }
  if (count > 0) {
    console.log(`Marked ${count} pre-existing user(s) as email-verified.`);
  }
}

export async function seedDatabase() {
  // Check whether the new categories are already present
  const [engCat] = await db.select().from(categories).where(eq(categories.slug, "engineering"));
  if (engCat) return; // already on new schema — nothing to do

  // Clear out any old data before inserting the new structure
  console.log("Migrating database to new category structure...");
  await db.delete(crosslinks);
  await db.delete(citations);
  await db.delete(revisions);
  await db.delete(articles);
  await db.delete(categories);

  console.log("Seeding database with wiki content...");

  const catGeneral     = await storage.createCategory({ name: "General",     slug: "general",     description: "Company-wide information, policies, and announcements", icon: "globe" });
  const catOperations  = await storage.createCategory({ name: "Operations",  slug: "operations",  description: "Processes, workflows, and operational guidelines",         icon: "settings" });
  const catEngineering = await storage.createCategory({ name: "Engineering", slug: "engineering", description: "Technical documentation, architecture, and standards",      icon: "code" });
  const catDesign      = await storage.createCategory({ name: "Design",      slug: "design",      description: "Design systems, brand guidelines, and UX patterns",        icon: "palette" });
  const catSales       = await storage.createCategory({ name: "Sales",       slug: "sales",       description: "Sales processes, playbooks, and customer resources",       icon: "trending-up" });
  const catSupport     = await storage.createCategory({ name: "Support",     slug: "support",     description: "Customer support procedures, FAQs, and escalation paths",  icon: "life-buoy" });

  // ── General ─────────────────────────────────────────────────────────────────
  const artCompanyOverview = await storage.createArticle({
    title: "Company Overview", slug: "company-overview",
    content: `## About Us\n\nThis article provides a high-level overview of the company — our mission, vision, and core values.\n\n## Mission\n\nPlaceholder mission statement. Replace with your actual mission.\n\n## Vision\n\nPlaceholder vision statement. Replace with your actual vision.\n\n## Core Values\n\n- Integrity\n- Innovation\n- Collaboration\n- Customer Focus`,
    summary: "High-level overview of the company, its mission, vision, and core values.",
    categoryId: catGeneral.id, status: "published", infoboxType: "general",
    infoboxData: { "Founded": "TBD", "Industry": "TBD", "Headquarters": "TBD" },
    tags: ["company", "overview", "mission", "values"],
  });
  const artOnboarding = await storage.createArticle({
    title: "Onboarding Guide", slug: "onboarding-guide",
    content: `## Welcome\n\nThis guide helps new team members get up and running quickly.\n\n## Week 1 Checklist\n\n- Set up accounts and access\n- Meet your team\n- Review key documentation\n\n## Key Contacts\n\nPlaceholder — add key contacts here.\n\n## Tools & Systems\n\nPlaceholder — list the tools your team uses.`,
    summary: "Step-by-step onboarding guide for new team members.",
    categoryId: catGeneral.id, status: "published", infoboxType: "general",
    infoboxData: { "Audience": "New Hires", "Last Updated": "TBD" },
    tags: ["onboarding", "new-hire", "guide"],
  });
  const artPolicies = await storage.createArticle({
    title: "Company Policies", slug: "company-policies",
    content: `## Overview\n\nThis page links to and summarizes the key company policies all staff are expected to follow.\n\n## Code of Conduct\n\nPlaceholder — add your code of conduct here.\n\n## Remote Work Policy\n\nPlaceholder — describe your remote work expectations.\n\n## PTO & Leave\n\nPlaceholder — describe your PTO and leave policies.`,
    summary: "Summary of key company policies including code of conduct, remote work, and leave.",
    categoryId: catGeneral.id, status: "published", infoboxType: "general",
    infoboxData: { "Applies To": "All Staff", "Last Reviewed": "TBD" },
    tags: ["policy", "hr", "conduct", "pto"],
  });

  // ── Operations ───────────────────────────────────────────────────────────────
  const artProjectMgmt = await storage.createArticle({
    title: "Project Management Process", slug: "project-management-process",
    content: `## Overview\n\nThis article outlines how we manage projects from kickoff to delivery.\n\n## Phases\n\n### Discovery\nGather requirements and define scope.\n\n### Planning\nCreate milestones, assign owners, and set deadlines.\n\n### Execution\nDeliver work in sprints or phases.\n\n### Review\nConduct retrospectives and document learnings.`,
    summary: "Standard process for managing projects from kickoff through delivery.",
    categoryId: catOperations.id, status: "published", infoboxType: "general",
    infoboxData: { "Tool": "TBD", "Owner": "Operations Team" },
    tags: ["project-management", "process", "workflow"],
  });
  const artVendor = await storage.createArticle({
    title: "Vendor Management", slug: "vendor-management",
    content: `## Overview\n\nGuidelines for selecting, onboarding, and managing third-party vendors.\n\n## Vendor Selection Criteria\n\n- Cost\n- Reliability\n- Support quality\n- Integration capabilities\n\n## Onboarding a Vendor\n\nPlaceholder — describe your vendor onboarding steps.\n\n## Renewals & Reviews\n\nPlaceholder — describe your vendor review cadence.`,
    summary: "Guidelines for selecting, onboarding, and managing third-party vendors.",
    categoryId: catOperations.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Operations", "Review Cycle": "Annual" },
    tags: ["vendors", "operations", "procurement"],
  });
  const artMeetingNorms = await storage.createArticle({
    title: "Meeting & Communication Norms", slug: "meeting-norms",
    content: `## Overview\n\nHow we run effective meetings and communicate as a team.\n\n## Meeting Best Practices\n\n- Always have a written agenda\n- Start and end on time\n- Assign action items with owners and due dates\n\n## Async Communication\n\nPlaceholder — describe your async communication tools and expectations.\n\n## Escalation Path\n\nPlaceholder — describe how issues are escalated.`,
    summary: "Norms and best practices for meetings and team communication.",
    categoryId: catOperations.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Operations", "Primary Tool": "TBD" },
    tags: ["meetings", "communication", "norms"],
  });

  // ── Engineering ──────────────────────────────────────────────────────────────
  const artTechStack = await storage.createArticle({
    title: "Tech Stack Overview", slug: "tech-stack-overview",
    content: `## Overview\n\nA summary of the technologies and frameworks used across our products.\n\n## Frontend\n\nPlaceholder — list your frontend technologies.\n\n## Backend\n\nPlaceholder — list your backend technologies.\n\n## Infrastructure\n\nPlaceholder — describe your hosting and infrastructure setup.\n\n## Databases\n\nPlaceholder — list your databases and storage solutions.`,
    summary: "Overview of the technologies, frameworks, and infrastructure used across products.",
    categoryId: catEngineering.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Engineering", "Last Updated": "TBD" },
    tags: ["tech-stack", "engineering", "architecture"],
  });
  const artCodeReview = await storage.createArticle({
    title: "Code Review Guidelines", slug: "code-review-guidelines",
    content: `## Purpose\n\nCode reviews help maintain quality, share knowledge, and catch bugs early.\n\n## Reviewer Responsibilities\n\n- Review within 1 business day\n- Provide constructive, specific feedback\n- Approve only when confident in correctness\n\n## Author Responsibilities\n\n- Keep PRs small and focused\n- Write a clear description\n- Respond to all comments\n\n## Merge Criteria\n\nPlaceholder — define your merge requirements (approvals, CI checks, etc.).`,
    summary: "Guidelines for conducting and receiving code reviews across the engineering team.",
    categoryId: catEngineering.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Engineering Lead", "Applies To": "All Engineers" },
    tags: ["code-review", "engineering", "quality"],
  });
  const artDeployment = await storage.createArticle({
    title: "Deployment Process", slug: "deployment-process",
    content: `## Overview\n\nHow code gets from a developer's machine to production.\n\n## Environments\n\n- **Development** — local or dev server\n- **Staging** — pre-production testing\n- **Production** — live environment\n\n## Deployment Steps\n\n1. Merge approved PR to main\n2. CI/CD pipeline runs tests\n3. Auto-deploy to staging\n4. Manual promotion to production\n\n## Rollback Procedure\n\nPlaceholder — describe your rollback steps.`,
    summary: "Step-by-step guide for deploying code from development through to production.",
    categoryId: catEngineering.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Engineering", "CI/CD Tool": "TBD" },
    tags: ["deployment", "ci-cd", "engineering", "release"],
  });

  // ── Design ───────────────────────────────────────────────────────────────────
  const artDesignSystem = await storage.createArticle({
    title: "Design System", slug: "design-system",
    content: `## Overview\n\nOur design system provides the foundations for building consistent, accessible user interfaces.\n\n## Typography\n\nPlaceholder — describe your type scale and font choices.\n\n## Color Palette\n\nPlaceholder — list your primary, secondary, and neutral colors.\n\n## Spacing & Grid\n\nPlaceholder — describe your spacing scale and grid system.\n\n## Components\n\nPlaceholder — link to or describe your component library.`,
    summary: "Foundations of the design system including typography, colors, spacing, and components.",
    categoryId: catDesign.id, status: "published", infoboxType: "general",
    infoboxData: { "Tool": "TBD", "Owner": "Design Team" },
    tags: ["design-system", "ui", "components", "brand"],
  });
  const artBrandGuidelines = await storage.createArticle({
    title: "Brand Guidelines", slug: "brand-guidelines",
    content: `## Overview\n\nThis document defines how the brand should be presented across all touchpoints.\n\n## Logo Usage\n\nPlaceholder — describe logo usage rules, minimum sizes, and clear space.\n\n## Voice & Tone\n\nPlaceholder — describe the brand's voice and tone.\n\n## Do's and Don'ts\n\nPlaceholder — list key brand do's and don'ts.`,
    summary: "Official brand guidelines covering logo usage, voice, tone, and visual standards.",
    categoryId: catDesign.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Brand / Design", "Last Updated": "TBD" },
    tags: ["brand", "guidelines", "logo", "voice"],
  });
  const artUxResearch = await storage.createArticle({
    title: "UX Research Process", slug: "ux-research-process",
    content: `## Overview\n\nHow the design team conducts user research to inform product decisions.\n\n## Research Methods\n\n- User interviews\n- Usability testing\n- Surveys\n- Analytics review\n\n## Research Repository\n\nPlaceholder — describe where research findings are stored.\n\n## How to Request Research\n\nPlaceholder — describe how other teams can request UX research support.`,
    summary: "Overview of the UX research process, methods, and how to request research support.",
    categoryId: catDesign.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "UX Team", "Methods": "Interviews, Usability, Surveys" },
    tags: ["ux", "research", "design", "user-testing"],
  });

  // ── Sales ────────────────────────────────────────────────────────────────────
  const artSalesPlaybook = await storage.createArticle({
    title: "Sales Playbook", slug: "sales-playbook",
    content: `## Overview\n\nThe sales playbook is the definitive guide to how we sell — from prospecting to close.\n\n## Ideal Customer Profile\n\nPlaceholder — describe your ICP.\n\n## Sales Stages\n\n1. Prospecting\n2. Discovery\n3. Demo\n4. Proposal\n5. Negotiation\n6. Close\n\n## Objection Handling\n\nPlaceholder — list common objections and responses.`,
    summary: "The definitive guide to our sales process, from prospecting to close.",
    categoryId: catSales.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Sales Leadership", "Audience": "Sales Team" },
    tags: ["sales", "playbook", "process", "revenue"],
  });
  const artPricing = await storage.createArticle({
    title: "Pricing & Packaging", slug: "pricing-and-packaging",
    content: `## Overview\n\nThis page documents our current pricing structure and packaging tiers.\n\n## Tiers\n\n- **Starter** — Placeholder pricing and features\n- **Growth** — Placeholder pricing and features\n- **Enterprise** — Custom pricing\n\n## Discounting Policy\n\nPlaceholder — describe discount authority levels.\n\n## Contract Terms\n\nPlaceholder — describe standard contract lengths and terms.`,
    summary: "Current pricing tiers, packaging options, and discounting policy.",
    categoryId: catSales.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Sales / Finance", "Review Cycle": "Quarterly" },
    tags: ["pricing", "packaging", "sales", "tiers"],
  });
  const artCrm = await storage.createArticle({
    title: "CRM & Pipeline Management", slug: "crm-pipeline-management",
    content: `## Overview\n\nHow the sales team manages the CRM and keeps pipeline data accurate.\n\n## CRM Tool\n\nPlaceholder — specify your CRM (e.g. HubSpot, Salesforce).\n\n## Pipeline Hygiene Rules\n\n- Update deal stages within 24 hours of any activity\n- Log all calls and emails\n- Keep close dates realistic\n\n## Reporting Cadence\n\nPlaceholder — describe how pipeline is reviewed in team meetings.`,
    summary: "Guidelines for managing the CRM, pipeline hygiene, and sales reporting.",
    categoryId: catSales.id, status: "published", infoboxType: "general",
    infoboxData: { "CRM": "TBD", "Owner": "Sales Ops" },
    tags: ["crm", "pipeline", "sales-ops", "reporting"],
  });

  // ── Support ──────────────────────────────────────────────────────────────────
  const artSupportTiers = await storage.createArticle({
    title: "Support Tiers & SLAs", slug: "support-tiers-slas",
    content: `## Overview\n\nDefines the support tiers available to customers and the associated service level agreements.\n\n## Tiers\n\n- **Standard** — Email support, response within 2 business days\n- **Priority** — Email + chat, response within 4 hours\n- **Enterprise** — Dedicated support, response within 1 hour\n\n## Escalation Policy\n\nPlaceholder — describe your escalation process.\n\n## SLA Breach Process\n\nPlaceholder — what happens when an SLA is breached.`,
    summary: "Overview of customer support tiers, response SLAs, and escalation policies.",
    categoryId: catSupport.id, status: "published", infoboxType: "general",
    infoboxData: { "Owner": "Support Lead", "Last Reviewed": "TBD" },
    tags: ["support", "sla", "tiers", "escalation"],
  });
  const artCommonIssues = await storage.createArticle({
    title: "Common Issues & Resolutions", slug: "common-issues-resolutions",
    content: `## Overview\n\nA reference guide for the most frequently encountered customer issues and their resolutions.\n\n## Login & Access Issues\n\nPlaceholder — describe common login issues and fixes.\n\n## Billing Questions\n\nPlaceholder — describe how to handle common billing inquiries.\n\n## Feature Questions\n\nPlaceholder — link to feature documentation or describe common how-to answers.`,
    summary: "Reference guide for frequently encountered customer issues and their standard resolutions.",
    categoryId: catSupport.id, status: "published", infoboxType: "general",
    infoboxData: { "Last Updated": "TBD", "Maintained By": "Support Team" },
    tags: ["support", "faq", "troubleshooting", "issues"],
  });
  const artTickets = await storage.createArticle({
    title: "Ticket Handling Process", slug: "ticket-handling-process",
    content: `## Overview\n\nHow support tickets are created, triaged, assigned, and resolved.\n\n## Ticket Lifecycle\n\n1. Customer submits ticket\n2. Auto-acknowledgement sent\n3. Agent triages and assigns priority\n4. Resolution delivered\n5. Ticket closed and customer surveyed\n\n## Priority Levels\n\n- **P1 Critical** — Service down, immediate response\n- **P2 High** — Major feature broken\n- **P3 Medium** — Minor issue with workaround\n- **P4 Low** — General question or feedback\n\n## Ticket Tools\n\nPlaceholder — specify your support ticketing tool.`,
    summary: "Step-by-step process for triaging, assigning, and resolving customer support tickets.",
    categoryId: catSupport.id, status: "published", infoboxType: "general",
    infoboxData: { "Tool": "TBD", "Owner": "Support Ops" },
    tags: ["tickets", "support", "triage", "process"],
  });

  // ── Initial revisions ────────────────────────────────────────────────────────
  const allArts = [
    artCompanyOverview, artOnboarding, artPolicies,
    artProjectMgmt, artVendor, artMeetingNorms,
    artTechStack, artCodeReview, artDeployment,
    artDesignSystem, artBrandGuidelines, artUxResearch,
    artSalesPlaybook, artPricing, artCrm,
    artSupportTiers, artCommonIssues, artTickets,
  ];

  for (const art of allArts) {
    await storage.createRevision({
      articleId: art.id,
      content: art.content,
      infoboxData: art.infoboxData,
      summary: art.summary,
      editSummary: "Initial article creation",
      status: "approved",
      authorName: "Wiki Admin",
    });
  }

  console.log("Database seeded successfully with 18 articles across 6 categories.");
}

export async function seedProjects() {
  const [sphereExists] = await db.select().from(projects).where(eq(projects.slug, "sphere"));
  if (sphereExists) return;

  console.log("Seeding placeholder projects...");

  await storage.createProject({
    name: "SPHERE",
    slug: "sphere",
    description: "The central platform powering the SEVCO ecosystem — connecting all apps, communities, and creators in one place.",
    longDescription: `SPHERE is the backbone of everything SEVCO builds. It's the unified platform layer that connects our apps, communities, music, store, and creator tools under a single identity and auth system.\n\nBuilt on modern web technologies, SPHERE is designed to scale with the community and power the next generation of SEVCO products.`,
    status: "active",
    type: "Platform",
    category: "Platform",
    featured: true,
    tags: ["Platform", "Web", "Community", "React", "Node.js"],
    launchDate: "2024",
  });

  await storage.createProject({
    name: "SEVClaw",
    slug: "sevclaw",
    description: "A suite of creative tools designed for the SEVCO community — from content creation to collaboration.",
    longDescription: `SEVClaw is SEVCO's creative toolkit. Designed with creators in mind, it brings together content creation, collaboration, and publishing tools in one cohesive experience.\n\nCurrently in active development, SEVClaw will integrate directly with SPHERE and SEVCO Records to give every creator on the platform powerful, easy-to-use tools.`,
    status: "in-development",
    type: "App",
    category: "App",
    featured: true,
    tags: ["App", "Creative", "Tools", "Collaboration"],
    launchDate: "Coming Soon",
  });

  await storage.createProject({
    name: "Minecraft",
    slug: "minecraft",
    description: "The official SEVCO Minecraft community — custom servers, events, and builds for the community.",
    longDescription: `The SEVCO Minecraft community is one of our most active projects. With custom-built servers, regular events, and a dedicated community of builders and players, SEVCO Minecraft brings the creative spirit of the platform into the game.\n\nFrom survival to creative to mini-games, there's always something happening in the SEVCO server network.`,
    status: "active",
    type: "Company",
    category: "Game",
    featured: true,
    tags: ["Game", "Community", "Minecraft", "Multiplayer"],
    launchDate: "2023",
  });

  await storage.createProject({
    name: "SEVCO Records",
    slug: "sevco-records",
    description: "An independent music label and A&R operation dedicated to discovering and developing emerging artists.",
    longDescription: `SEVCO Records is our independent music label — built for artists, run by people who care about music. We work with emerging talent across genres, providing distribution, promotion, and creative support.\n\nFrom submission to release, SEVCO Records handles every step of the artist journey with transparency and respect for the creative process.`,
    status: "active",
    type: "Record Label",
    category: "Label",
    featured: true,
    tags: ["Music", "Label", "A&R", "Independent"],
    websiteUrl: "",
    launchDate: "2023",
  });

  await storage.createProject({
    name: "SEV Store",
    slug: "sev-store",
    description: "The official SEVCO merchandise and digital goods store — apparel, collectibles, and exclusive drops.",
    longDescription: `The SEV Store is where the SEVCO community shows up. From limited-edition apparel to digital collectibles, the store is a direct line between SEVCO and the people who support it.\n\nEvery purchase directly supports the platform and the creators within the SEVCO ecosystem.`,
    status: "active",
    type: "Brand",
    category: "Platform",
    featured: false,
    tags: ["Store", "E-commerce", "Merch", "Apparel"],
    launchDate: "2024",
  });

  await storage.createProject({
    name: "SEVCO Ventures",
    slug: "sevco-ventures",
    description: "The investment and incubation arm of SEVCO — backing bold ideas from within the community.",
    longDescription: `SEVCO Ventures is where ideas become companies. As the investment and incubation arm of SEVCO, we back community members with bold ideas and the drive to make them real.\n\nFrom early-stage funding to mentorship and network access, SEVCO Ventures is committed to turning community talent into lasting ventures.`,
    status: "in-development",
    type: "Initiative",
    category: "Other",
    featured: false,
    tags: ["Ventures", "Investment", "Incubation", "Community"],
    launchDate: "Coming Soon",
  });

  console.log("Seeded 6 placeholder projects.");
}

export async function seedServices() {
  const existing = await db.select().from(services);
  if (existing.length > 0) return;

  console.log("Seeding placeholder services...");

  const serviceData = [
    // Engineering
    { name: "Platform Development", slug: "platform-development", category: "Engineering", tagline: "Full-stack web and mobile platform engineering", iconName: "Code2", featured: true, description: `We design, build, and scale digital platforms from the ground up. Whether you're launching a new product or modernizing an existing system, our engineering team delivers robust, maintainable solutions built on modern web technologies.\n\n**What's included:**\n- Architecture design and technical planning\n- Full-stack development (React, Node.js, PostgreSQL)\n- API design and integration\n- Performance optimization and scalability planning\n- Code reviews and engineering standards` },
    { name: "API Integration", slug: "api-integration", category: "Engineering", tagline: "Seamless connections between your tools and platforms", iconName: "Plug", featured: false, description: `Connect your business systems, third-party tools, and platforms with clean, reliable API integrations. We handle everything from authentication to data transformation to error handling.\n\n**What's included:**\n- Third-party API research and evaluation\n- OAuth and authentication setup\n- Webhook configuration and event handling\n- Data mapping and transformation\n- Monitoring and alerting` },
    { name: "Technical Consulting", slug: "technical-consulting", category: "Engineering", tagline: "Expert guidance on architecture, tooling, and strategy", iconName: "Lightbulb", featured: false, description: `Get an outside perspective on your technical decisions. Our consultants bring experience across a wide range of tech stacks and business contexts to help you make better choices faster.\n\n**What's included:**\n- Technology stack review\n- Architecture assessment\n- Build vs. buy analysis\n- Technical roadmap development\n- Team and process evaluation` },

    // Design
    { name: "Brand Identity", slug: "brand-identity", category: "Design", tagline: "Logos, visual systems, and brand guidelines", iconName: "Palette", featured: true, description: `Build a brand that people remember. We create visual identities from scratch — from naming and logo design to full brand systems and usage guidelines.\n\n**What's included:**\n- Logo design (primary, secondary, icon variants)\n- Color palette and typography system\n- Brand guidelines document\n- Social media kit\n- Asset delivery in all formats` },
    { name: "UI/UX Design", slug: "ui-ux-design", category: "Design", tagline: "User-centered interfaces and experience design", iconName: "MousePointer2", featured: true, description: `Great software starts with great design. We create interfaces that are intuitive, accessible, and visually polished — from early wireframes to final handoff.\n\n**What's included:**\n- User research and journey mapping\n- Wireframing and prototyping\n- High-fidelity UI design\n- Responsive and accessible design\n- Developer handoff documentation` },
    { name: "Creative Direction", slug: "creative-direction", category: "Design", tagline: "Strategic creative leadership for campaigns and products", iconName: "Sparkles", featured: false, description: `When you need someone to own the creative vision, our creative directors step in. We lead the aesthetic and narrative direction across campaigns, products, and brand expressions.\n\n**What's included:**\n- Creative brief development\n- Art direction and visual storytelling\n- Campaign concept development\n- Vendor and talent direction\n- Ongoing creative oversight` },

    // Marketing
    { name: "Content Strategy", slug: "content-strategy", category: "Marketing", tagline: "Content planning, creation, and distribution strategy", iconName: "FileText", featured: true, description: `Content is how your audience finds and trusts you. We build content strategies that align with your business goals and actually get executed.\n\n**What's included:**\n- Content audit and gap analysis\n- Editorial calendar development\n- SEO content planning\n- Blog, video, and social content production\n- Performance tracking and reporting` },
    { name: "Social Media", slug: "social-media", category: "Marketing", tagline: "Community management and social growth strategy", iconName: "Share2", featured: false, description: `Show up consistently and authentically on social. We manage and grow your social presence across platforms with content that resonates with your audience.\n\n**What's included:**\n- Platform strategy and setup\n- Content creation and scheduling\n- Community management\n- Influencer outreach\n- Monthly analytics reporting` },
    { name: "Growth Consulting", slug: "growth-consulting", category: "Marketing", tagline: "Data-driven growth strategy and acquisition optimization", iconName: "TrendingUp", featured: false, description: `Sustainable growth requires more than running ads. We build growth systems — from acquisition to retention — using data, experimentation, and clear frameworks.\n\n**What's included:**\n- Growth audit and opportunity mapping\n- Funnel analysis and optimization\n- Paid and organic channel strategy\n- A/B testing framework\n- Growth metrics dashboard` },

    // Operations
    { name: "Project Management", slug: "project-management", category: "Operations", tagline: "End-to-end project coordination and delivery", iconName: "ClipboardList", featured: false, description: `Keep complex projects on track with dedicated project management support. We bring structure, communication, and accountability to everything we touch.\n\n**What's included:**\n- Project scoping and planning\n- Milestone tracking and reporting\n- Stakeholder communication\n- Risk management\n- Retrospectives and process improvement` },
    { name: "Process Optimization", slug: "process-optimization", category: "Operations", tagline: "Streamlining workflows for efficiency and scale", iconName: "Settings2", featured: false, description: `Inefficient processes cost time and money. We map, analyze, and redesign your workflows to eliminate bottlenecks and enable your team to focus on what matters.\n\n**What's included:**\n- Current state process mapping\n- Bottleneck identification\n- Tool and automation recommendations\n- Implementation support\n- Team training and documentation` },

    // Sales
    { name: "Partnership Development", slug: "partnership-development", category: "Sales", tagline: "Strategic partnership sourcing and deal structuring", iconName: "Handshake", featured: true, description: `The right partnerships can accelerate everything. We identify, pursue, and structure strategic partnerships that create real value for your business.\n\n**What's included:**\n- Partner landscape mapping\n- Outreach and relationship development\n- Partnership proposal and pitch support\n- Deal structure and term negotiation\n- Ongoing partnership management` },
    { name: "Sales Strategy", slug: "sales-strategy", category: "Sales", tagline: "Sales process design, playbooks, and team enablement", iconName: "Target", featured: false, description: `Build a sales function that scales. We design the processes, playbooks, and enablement tools your team needs to close more deals, faster.\n\n**What's included:**\n- ICP and market segmentation\n- Sales process design\n- Playbook development\n- CRM setup and configuration\n- Sales team coaching` },

    // Support
    { name: "Dedicated Support", slug: "dedicated-support", category: "Support", tagline: "Ongoing technical and product support for your team", iconName: "HeadphonesIcon", featured: false, description: `Get reliable, responsive support from a team that knows your product. Our dedicated support service provides ongoing technical assistance and issue resolution.\n\n**What's included:**\n- Dedicated support channel\n- SLA-backed response times\n- Bug triage and resolution\n- Documentation maintenance\n- Monthly support reports` },
    { name: "Onboarding", slug: "onboarding", category: "Support", tagline: "Structured onboarding programs for new clients and teams", iconName: "BookOpen", featured: false, description: `Start every relationship the right way. We design and run onboarding programs that get new clients and team members up to speed quickly and confidently.\n\n**What's included:**\n- Onboarding flow design\n- Welcome materials and documentation\n- Training sessions (live and recorded)\n- Check-in schedule and milestones\n- Handoff to steady state` },
  ];

  for (const s of serviceData) {
    await storage.createService({
      name: s.name,
      slug: s.slug,
      category: s.category,
      tagline: s.tagline,
      iconName: s.iconName,
      featured: s.featured,
      description: s.description,
      status: "active",
    });
  }

  console.log(`Seeded ${serviceData.length} services.`);
}

export async function seedPlaylists() {
  const existing = await db.select().from(playlists);
  if (existing.length > 0) return;

  console.log("Seeding placeholder playlists...");

  await storage.createPlaylist({
    title: "Intro to SEVCO Records",
    slug: "intro-to-sevco-records",
    description: "The essential first listen — handpicked tracks that define the SEVCO sound.",
    platform: "Spotify",
    playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    isOfficial: true,
  });

  await storage.createPlaylist({
    title: "Late Night Vibes",
    slug: "late-night-vibes",
    description: "Deep cuts and slow burners for when the night gets quiet.",
    platform: "Spotify",
    playlistUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    isOfficial: true,
  });

  await storage.createPlaylist({
    title: "Freshest Drops",
    slug: "freshest-drops",
    description: "The newest releases from across the SEVCO Records roster. Updated weekly.",
    platform: "SoundCloud",
    playlistUrl: "https://soundcloud.com",
    isOfficial: true,
  });

  console.log("Seeded 3 placeholder playlists.");
}
