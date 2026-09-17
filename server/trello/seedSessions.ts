import { ChatSession } from '../../src/types';

export function getSeedChatSessions(): ChatSession[] {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: 'session_ai_overviews',
      title: 'What are we doing with AI Overviews?',
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
      messages: [
        {
          id: 'msg_ai_1_user',
          role: 'user',
          content: 'What are we doing with AI Overviews?',
          createdAt: oneHourAgo,
          timestamp: oneHourAgo,
        },
        {
          id: 'msg_ai_1_asst',
          role: 'assistant',
          content: `### Executive Summary
The SEO/Content team is actively testing and executing AI Overviews optimization for medical and wellness clients. Work is currently split between live structured data deployments for Precision Podiatry and experimental informational format audits.

### Key Points
- **Adil** deployed automated schema generation tools to target Google AI Overview snippet triggers.
- **Haseeb Afzal** completed formatting review on 12 medical FAQs structured specifically for conversational search extraction.
- In-process testing is tracking citation rates across 45 target keywords for local health terms.

### Status Breakdown
- **In Process:** 2 initiatives
- **Completed:** 2 milestones
- **To Do:** 1 scheduled benchmark audit`,
          summary: 'Active execution on schema markup, FAQ restructuring, and tracking keyword citation visibility in Google AI Overviews.',
          keyPoints: [
            'Adil deployed schema automation tool saving 3 hours per client',
            '12 medical FAQ clusters reformatted for AI Overview citations',
            'Benchmarking 45 target local keywords for Precision Podiatry',
          ],
          statusBreakdown: {
            'In Process': 2,
            'Completed': 2,
            'To Do': 1,
          },
          evidenceStrength: 'high',
          sources: [
            {
              cardId: 'card_aio_audit',
              title: 'AI Overviews & Google Search Generative Optimization',
              url: 'https://trello.com/c/aio-audit',
              relevance: 95,
              reason: 'Direct match on AI Overviews tracking card',
              date: oneHourAgo,
              status: 'In Process',
              listName: 'In Process',
              snippet: 'Tracking snippet appearances for conversational search queries across medical accounts.',
            },
            {
              cardId: 'card_schema_automation',
              title: 'Automated Medical Schema Generation Tool',
              url: 'https://trello.com/c/schema-auto',
              relevance: 88,
              reason: 'Schema tooling directly supports AI Overview eligibility',
              date: oneHourAgo,
              status: 'Completed',
              listName: 'Done / Completed',
              snippet: 'Deployed JSON-LD generator for Physician and MedicalProcedure entities.',
            },
          ],
          searchMetadata: {
            resultCount: 2,
            intent: 'ai_strategy',
            topic: 'AI Overviews & Search Intelligence',
          },
          createdAt: oneHourAgo,
        },
      ],
    },
    {
      id: 'session_precision_podiatry',
      title: 'Precision Podiatry workstream & progress',
      createdAt: yesterday,
      updatedAt: yesterday,
      messages: [
        {
          id: 'msg_pp_1_user',
          role: 'user',
          content: 'What is happening with Precision Podiatry right now?',
          createdAt: yesterday,
          timestamp: yesterday,
        },
        {
          id: 'msg_pp_1_asst',
          role: 'assistant',
          content: `### Executive Summary
Precision Podiatry has 4 active deliverables across technical SEO and localized landing pages. Core focus is on custom orthotics content and schema deployment.

### Key Points
- **Landing Pages:** Custom orthotics & heel pain service pages passed internal QA and medical accuracy review.
- **Local Citations:** Hamza finished auditing Google Business Profile location synchronization across both clinic branches.
- **Technical Milestones:** Core Web Vitals score improved from 68 to 91 after image WebP optimization.`,
          summary: 'Precision Podiatry has completed localized landing pages and medical review, with schema deployments currently underway.',
          keyPoints: [
            'Orthotics & heel pain service pages approved for production publish',
            'Google Business Profile location citations verified across 2 branches',
            'Technical speed score uplifted to 91',
          ],
          statusBreakdown: {
            Completed: 3,
            'In Process': 1,
          },
          evidenceStrength: 'high',
          sources: [
            {
              cardId: 'card_precision_podiatry_q3',
              title: 'Precision Podiatry - Q3 SEO Campaign & Content Delivery',
              url: 'https://trello.com/c/pp-q3',
              relevance: 96,
              reason: 'Direct match on client canonical account card',
              date: yesterday,
              client: 'Precision Podiatry',
              status: 'In Process',
              listName: 'GFM Clients',
              snippet: 'Checklist completed: 6 of 8 deliverables signed off.',
            },
          ],
          searchMetadata: {
            resultCount: 1,
            intent: 'client_status',
            topic: 'Precision Podiatry Account Status',
          },
          createdAt: yesterday,
        },
      ],
    },
    {
      id: 'session_team_accomplishments',
      title: 'Team deliverables and accomplishments this week',
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
      messages: [
        {
          id: 'msg_team_1_user',
          role: 'user',
          content: 'What did the team accomplish this week?',
          createdAt: twoDaysAgo,
          timestamp: twoDaysAgo,
        },
        {
          id: 'msg_team_1_asst',
          role: 'assistant',
          content: `### Executive Summary
The team completed 7 major milestones across 3 client accounts and internal workflow tooling. Production velocity was driven by Adil's schema automation rollout and Haseeb's content publishing batch.

### Key Deliverables
- **Tooling:** Automated Medical Schema Tool launched to production, cutting client onboarding overhead.
- **Content:** 8 comprehensive clinical service guides published and indexed across medical practice clients.
- **QA Approvals:** Zero compliance or medical review rejections on deliverables this sprint.`,
          summary: '7 milestone deliveries finished across internal automation and client SEO execution.',
          keyPoints: [
            'Automated schema generator deployed to live environment',
            '8 clinical service guides published',
            '100% first-pass medical compliance approval rate',
          ],
          statusBreakdown: {
            Completed: 7,
            'In Process': 3,
          },
          evidenceStrength: 'high',
          sources: [
            {
              cardId: 'card_weekly_sprint_done',
              title: 'Sprint Accomplishments & Weekly Delivery Board',
              url: 'https://trello.com/c/sprint-done',
              relevance: 92,
              reason: 'Sprint completion log and activity board',
              date: twoDaysAgo,
              status: 'Completed',
              listName: 'Done / Completed',
              snippet: 'All checklist items finalized with verified stakeholder sign-offs.',
            },
          ],
          searchMetadata: {
            resultCount: 1,
            intent: 'accomplishments',
            topic: 'Team Deliverables & Sprint Velocity',
          },
          createdAt: twoDaysAgo,
        },
      ],
    },
  ];
}
