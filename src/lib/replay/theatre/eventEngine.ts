import type {
  TheatreScript,
  TheatreEvent,
  TheatreEventType,
  TheatreCharacter,
  TheatrePerson,
  TheatreStatusSegment,
  TheatreMilestone,
} from './theatreTypes';

// ─── Pause durations ──────────────────────────────────────────────────────────

const PAUSE: Record<TheatreEventType, number> = {
  replay_opening: 4000,
  person_entered: 2000,
  item_created: 2500,
  branch_created: 3000,
  status_transition: 1800,
  assignee_handover: 2500,
  sprint_assigned: 2800,
  release_assigned: 2800,
  regression_started: 3500,
  boomerang_returned: 3500,
  hold_started: 2000,
  hold_released: 2000,
  late_item_added: 3000,
  item_completed: 2000,
  branch_completed: 3500,
  final_map_formed: 5000,
  contribution_credits: 8000,
};

// ─── ID generation ────────────────────────────────────────────────────────────

let _seq = 0;

function nextId(prefix: string): string {
  _seq += 1;
  return `${prefix}-${String(_seq).padStart(4, '0')}`;
}

// ─── Narrative helpers ────────────────────────────────────────────────────────

function itemLabel(character: TheatreCharacter): string {
  return `${character.type} ${character.key}`;
}

function personLabel(person: TheatrePerson): string {
  return person.name.split(' ')[0]; // first name only for brevity
}

function categoryToVerb(category: string): string {
  if (category === 'Done') return 'completed';
  if (category === 'In Progress') return 'started work on';
  return 'queued';
}

function durationLabel(days: number | null): string {
  if (days === null) return 'ongoing';
  if (days === 0) return 'same day';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// ─── Group detection ──────────────────────────────────────────────────────────

/**
 * If 3+ events share the same parentKey and fall within 3 calendar days,
 * assign them a groupId so the renderer can collapse them.
 */
function assignGroupIds(events: TheatreEvent[]): void {
  const DAY_MS = 86400000;
  const WINDOW_MS = 3 * DAY_MS;
  const MIN_GROUP = 3;

  // Bucket events by parentKey (character.parentKey or character.key for roots)
  const byBranch: Map<string, TheatreEvent[]> = new Map();
  for (const ev of events) {
    const branchKey = ev.character?.parentKey ?? ev.character?.key ?? '__root';
    if (!byBranch.has(branchKey)) byBranch.set(branchKey, []);
    byBranch.get(branchKey)!.push(ev);
  }

  let groupSeq = 0;
  for (const [branchKey, branchEvents] of byBranch.entries()) {
    // Sliding window
    let windowStart = 0;
    while (windowStart < branchEvents.length) {
      const anchor = new Date(branchEvents[windowStart].date).getTime();
      const windowEnd = windowStart + 1;
      let wEnd = windowEnd;
      while (
        wEnd < branchEvents.length &&
        new Date(branchEvents[wEnd].date).getTime() - anchor <= WINDOW_MS
      ) {
        wEnd++;
      }
      const count = wEnd - windowStart;
      if (count >= MIN_GROUP) {
        groupSeq++;
        const gid = `group-${branchKey}-${groupSeq}`;
        const label = `${count} related events in ${branchKey} branch`;
        for (let i = windowStart; i < wEnd; i++) {
          branchEvents[i].groupId = gid;
          branchEvents[i].groupLabel = label;
        }
        windowStart = wEnd;
      } else {
        windowStart++;
      }
    }
  }
}

// ─── Event builders ───────────────────────────────────────────────────────────

function buildPersonEnteredEvent(
  person: TheatrePerson,
  enteredAt: string,
  character: TheatreCharacter,
): TheatreEvent {
  return {
    id: nextId('evt'),
    type: 'person_entered',
    date: enteredAt,
    pauseMs: PAUSE.person_entered,
    person,
    character,
    headline: `${person.name} joined the journey`,
    subheadline: `${person.roles.join(', ')} on ${character.key}`,
    bullets: [
      `${person.name} first appears as ${person.roles[0]} on ${itemLabel(character)}`,
      `Entered the story on ${enteredAt.split('T')[0]}`,
    ],
    whyItMatters: `Every new participant brings accountability. ${person.name} steps in to carry ${character.type.toLowerCase()} ${character.key} forward.`,
    focusKey: character.key,
    cameraAction: 'pan-to-item',
    animationType: 'avatar-move',
  };
}

function buildItemCreatedEvent(character: TheatreCharacter): TheatreEvent {
  const isLate = character.isLateAddition;
  const type: TheatreEventType = isLate ? 'late_item_added' : 'item_created';
  const lateSuffix = isLate && character.daysLateAfterParent
    ? ` — added ${character.daysLateAfterParent} days after its parent started`
    : '';

  return {
    id: nextId('evt'),
    type,
    date: character.createdAt,
    pauseMs: isLate ? PAUSE.late_item_added : PAUSE.item_created,
    character,
    person: character.reporter ?? undefined,
    headline: isLate
      ? `${itemLabel(character)} entered the story late`
      : `${itemLabel(character)} entered the delivery pipeline`,
    subheadline: character.title + lateSuffix,
    bullets: [
      `"${character.title}" created on ${character.createdAt.split('T')[0]}`,
      character.reporter ? `Reported by ${character.reporter.name}` : 'Reporter unknown',
      isLate ? `Scope addition — ${character.daysLateAfterParent ?? 0} days after its parent` : `Hierarchy level ${character.hierarchyLevel}`,
      `Source: ${character.moduleSource}`,
    ],
    whyItMatters: isLate
      ? `Late scope additions expand the delivery surface mid-flight. ${itemLabel(character)} adds complexity to an already-in-progress initiative.`
      : `The delivery tree grows. ${itemLabel(character)} represents a new branch of work under ${character.parentKey ?? 'the root'}.`,
    focusKey: character.key,
    cameraAction: 'pan-to-item',
    animationType: isLate ? 'fade-in' : 'branch-grow',
  };
}

function buildBranchCreatedEvent(
  character: TheatreCharacter,
  parentCharacter: TheatreCharacter,
): TheatreEvent {
  return {
    id: nextId('evt'),
    type: 'branch_created',
    date: character.createdAt,
    pauseMs: PAUSE.branch_created,
    character,
    headline: `A new branch grows under ${itemLabel(parentCharacter)}`,
    subheadline: `"${character.title}" opens a new delivery path`,
    bullets: [
      `${itemLabel(character)} is the first child of ${parentCharacter.key}`,
      `Branch point: ${character.createdAt.split('T')[0]}`,
      `Parent: "${parentCharacter.title}"`,
    ],
    whyItMatters: `The work decomposing into child items signals active planning. This branch will carry its own status journey.`,
    focusKey: parentCharacter.key,
    cameraAction: 'zoom-in',
    animationType: 'branch-grow',
  };
}

function buildStatusTransitionEvent(
  character: TheatreCharacter,
  prevSeg: TheatreStatusSegment,
  currSeg: TheatreStatusSegment,
): TheatreEvent {
  const dwellLabel = durationLabel(prevSeg.durationDays);
  return {
    id: nextId('evt'),
    type: 'status_transition',
    date: currSeg.startAt,
    pauseMs: PAUSE.status_transition,
    character,
    fromStatus: prevSeg.status,
    toStatus: currSeg.status,
    durationDays: prevSeg.durationDays ?? undefined,
    person: currSeg.assignee ?? undefined,
    headline: `${itemLabel(character)} moved from ${prevSeg.status} → ${currSeg.status}`,
    subheadline: `Spent ${dwellLabel} in ${prevSeg.status}`,
    bullets: [
      `${character.key}: "${character.title}"`,
      `Transition on ${currSeg.startAt.split('T')[0]}`,
      `Prior status held for ${dwellLabel}`,
      currSeg.assignee ? `Now owned by ${currSeg.assignee.name}` : 'Unassigned',
    ],
    whyItMatters: `Status movement is proof of delivery. ${character.key} spent ${dwellLabel} in ${prevSeg.status} before advancing to ${currSeg.status}.`,
    focusKey: character.key,
    cameraAction: 'pan-to-item',
    animationType: 'path-draw',
  };
}

function buildAssigneeHandoverEvent(
  character: TheatreCharacter,
  fromPerson: TheatrePerson,
  toPerson: TheatrePerson,
  seg: TheatreStatusSegment,
): TheatreEvent {
  return {
    id: nextId('evt'),
    type: 'assignee_handover',
    date: seg.startAt,
    pauseMs: PAUSE.assignee_handover,
    character,
    fromPerson,
    toPerson,
    headline: `${fromPerson.name} handed ${character.key} to ${toPerson.name}`,
    subheadline: `Handover during ${seg.status}`,
    bullets: [
      `${character.key}: "${character.title}"`,
      `Handover on ${seg.startAt.split('T')[0]}`,
      `From: ${fromPerson.name} → To: ${toPerson.name}`,
      `Status at time of handover: ${seg.status}`,
    ],
    whyItMatters: `Handovers transfer accountability. Tracking them reveals where delivery velocity changed hands and whether context was preserved.`,
    focusKey: character.key,
    cameraAction: 'pan-to-item',
    animationType: 'avatar-move',
  };
}

function buildMilestoneEvent(
  character: TheatreCharacter,
  milestone: TheatreMilestone,
): TheatreEvent {
  const type: TheatreEventType =
    milestone.type === 'sprint_entry' || milestone.type === 'sprint_end'
      ? 'sprint_assigned'
      : 'release_assigned';

  return {
    id: nextId('evt'),
    type,
    date: milestone.at,
    pauseMs: type === 'sprint_assigned' ? PAUSE.sprint_assigned : PAUSE.release_assigned,
    character,
    milestone,
    headline: `${itemLabel(character)} linked to ${milestone.label}`,
    subheadline: milestone.context,
    bullets: [
      `${character.key}: "${character.title}"`,
      `${milestone.type.replace('_', ' ')} on ${milestone.at.split('T')[0]}`,
      `Context: ${milestone.context}`,
    ],
    whyItMatters:
      milestone.type === 'release_assigned'
        ? `Attaching to a release creates a delivery commitment. ${character.key} is now tracked against ${milestone.label}.`
        : `Sprint planning locks scope into a time-box. ${character.key} enters ${milestone.label}.`,
    focusKey: character.key,
    cameraAction: 'pan-to-item',
    animationType: 'milestone-drop',
  };
}

function buildRegressionEvent(
  character: TheatreCharacter,
  fromStatus: string,
  toStatus: string,
  startAt: string,
  durationDays: number | null,
  isBoomerang: boolean,
  person: TheatrePerson | null,
): TheatreEvent {
  const type: TheatreEventType = isBoomerang ? 'boomerang_returned' : 'regression_started';
  return {
    id: nextId('evt'),
    type,
    date: startAt,
    pauseMs: isBoomerang ? PAUSE.boomerang_returned : PAUSE.regression_started,
    character,
    fromStatus,
    toStatus,
    durationDays: durationDays ?? undefined,
    person: person ?? undefined,
    headline: isBoomerang
      ? `${character.key} boomeranged — returned from Done to ${toStatus}`
      : `${character.key} regressed from ${fromStatus} back to ${toStatus}`,
    subheadline: isBoomerang
      ? 'A completed item was reopened'
      : `Regression detected — review feedback required rework`,
    bullets: [
      `${character.key}: "${character.title}"`,
      `Regression on ${startAt.split('T')[0]}`,
      `From ${fromStatus} → ${toStatus}`,
      durationDays ? `Regression lasted ${durationLabel(durationDays)}` : 'Regression duration ongoing',
      person ? `Assigned to ${person.name} for rework` : 'Unassigned rework',
    ],
    whyItMatters: isBoomerang
      ? `A boomerang signals that "Done" was declared prematurely. The item returned to active work after being closed, adding unexpected cycle time.`
      : `Regressions expose hidden complexity. ${character.key} moved backward, consuming additional delivery capacity before advancing again.`,
    focusKey: character.key,
    cameraAction: 'zoom-in',
    animationType: isBoomerang ? 'regression-arc' : 'regression-arc',
  };
}

function buildItemCompletedEvent(character: TheatreCharacter): TheatreEvent {
  const lastSeg = character.segments[character.segments.length - 1];
  const totalDays = character.segments.reduce(
    (sum, s) => sum + (s.durationDays ?? 0),
    0,
  );

  return {
    id: nextId('evt'),
    type: 'item_completed',
    date: character.completedAt!,
    pauseMs: PAUSE.item_completed,
    character,
    person: lastSeg?.assignee ?? undefined,
    headline: `${itemLabel(character)} completed its journey`,
    subheadline: `"${character.title}" — ${totalDays} days from creation to Done`,
    bullets: [
      `${character.key} reached ${lastSeg?.status ?? 'Done'} on ${character.completedAt!.split('T')[0]}`,
      `Total cycle time: ${durationLabel(totalDays)}`,
      `${character.segments.length} status transitions`,
      character.regressions.length > 0
        ? `${character.regressions.length} regression(s) along the way`
        : 'Clean run — no regressions',
    ],
    whyItMatters: `Completion is the moment delivery is realised. ${character.key} took ${totalDays} days to traverse its full journey from creation to Done.`,
    focusKey: character.key,
    cameraAction: 'zoom-out',
    animationType: 'complete-pulse',
  };
}

function buildFinalMapEvent(script: TheatreScript): TheatreEvent {
  const lastCompletedAt = script.characters
    .filter((c) => c.completedAt)
    .map((c) => c.completedAt!)
    .sort()
    .pop() ?? new Date().toISOString();

  return {
    id: nextId('evt'),
    type: 'final_map_formed',
    date: lastCompletedAt,
    pauseMs: PAUSE.final_map_formed,
    headline: `The full delivery map of "${script.rootTitle}"`,
    subheadline: `${script.stats.totalDays} days · ${script.characters.length} items · ${script.people.length} contributors`,
    bullets: [
      `${script.stats.completedItems} items completed, ${script.stats.openItems} still open`,
      `${script.stats.regressions} regression(s), ${script.stats.boomerangs} boomerang(s)`,
      `${script.stats.lateAdditions} late addition(s) identified`,
      `${script.stats.handovers} handover(s) across the team`,
      `Longest dwell: ${script.stats.longestDwellStatus} (${durationLabel(script.stats.longestDwellDays)})`,
    ],
    whyItMatters: `The delivery map reveals the full shape of the journey — every branch, every transition, every handover and regression that defined how this work moved from idea to production.`,
    focusKey: null,
    cameraAction: 'survey',
    animationType: 'map-form',
  };
}

function buildCreditsEvent(script: TheatreScript): TheatreEvent {
  const lastDate = script.events.length > 0
    ? script.events[script.events.length - 1].date
    : new Date().toISOString();

  return {
    id: nextId('evt'),
    type: 'contribution_credits',
    date: lastDate,
    pauseMs: PAUSE.contribution_credits,
    headline: `The cast who carried "${script.rootTitle}"`,
    subheadline: `${script.people.length} contributors · ${script.period}`,
    bullets: script.people.map((p) => `${p.name} — ${p.roles.join(', ')}`),
    whyItMatters: `Every delivery is a team story. These are the people whose decisions, handovers, and daily work shaped the outcome.`,
    focusKey: null,
    cameraAction: 'survey',
    animationType: 'credits-roll',
  };
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export function buildTheatreEvents(script: TheatreScript): TheatreEvent[] {
  // Reset sequence for determinism
  _seq = 0;

  const events: TheatreEvent[] = [];

  // Track which people have already appeared
  const enteredPeople = new Set<string>();

  // Track first child per parent to detect branch_created
  const firstChildByParent = new Map<string, string>();

  // Sort characters by createdAt ascending
  const sorted = [...script.characters].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  for (const character of sorted) {
    // ── Person entered (reporter, before item_created)
    const reporter = character.reporter;
    if (reporter && !enteredPeople.has(reporter.id)) {
      enteredPeople.add(reporter.id);
      events.push(buildPersonEnteredEvent(reporter, reporter.enteredAt, character));
    }

    // ── Assignee from first segment (if not already entered)
    const firstAssignee = character.segments[0]?.assignee ?? null;
    if (firstAssignee && !enteredPeople.has(firstAssignee.id)) {
      enteredPeople.add(firstAssignee.id);
      events.push(buildPersonEnteredEvent(firstAssignee, character.createdAt, character));
    }

    // ── Branch created (first child of a parent)
    if (character.parentKey) {
      const parent = script.characters.find((c) => c.key === character.parentKey);
      if (parent && !firstChildByParent.has(character.parentKey)) {
        firstChildByParent.set(character.parentKey, character.key);
        events.push(buildBranchCreatedEvent(character, parent));
      }
    }

    // ── Item created / late_item_added
    events.push(buildItemCreatedEvent(character));

    // ── Process segments: transitions, handovers, milestones, regressions
    for (let i = 0; i < character.segments.length; i++) {
      const seg = character.segments[i];

      // Status transition (from previous seg)
      if (i > 0) {
        const prevSeg = character.segments[i - 1];
        events.push(buildStatusTransitionEvent(character, prevSeg, seg));

        // Detect regression: if this transition reverses category progress
        const prevCat = prevSeg.category;
        const currCat = seg.category;
        const catOrder = { 'To Do': 0, 'In Progress': 1, Done: 2 };
        const isRegression =
          catOrder[currCat as keyof typeof catOrder] <
          catOrder[prevCat as keyof typeof catOrder];

        if (isRegression) {
          // Find matching regression record
          const matchingRegression = character.regressions.find(
            (r) => r.startAt === seg.startAt,
          );
          if (matchingRegression) {
            const evType = matchingRegression.isBoomerang
              ? 'boomerang_returned'
              : 'regression_started';
            events.push(
              buildRegressionEvent(
                character,
                matchingRegression.fromStatus,
                matchingRegression.toStatus,
                matchingRegression.startAt,
                matchingRegression.durationDays,
                matchingRegression.isBoomerang,
                matchingRegression.assignee,
              ),
            );
            void evType; // used implicitly via buildRegressionEvent
          }
        }

        // Assignee handover
        const prevAssignee = prevSeg.assignee;
        const currAssignee = seg.assignee;
        if (prevAssignee && currAssignee && prevAssignee.id !== currAssignee.id) {
          // Ensure new assignee has "entered"
          if (!enteredPeople.has(currAssignee.id)) {
            enteredPeople.add(currAssignee.id);
            events.push(buildPersonEnteredEvent(currAssignee, seg.startAt, character));
          }
          events.push(buildAssigneeHandoverEvent(character, prevAssignee, currAssignee, seg));
        }
      }
    }

    // ── Milestones (sprint/release)
    for (const milestone of character.milestones) {
      events.push(buildMilestoneEvent(character, milestone));
    }

    // ── Item completed
    if (character.completedAt) {
      events.push(buildItemCompletedEvent(character));
    }
  }

  // ── Final map
  const finalMapEvent = buildFinalMapEvent(script);
  events.push(finalMapEvent);

  // ── Credits
  const creditsEvent = buildCreditsEvent({ ...script, events });
  events.push(creditsEvent);

  // Sort events chronologically
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Assign group IDs for dense event windows
  assignGroupIds(events);

  return events;
}
