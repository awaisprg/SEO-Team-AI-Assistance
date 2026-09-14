import { ManagementBrief, ChatSource } from '../../src/types';
import { db } from '../db/store';
import { getAIProvider } from './provider';

export interface BriefRequestParams {
  periodType: 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
  dateFrom?: string;
  dateTo?: string;
}

export async function generateManagementBrief(params: BriefRequestParams): Promise<ManagementBrief> {
  const now = new Date('2026-09-14T10:00:00Z');
  let dateFrom = params.dateFrom;
  let dateTo = params.dateTo;
  let periodLabel = '';

  if (params.periodType === 'this_week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = now.toISOString().slice(0, 10);
    periodLabel = `This Week (${dateFrom} to ${dateTo})`;
  } else if (params.periodType === 'last_week') {
    const end = new Date(now);
    end.setDate(now.getDate() - now.getDay() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = end.toISOString().slice(0, 10);
    periodLabel = `Last Week (${dateFrom} to ${dateTo})`;
  } else if (params.periodType === 'last_month') {
    dateFrom = '2026-08-01';
    dateTo = '2026-08-31';
    periodLabel = 'August 2026';
  } else {
    // Default to this month
    dateFrom = '2026-09-01';
    dateTo = '2026-09-30';
    periodLabel = 'September 2026';
  }

  const allCards = db.getCards();
  const allClients = db.getClients();
  const allActivities = db.getActivities();

  const fromTime = new Date(`${dateFrom}T00:00:00Z`).getTime();
  const toTime = new Date(`${dateTo}T23:59:59Z`).getTime();

  // Filter cards and activities in period
  const relevantCards = allCards.filter((c) => {
    const d = new Date(c.dateLastActivity).getTime();
    return d >= fromTime && d <= toTime;
  });

  const sourceCards: ChatSource[] = relevantCards.map((c) => ({
    cardId: c.id,
    title: c.name,
    url: c.url,
    relevance: 95,
    reason: `Activity in ${periodLabel}`,
    date: c.dateLastActivity,
    client: c.clientCanonical,
    status: c.statusSemantic,
    listName: c.listName,
  }));

  const majorAccomplishments = [
    'Completed AI Overview Competitor Analysis examining 40 medical search queries and citation guidelines.',
    'Delivered Technical SEO and Core Web Vitals remediation for Apex Spine & Orthopedics, boosting mobile PageSpeed score from 48 to 86.',
    'Deployed Automated Medical Schema Generation script, reducing client clinic onboarding time by 3 hours per roster.',
    'Concluded initial Technical Audit and Onboarding milestones for Precision Podiatry PLLC across Austin & Dallas practices.',
  ];

  const seoActivity = [
    'Fixed 34 redirect loops and missing canonical configurations for Advanced Well MD.',
    'Implemented MedicalClinic & Physician schema across 3 active client rosters.',
    'Built automated internal linking silos for 14 orthopedic surgery condition hubs.',
  ];

  const contentActivity = [
    'Drafted 3 pillar vein treatment service pages for Bay Area Vein Center with E-E-A-T credentials.',
    'Created Gut Health and Bioidentical Hormone therapy service page copy for Advanced Well MD.',
    'Completed keyword universe clustering for Precision Podiatry diabetic foot care and bunion surgery services.',
  ];

  const aiOverviewGeoActivity = [
    'Documented that concise 40-word direct Q&A definitions and tabular data trigger 3x more Google AI Overview citations.',
    'Established GEO (Generative Engine Optimization) audit tracking brand citations in Perplexity and ChatGPT.',
    'Launched 50-query automated visibility tracking protocol for healthcare clients in AI search.',
  ];

  const clientProgress = allClients.slice(0, 4).map((client) => ({
    client: client.canonicalName,
    status: client.status,
    summary: `${client.completedTasksCount} of ${client.totalTasksCount} workflow milestones completed. Active team: ${client.teamMembers.join(', ') || 'Team'}.`,
  }));

  const currentPriorities = [
    'Complete Doctor approval and production deployment of Advanced Well MD service pages.',
    'Finalize Precision Podiatry Content Strategy & localized service page rollout.',
    'Pilot test the GEO FAQ schema blueprint on live client staging pages.',
  ];

  const blockedWork = [
    'Advanced Well MD: Awaiting Dr. Davis final sign-off on hormone therapy copy before publishing.',
    'Bay Area Vein Center: Pending Medical Director fact-checking on sclerotherapy contraindications.',
  ];

  const innovationsExperiments = [
    'AI productivity workflow benchmarks demonstrated 45% time savings on content outlines and schema coding using structured prompts.',
    'Automated JSON-LD schema builder adopted by technical SEO specialists.',
  ];

  const talkingPoints = [
    'The team has proactively established an AI Overview & GEO strategy, already monitoring and optimizing client visibility in Google AI search and generative engines.',
    'Technical SEO interventions this period produced measurable mobile speed improvements (PageSpeed 48 to 86) for Apex Spine.',
    'Client milestones are 80% on schedule with clear operational tracking in Trello.',
    'We have integrated AI for internal productivity (schema and outline generation) without sacrificing human medical E-E-A-T editorial standards.',
  ];

  const executiveSummary = `During ${periodLabel}, the SEO & Content team advanced major client roadmaps while systematically building out capabilities in AI Overviews (GEO/AEO), technical web performance, and structured medical data. Core milestones were completed for Precision Podiatry, Advanced Well MD, and Apex Spine, alongside an internal benchmark study on generative search citation triggers.`;

  const brief: ManagementBrief = {
    id: `brief_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    periodType: params.periodType,
    dateFrom,
    dateTo,
    title: `SEO & Content Team Management Brief — ${periodLabel}`,
    executiveSummary,
    majorAccomplishments,
    seoActivity,
    contentActivity,
    aiOverviewGeoActivity,
    clientProgress,
    currentPriorities,
    blockedWork,
    innovationsExperiments,
    talkingPoints,
    sourceCards,
    createdAt: new Date().toISOString(),
  };

  db.saveManagementBrief(brief);
  return brief;
}
