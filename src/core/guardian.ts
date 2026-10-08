import { strike } from './chaser';
import { dash, launchDash } from './charger';
import type { Content, GuardianMonsterType, GuardianPattern } from './content';
import { boxAround, expandBox, overlaps } from './geometry';
import type { GameEvent } from './interface';
import { laneAhead } from './lanes';
import { directionToward, walkMonster } from './monster-movement';
import { heroBody, monsterBody } from './state';
import type { MonsterAction, MonsterState, PlayState } from './state';

// The Guardian: notices the hero, and attacks with its patterns in turn. Each pattern is one telegraphed attack that
// the chaser, the charger or nobody else makes: a sweep around its body, a charge along a lane, a smite on the spot
// where the hero stood. Nothing is random. When it is free to decide, it takes the first pattern that reaches the hero,
// starting from the one after the last it made, and when none reaches it walks toward the hero. A hero's hit never
// interrupts a wind-up. The noticing distance, the sweep's reach and the smite's range are measured from the
// Guardian's body, as a square around it.

type WindingUp = Extract<MonsterAction, { type: 'winding-up' }>;

/** One fixed step of a Guardian. */
export function stepGuardian(
  monster: MonsterState,
  type: GuardianMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const action = monster.action;
  if (action.type === 'winding-up') {
    action.elapsed += 1;
    if (action.elapsed < action.length) {
      return [];
    }
    const pattern = patternInProgress(monster, type);
    return pattern.kind === 'charge' ? launchDash(monster, action) : strike(monster, action, pattern, state, content);
  }
  if (action.type === 'dashing') {
    const pattern = patternInProgress(monster, type);
    if (pattern.kind !== 'charge') {
      throw new Error(`Guardian "${monster.id}" dashes in the middle of a ${pattern.kind}`);
    }
    return dash(monster, action, { ...pattern, size: type.size }, state, content);
  }
  if (action.type === 'recovering') {
    action.stepsLeft -= 1;
    if (action.stepsLeft > 0) {
      return [];
    }
  }
  decide(monster, type, state, content);
  return [];
}

/** The Guardian is free: it winds up the first pattern that reaches the hero, walks toward the hero, or stays where it is. */
function decide(monster: MonsterState, type: GuardianMonsterType, state: PlayState, content: Content): void {
  const body = monsterBody(monster, content);
  if (!overlaps(heroBody(state, content), expandBox(body, type.noticingDistance))) {
    monster.action = { type: 'idle' };
    return;
  }
  const count = type.patterns.length;
  const first = nextPatternOf(monster, type);
  for (let turn = 0; turn < count; turn += 1) {
    const index = (first + turn) % count;
    const windUp = windUpOf(patternAt(type, index), monster, type, state, content);
    if (windUp !== null) {
      monster.action = windUp;
      monster.nextPattern = (index + 1) % count;
      return;
    }
  }
  monster.action = { type: 'chasing' };
  const direction = directionToward(monster.position, state.hero.position);
  walkMonster(monster, type.size, direction, type.speedPerStep, state, content);
}

/** The wind-up of this pattern, with its zone or lane fixed from where the hero is now, or null when it does not reach the hero. */
function windUpOf(
  pattern: GuardianPattern,
  monster: MonsterState,
  type: GuardianMonsterType,
  state: PlayState,
  content: Content,
): WindingUp | null {
  const hero = heroBody(state, content);
  const length = pattern.windUpSteps;
  switch (pattern.kind) {
    case 'sweep': {
      const zone = expandBox(monsterBody(monster, content), pattern.reach);
      return overlaps(hero, zone) ? { type: 'winding-up', zone, elapsed: 0, length } : null;
    }
    case 'charge': {
      const direction = directionToward(monster.position, state.hero.position);
      const lane = laneAhead(state, content, monster.position, type.size, direction, pattern.dashRange);
      return overlaps(hero, lane) ? { type: 'winding-up', zone: lane, elapsed: 0, length, direction } : null;
    }
    case 'smite': {
      if (!overlaps(hero, expandBox(monsterBody(monster, content), pattern.range))) {
        return null;
      }
      return { type: 'winding-up', zone: boxAround(state.hero.position, pattern.size), elapsed: 0, length };
    }
  }
}

/** The pattern the Guardian is making while it winds up, dashes or recovers: the one before the next in the turns. */
function patternInProgress(monster: MonsterState, type: GuardianMonsterType): GuardianPattern {
  const count = type.patterns.length;
  return patternAt(type, (nextPatternOf(monster, type) + count - 1) % count);
}

function patternAt(type: GuardianMonsterType, index: number): GuardianPattern {
  const pattern = type.patterns[index];
  if (pattern === undefined) {
    throw new Error(`The Guardian has no pattern ${index}`);
  }
  return pattern;
}

function nextPatternOf(monster: MonsterState, type: GuardianMonsterType): number {
  const next = monster.nextPattern;
  if (next === undefined || !Number.isInteger(next) || next < 0 || next >= type.patterns.length) {
    throw new Error(`Guardian "${monster.id}" has no pattern to make next`);
  }
  return next;
}
