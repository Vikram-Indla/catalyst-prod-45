import type {
  TheatreScript,
  TheatreContribution,
  TheatreCharacter,
  TheatrePerson,
  TheatrePersonRole,
} from './theatreTypes';

// ─── Role label derivation ────────────────────────────────────────────────────

function deriveRoleInJourney(person: TheatrePerson, script: TheatreScript): string {
  const roles = new Set(person.roles as TheatrePersonRole[]);

  // Check structural roles first
  if (roles.has('reporter') && roles.has('assignee')) {
    return 'Business Reporter & Delivery Owner';
  }
  if (roles.has('reporter')) {
    // Was the person the root reporter?
    const rootChar = script.characters.find((c) => c.key === script.rootKey);
    if (rootChar?.reporter?.id === person.id) {
      return 'Business Reporter / Originator';
    }
    return 'Reporter';
  }
  if (roles.has('incident-owner')) {
    return 'Incident Commander';
  }
  if (roles.has('qa-owner')) {
    return 'QA Owner / Test Lead';
  }
  if (roles.has('release-owner')) {
    return 'Release Owner';
  }
  if (roles.has('assignee')) {
    // Determine if they were the lead assignee (most days held)
    const allAssignedSegments = script.characters.flatMap((c) =>
      c.segments.filter((s) => s.assignee?.id === person.id),
    );
    const totalDays = allAssignedSegments.reduce((sum, s) => sum + (s.durationDays ?? 0), 0);
    if (totalDays >= 50) return 'Delivery Lead';
    return 'Story Owner / Assignee';
  }
  if (roles.has('contributor')) {
    return 'Contributor';
  }
  return 'Team Member';
}

// ─── Segment ownership helpers ────────────────────────────────────────────────

function itemsReportedBy(person: TheatrePerson, characters: TheatreCharacter[]): TheatreCharacter[] {
  return characters.filter((c) => c.reporter?.id === person.id);
}

function itemsOwnedBy(person: TheatrePerson, characters: TheatreCharacter[]): TheatreCharacter[] {
  return characters.filter((c) =>
    c.segments.some((s) => s.assignee?.id === person.id),
  );
}

function totalDaysHeld(person: TheatrePerson, characters: TheatreCharacter[]): number {
  let total = 0;
  for (const c of characters) {
    for (const s of c.segments) {
      if (s.assignee?.id === person.id && s.durationDays !== null) {
        total += s.durationDays;
      }
    }
  }
  return total;
}

function handoversReceived(person: TheatrePerson, characters: TheatreCharacter[]): number {
  let count = 0;
  for (const c of characters) {
    for (let i = 1; i < c.segments.length; i++) {
      const prev = c.segments[i - 1].assignee;
      const curr = c.segments[i].assignee;
      if (curr?.id === person.id && prev?.id !== person.id && prev !== null) {
        count++;
      }
    }
  }
  return count;
}

function handoversGiven(person: TheatrePerson, characters: TheatreCharacter[]): number {
  let count = 0;
  for (const c of characters) {
    for (let i = 1; i < c.segments.length; i++) {
      const prev = c.segments[i - 1].assignee;
      const curr = c.segments[i].assignee;
      if (prev?.id === person.id && curr?.id !== person.id && curr !== null) {
        count++;
      }
    }
  }
  return count;
}

function bugsHandled(person: TheatrePerson, characters: TheatreCharacter[]): TheatreCharacter[] {
  return characters.filter(
    (c) =>
      c.type === 'QA Bug' &&
      c.segments.some((s) => s.assignee?.id === person.id),
  );
}

function incidentsHandled(person: TheatrePerson, characters: TheatreCharacter[]): TheatreCharacter[] {
  return characters.filter(
    (c) =>
      c.type === 'Production Incident' &&
      c.segments.some((s) => s.assignee?.id === person.id),
  );
}

function sprintBoundWork(person: TheatrePerson, characters: TheatreCharacter[]): TheatreCharacter[] {
  return characters.filter(
    (c) =>
      c.segments.some((s) => s.assignee?.id === person.id) &&
      c.milestones.some((m) => m.type === 'sprint_entry' || m.type === 'sprint_end'),
  );
}

function releaseBoundWork(person: TheatrePerson, characters: TheatreCharacter[]): TheatreCharacter[] {
  return characters.filter(
    (c) =>
      c.segments.some((s) => s.assignee?.id === person.id) &&
      c.milestones.some((m) => m.type === 'release_assigned' || m.type === 'release_date'),
  );
}

function significantEvents(person: TheatrePerson, characters: TheatreCharacter[], script: TheatreScript): string[] {
  const highlights: string[] = [];

  // Reported items
  const reported = itemsReportedBy(person, characters);
  if (reported.length > 0) {
    const keys = reported.map((c) => c.key).join(', ');
    highlights.push(`Originated ${reported.length} item(s): ${keys}`);
  }

  // Handled regressions (assignee during regression period)
  for (const c of characters) {
    for (const r of c.regressions) {
      if (r.assignee?.id === person.id) {
        if (r.isBoomerang) {
          highlights.push(`Resolved boomerang on ${c.key} — returned from ${r.fromStatus} to Done`);
        } else {
          highlights.push(`Carried ${c.key} through regression — reworked from ${r.fromStatus} to ${r.toStatus}`);
        }
      }
    }
  }

  // Bugs closed
  const bugs = bugsHandled(person, characters).filter((c) => c.completedAt !== null);
  if (bugs.length > 0) {
    highlights.push(`Closed ${bugs.length} QA Bug(s): ${bugs.map((c) => c.key).join(', ')}`);
  }

  // Incidents resolved
  const incidents = incidentsHandled(person, characters).filter((c) => c.completedAt !== null);
  if (incidents.length > 0) {
    highlights.push(`Resolved ${incidents.length} Production Incident(s): ${incidents.map((c) => c.key).join(', ')}`);
  }

  // Late additions owned
  const lateOwned = itemsOwnedBy(person, characters).filter((c) => c.isLateAddition);
  if (lateOwned.length > 0) {
    highlights.push(`Absorbed ${lateOwned.length} scope-creep item(s) into delivery`);
  }

  // Handovers
  const received = handoversReceived(person, characters);
  const given = handoversGiven(person, characters);
  if (received > 0 || given > 0) {
    highlights.push(`${received} handover(s) received · ${given} handover(s) given`);
  }

  // Total days held
  const days = totalDaysHeld(person, characters);
  if (days > 30) {
    highlights.push(`Held items for ${days} cumulative days across the journey`);
  }

  return highlights;
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function involvementScore(contribution: TheatreContribution): number {
  return (
    contribution.totalDaysHeld +
    contribution.itemsOwned.length * 5 +
    contribution.handoversReceived * 3 +
    contribution.handoversGiven * 3 +
    contribution.bugsHandled.length * 4 +
    contribution.incidentsHandled.length * 8
  );
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export function buildContributions(script: TheatreScript): TheatreContribution[] {
  const contributions: TheatreContribution[] = [];
  const { characters, people } = script;

  for (const person of people) {
    const owned = itemsOwnedBy(person, characters);

    // Skip people with zero involvement (not on any segment or reporter)
    const reported = itemsReportedBy(person, characters);
    if (owned.length === 0 && reported.length === 0) continue;

    const contribution: TheatreContribution = {
      person,
      roleInJourney: deriveRoleInJourney(person, script),
      itemsReported: reported,
      itemsOwned: owned,
      totalDaysHeld: totalDaysHeld(person, characters),
      handoversReceived: handoversReceived(person, characters),
      handoversGiven: handoversGiven(person, characters),
      bugsHandled: bugsHandled(person, characters),
      incidentsHandled: incidentsHandled(person, characters),
      sprintBoundWork: sprintBoundWork(person, characters),
      releaseBoundWork: releaseBoundWork(person, characters),
      significantEvents: significantEvents(person, characters, script),
    };

    contributions.push(contribution);
  }

  // Sort by involvement score descending
  contributions.sort((a, b) => involvementScore(b) - involvementScore(a));

  return contributions;
}
