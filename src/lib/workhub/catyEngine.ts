/**
 * Caty AI Response Engine — Phase 10
 * Keyword-matching response generator using real WorkHub data
 */

export function generateSimulatedResponse(
  query: string,
  context: { kpis: any; releases: any; resources: any; insights: any }
): string {
  const q = query.toLowerCase();
  const { kpis, releases, resources, insights } = context;

  // PORTFOLIO STATUS
  if (
    q.includes('status') ||
    q.includes('overview') ||
    q.includes('how are we doing')
  ) {
    return (
      `Here's your portfolio overview:\n\n` +
      `Overall completion is at ${kpis?.overall_completion_percent || 0}% ` +
      `(${kpis?.done_work_items || 0} of ${kpis?.total_work_items || 0} items done).\n\n` +
      `You have ${kpis?.active_releases || 0} active releases and ` +
      `${kpis?.at_risk_releases || 0} at risk.\n\n` +
      `${kpis?.blocked_items || 0} items are currently blocked and ` +
      `${kpis?.overdue_items || 0} are overdue.\n\n` +
      `${kpis?.due_this_week || 0} items are due this week.`
    );
  }

  // RELEASES
  if (q.includes('release') || q.includes('deploy') || q.includes('ship')) {
    const active = releases?.filter((r: any) => r.status === 'Active') || [];
    const atRisk = releases?.filter((r: any) => r.status === 'At Risk') || [];
    let resp = `Release status:\n\n`;
    active.forEach((r: any) => {
      resp +=
        `${r.name} (${r.title}) — ${r.completion_percent}% complete, ` +
        `${r.total_items} items, due ${r.target_date}\n`;
    });
    if (atRisk.length > 0) {
      resp += `\nAt Risk:\n`;
      atRisk.forEach((r: any) => {
        resp +=
          `${r.name} (${r.title}) — ${r.completion_percent}% complete, ` +
          `${r.blocked_items} blocked items\n`;
      });
    }
    return resp;
  }

  // RESOURCES / TEAM / UTILIZATION
  if (
    q.includes('resource') ||
    q.includes('team') ||
    q.includes('utiliz') ||
    q.includes('who') ||
    q.includes('capacity') ||
    q.includes('overloaded')
  ) {
    const over = resources?.filter((r: any) => r.utilization_percent > 80) || [];
    const under =
      resources?.filter((r: any) => r.utilization_percent < 40) || [];
    let resp = `Team utilization summary (${resources?.length || 0} members):\n\n`;
    if (over.length > 0) {
      resp += `Over-utilized (>80%):\n`;
      over.forEach((r: any) => {
        resp += `  ${r.name} — ${r.utilization_percent}% (${r.active_items} active items)\n`;
      });
    }
    if (under.length > 0) {
      resp += `\nUnder-utilized (<40%):\n`;
      under.forEach((r: any) => {
        resp += `  ${r.name} — ${r.utilization_percent}% (${r.active_items} active items)\n`;
      });
    }
    resp += `\nAvg utilization: ${resources?.length ? Math.round(resources.reduce((s: number, r: any) => s + r.utilization_percent, 0) / resources.length) : 0}%`;
    return resp;
  }

  // BLOCKED / OVERDUE
  if (
    q.includes('blocked') ||
    q.includes('stuck') ||
    q.includes('impediment')
  ) {
    return (
      `There are ${kpis?.blocked_items || 0} blocked items across the portfolio.\n\n` +
      `Blocked items stall downstream work and should be prioritized in standup.\n\n` +
      `Recommendation: Review blocked items in the Work Items page and ` +
      `coordinate with assignees to resolve dependencies.`
    );
  }

  if (
    q.includes('overdue') ||
    q.includes('late') ||
    q.includes('behind')
  ) {
    return (
      `${kpis?.overdue_items || 0} items are past their due date.\n\n` +
      `Additionally, ${kpis?.due_this_week || 0} items are due this week.\n\n` +
      `Recommendation: Triage overdue items — either update due dates, ` +
      `reassign to available resources, or escalate blockers.`
    );
  }

  // THEMES
  if (
    q.includes('theme') ||
    q.includes('initiative') ||
    q.includes('strategic')
  ) {
    return (
      `You have ${kpis?.active_themes || 0} active strategic themes.\n\n` +
      `Check the Themes page for progress rings and linked work items.\n\n` +
      (insights?.actionItems
        ?.filter((a: any) => a.category === 'themes')
        .map((a: any) => `Note: ${a.title} — ${a.description}`)
        .join('\n') || '')
    );
  }

  // RECOMMENDATIONS
  if (
    q.includes('recommend') ||
    q.includes('suggest') ||
    q.includes('advice') ||
    q.includes('what should') ||
    q.includes('priorities')
  ) {
    const actions = insights?.actionItems || [];
    if (actions.length === 0) {
      return (
        `Everything looks healthy! No critical action items right now.\n\n` +
        `Keep monitoring the Dashboard for changes.`
      );
    }
    let resp = `Here are my top recommendations:\n\n`;
    actions.slice(0, 4).forEach((a: any, i: number) => {
      const icon = a.severity === 'high' ? '(!!)' : a.severity === 'medium' ? '(!)' : '(i)';
      resp += `${i + 1}. ${icon} ${a.title}\n   ${a.description}\n\n`;
    });
    return resp;
  }

  // FALLBACK
  return (
    `I can help with portfolio insights. Try asking about:\n\n` +
    `- Portfolio status or overview\n` +
    `- Release health and timelines\n` +
    `- Team utilization and capacity\n` +
    `- Blocked or overdue items\n` +
    `- Theme progress\n` +
    `- Recommendations and priorities\n\n` +
    `I analyze real-time data from your ProjectHub portfolio.`
  );
}
