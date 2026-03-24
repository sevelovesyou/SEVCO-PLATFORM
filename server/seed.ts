import { storage } from "./storage";
import { db } from "./db";
import { articles, categories, revisions, citations, crosslinks, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function promoteFounderToAdmin() {
  const founder = await storage.getUserByUsername("severin@sevelovesyou.com");
  if (founder && founder.role === "user") {
    await storage.updateUserRole(founder.id, "admin");
    console.log("Promoted severin@sevelovesyou.com to admin.");
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
