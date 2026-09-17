import { jsPDF } from 'jspdf';
import { ManagementBrief, ChatMessage } from '../types';

/**
 * Generates and triggers a direct PDF download for Executive Management Briefs.
 */
export function downloadBriefPDF(brief: ManagementBrief): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 45;
  let y = margin;
  let pageNum = 1;

  // Colors
  const darkNavy = [39, 39, 43]; // #27272B
  const brandPurple = [137, 99, 251]; // #8963FB
  const deepIndigo = [47, 32, 162]; // #2F20A2
  const textMuted = [93, 92, 104]; // #5D5C68
  const textLight = [110, 109, 123]; // #6E6D7B
  const borderGrey = [234, 234, 236]; // #EAEAEC
  const cardBg = [248, 248, 252]; // #F8F8FC
  const greenSuccess = [25, 135, 84]; // #198754
  const amberWarning = [217, 119, 6]; // #D97706

  const drawPageFooter = (p: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

    doc.text('Gold Flex Marketing • Executive SEO & Content Intelligence', margin, pageHeight - 18);
    doc.text(`Page ${p}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
  };

  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
    doc.text('EXECUTIVE STATUS BRIEF', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`Period: ${brief.dateFrom} to ${brief.dateTo}`, pageWidth - margin, 26, { align: 'right' });
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageWidth - margin, 32);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - bottomMargin) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawRunningHeader();
      y = 52;
    }
  };

  // --- FIRST PAGE HEADER ---
  // Top Banner Brand Strip
  doc.setFillColor(deepIndigo[0], deepIndigo[1], deepIndigo[2]);
  doc.rect(margin, y, contentWidth, 5, 'F');
  y += 18;

  // Organization & Sub-badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.text('GOLD FLEX MARKETING • CLIENT SEO & CONTENT TEAM', margin, y);
  y += 16;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  const splitTitle = doc.splitTextToSize(brief.title || 'Executive Management Brief', contentWidth);
  doc.text(splitTitle, margin, y);
  y += splitTitle.length * 20;

  // Metadata Row (Period & Date)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const metaText = `Reporting Period: ${brief.dateFrom} to ${brief.dateTo}   •   Generated: ${new Date(brief.createdAt).toLocaleDateString()} at ${new Date(brief.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(metaText, margin, y);
  y += 16;

  // Divider
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // --- KEY METRICS SUMMARY STRIP ---
  checkPageBreak(50);
  const metricColWidth = (contentWidth - 18) / 3;
  const metrics = [
    {
      label: brief.periodType === 'overall' ? 'ACTIVE DELIVERABLES' : 'CARDS COMPLETED',
      value: brief.periodType === 'overall' ? `${brief.activePipelineCount ?? 0}` : `${brief.cardsCompletedCount ?? 0}`,
      desc: brief.periodType === 'overall' ? 'Total pipeline work' : 'Marked complete in period',
    },
    {
      label: 'CHECKLIST ITEMS DONE',
      value: `${brief.checklistTasksCompletedCount ?? 0}`,
      desc: 'Granular tasks finalized',
    },
    {
      label: 'QUALITY REVIEW GATE',
      value: `${brief.sourceCards?.filter((s) => s.status === 'In Review')?.length || 0}`,
      desc: 'Pass-through medical QA',
    },
  ];

  metrics.forEach((m, idx) => {
    const xPos = margin + idx * (metricColWidth + 9);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(xPos, y, metricColWidth, 44, 4, 4, 'F');
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(xPos, y, metricColWidth, 44, 4, 4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(m.label, xPos + 10, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(m.value, xPos + 10, y + 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(m.desc, xPos + 10, y + 38);
  });
  y += 56;

  // --- EXECUTIVE SUMMARY BLOCK ---
  if (brief.executiveSummary) {
    checkPageBreak(70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('EXECUTIVE SUMMARY', margin, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const summaryLines = doc.splitTextToSize(brief.executiveSummary, contentWidth - 24);
    const summaryBoxHeight = summaryLines.length * 13 + 18;

    checkPageBreak(summaryBoxHeight);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 4, 4, 'F');
    doc.setDrawColor(brandPurple[0], brandPurple[1], brandPurple[2]);
    doc.setLineWidth(2.5);
    doc.line(margin, y, margin, y + summaryBoxHeight);

    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(summaryLines, margin + 12, y + 15);
    y += summaryBoxHeight + 14;
  }

  // --- HELPER: SECTION BUILDER ---
  const printBulletSection = (
    title: string,
    items: string[],
    bulletColor: number[] = brandPurple,
    headerColor: number[] = darkNavy
  ) => {
    if (!items || items.length === 0) return;

    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.text(title.toUpperCase(), margin, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

    for (const item of items) {
      const splitItem = doc.splitTextToSize(item, contentWidth - 18);
      const itemHeight = splitItem.length * 12 + 4;
      checkPageBreak(itemHeight);

      // Bullet dot
      doc.setFillColor(bulletColor[0], bulletColor[1], bulletColor[2]);
      doc.circle(margin + 5, y + 4, 2, 'F');

      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(splitItem, margin + 14, y + 7);
      y += itemHeight;
    }
    y += 10;
  };

  // Major Accomplishments
  printBulletSection('Major Accomplishments', brief.majorAccomplishments, greenSuccess, darkNavy);

  // Technical SEO
  printBulletSection('Technical SEO & Search Infrastructure', brief.seoActivity, brandPurple, darkNavy);

  // Content & E-E-A-T
  printBulletSection('Content Strategy & Medical E-E-A-T', brief.contentActivity, deepIndigo, darkNavy);

  // AI Overviews & GEO
  printBulletSection('AI Overviews & Generative Engine Optimization (GEO)', brief.aiOverviewGeoActivity, brandPurple, deepIndigo);

  // Client Progress Matrix
  if (brief.clientProgress && brief.clientProgress.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('CLIENT PROGRESS MATRIX', margin, y);
    y += 12;

    for (const cp of brief.clientProgress) {
      const splitSummary = doc.splitTextToSize(cp.summary, contentWidth - 24);
      const cardH = 22 + splitSummary.length * 11 + 6;
      checkPageBreak(cardH);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, 'F');
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(cp.client, margin + 10, y + 13);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(deepIndigo[0], deepIndigo[1], deepIndigo[2]);
      doc.text(`[ ${cp.status.toUpperCase()} ]`, pageWidth - margin - 10, y + 13, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(splitSummary, margin + 10, y + 25);

      y += cardH + 6;
    }
    y += 8;
  }

  // Priorities
  printBulletSection('Immediate Operational Priorities', brief.currentPriorities, textMuted, darkNavy);

  // Blocked / Awaiting Doctor Approval
  if (brief.blockedWork && brief.blockedWork.length > 0) {
    printBulletSection('Blocked / Awaiting Approvals', brief.blockedWork, amberWarning, amberWarning);
  }

  // Senior Management Talking Points
  if (brief.talkingPoints && brief.talkingPoints.length > 0) {
    checkPageBreak(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('SENIOR MANAGEMENT TALKING POINTS', margin, y);
    y += 12;

    for (const tp of brief.talkingPoints) {
      const splitTp = doc.splitTextToSize(tp, contentWidth - 28);
      const boxH = splitTp.length * 12 + 14;
      checkPageBreak(boxH);

      doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.roundedRect(margin, y, contentWidth, boxH, 4, 4, 'F');

      doc.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
      doc.circle(margin + 12, y + 10, 2.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(240, 240, 245);
      doc.text(splitTp, margin + 22, y + 13);

      y += boxH + 6;
    }
    y += 10;
  }

  // Footer for the last page
  drawPageFooter(pageNum);

  // Trigger download
  const safeFilename = (brief.title || 'Executive_Brief')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 50);
  doc.save(`${safeFilename}_${brief.dateFrom}_to_${brief.dateTo}.pdf`);
}

/**
 * Generates and triggers a direct PDF download for Assistant Executive Summaries / Answers.
 */
export function downloadChatSummaryPDF(message: ChatMessage, queryTitle: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 45;
  let y = margin;
  let pageNum = 1;

  // Colors
  const darkNavy = [39, 39, 43];
  const brandPurple = [137, 99, 251];
  const deepIndigo = [47, 32, 162];
  const textMuted = [93, 92, 104];
  const textLight = [110, 109, 123];
  const borderGrey = [234, 234, 236];
  const cardBg = [248, 248, 252];
  const greenSuccess = [25, 135, 84];

  const drawPageFooter = (p: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

    doc.text('Gold Flex Marketing • Intelligence Query Response', margin, pageHeight - 18);
    doc.text(`Page ${p}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - bottomMargin) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      y = margin;
    }
  };

  // Top Brand Header
  doc.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.rect(margin, y, contentWidth, 4, 'F');
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.text('GOLD FLEX MARKETING • EXECUTIVE INTELLIGENCE SUMMARY', margin, y);
  y += 15;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  const splitTitle = doc.splitTextToSize(queryTitle || 'Executive Intelligence Query', contentWidth);
  doc.text(splitTitle, margin, y);
  y += splitTitle.length * 19;

  // Date & Strength Badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const dateStr = message.createdAt
    ? new Date(message.createdAt).toLocaleString()
    : new Date().toLocaleString();
  const strength = message.evidenceStrength
    ? ` • Evidence Strength: ${message.evidenceStrength.toUpperCase()}`
    : '';
  doc.text(`Generated: ${dateStr}${strength}`, margin, y);
  y += 14;

  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // Status Breakdown (if available)
  if (message.statusBreakdown && Object.keys(message.statusBreakdown).length > 0) {
    checkPageBreak(30);
    const breakdownText = Object.entries(message.statusBreakdown)
      .map(([k, v]) => `${k}: ${v}`)
      .join('    •    ');
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(deepIndigo[0], deepIndigo[1], deepIndigo[2]);
    doc.text(`STATUS BREAKDOWN:   ${breakdownText}`, margin + 10, y + 15);
    y += 32;
  }

  // Key Points / Executive Summary
  if (message.keyPoints && message.keyPoints.length > 0) {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('EXECUTIVE KEY POINTS', margin, y);
    y += 12;

    for (const kp of message.keyPoints) {
      const splitKp = doc.splitTextToSize(kp, contentWidth - 18);
      const itemHeight = splitKp.length * 12 + 4;
      checkPageBreak(itemHeight);

      doc.setFillColor(greenSuccess[0], greenSuccess[1], greenSuccess[2]);
      doc.circle(margin + 5, y + 4, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(splitKp, margin + 14, y + 7);
      y += itemHeight;
    }
    y += 10;
  }

  // Answer Content
  if (message.content) {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('DETAILED EXECUTIVE SYNTHESIS', margin, y);
    y += 12;

    // Clean markdown hashes/stars for clean PDF text
    const cleanContent = message.content
      .replace(/^###\s+/gm, '')
      .replace(/^##\s+/gm, '')
      .replace(/^#\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

    const paragraphs = cleanContent.split('\n');
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) {
        y += 6;
        continue;
      }
      const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•');
      const textToPrint = isBullet ? trimmed.replace(/^[-•]\s*/, '') : trimmed;
      const splitP = doc.splitTextToSize(textToPrint, contentWidth - (isBullet ? 18 : 0));
      const pHeight = splitP.length * 12 + (isBullet ? 3 : 6);

      checkPageBreak(pHeight);

      if (isBullet) {
        doc.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
        doc.circle(margin + 5, y + 4, 2, 'F');
        doc.text(splitP, margin + 14, y + 7);
      } else {
        doc.text(splitP, margin, y + 7);
      }
      y += pHeight;
    }
    y += 10;
  }

  // Verified Sources
  if (message.sources && message.sources.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`VERIFIED TRELLO EVIDENCE (${message.sources.length} CARDS)`, margin, y);
    y += 12;

    for (const src of message.sources) {
      const snippet = src.snippet ? ` — "${src.snippet}"` : '';
      const text = `${src.title} [List: ${src.listName || 'Active'} | Status: ${src.status}]${snippet}`;
      const splitSrc = doc.splitTextToSize(text, contentWidth - 16);
      const srcH = splitSrc.length * 11 + 8;

      checkPageBreak(srcH);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.roundedRect(margin, y, contentWidth, srcH, 3, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(splitSrc, margin + 8, y + 10);

      y += srcH + 4;
    }
  }

  drawPageFooter(pageNum);

  const safeFilename = (queryTitle || 'Intelligence_Summary')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 50);
  doc.save(`${safeFilename}.pdf`);
}
