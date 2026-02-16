import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { NeonCard } from "../components/NeonCard";
import { StatBadge } from "../components/StatBadge";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

type Team = "ally" | "enemy";
type ActorId = "player" | "ally-1" | "enemy-1" | "enemy-2";

interface Vec2 {
  x: number;
  y: number;
}

interface RectObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Actor {
  id: ActorId;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hasChip: boolean;
  tackleLock: number;
}

interface ChipState {
  x: number;
  y: number;
  holderId: ActorId | null;
  respawnLeft: number;
}

interface ArenaState {
  width: number;
  height: number;
  tick: number;
  actors: Actor[];
  chip: ChipState;
}

interface StickState {
  active: boolean;
  x: number;
  y: number;
  intensity: number;
}

type ArenaEvent =
  | { type: "pickup"; actorId: ActorId; team: Team }
  | { type: "score"; actorId: ActorId; team: Team }
  | { type: "tackle"; actorId: ActorId; team: Team; targetId: ActorId };

interface FrameResult {
  next: ArenaState;
  events: ArenaEvent[];
  allyScoreGain: number;
  enemyScoreGain: number;
}

interface CombatModifiers {
  speedScale: number;
  dashScale: number;
  tackleBonus: number;
  interceptRangeBonus: number;
  passXpBonus: number;
}

interface ImpactFx {
  x: number;
  y: number;
  team: Team;
}

type SfxType = "pickup" | "score" | "tackle" | "skill";

const NativeSoundManager: { playTouchSound?: () => void } | undefined =
  Platform.OS === "android"
    ? // Internal RN sound manager is available on Android and gives us lightweight click FX without extra deps.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("react-native/Libraries/Components/Sound/SoundManager")
    : undefined;

const FIELD_HEIGHT = 232;
const DEFAULT_FIELD_WIDTH = 320;
const FIELD_TICK_MS = 50;
const FIELD_DT_SECONDS = FIELD_TICK_MS / 1000;
const JOYSTICK_PAD_SIZE = 116;
const JOYSTICK_RADIUS = 36;
const ACTOR_RADIUS = 12;
const CHIP_RADIUS = 8;
const PICKUP_RANGE = 18;
const TACKLE_RANGE = 20;
const BASE_RADIUS = 30;
const PLAYER_SPEED = 115;
const PLAYER_DASH_SPEED = 195;
const BOT_SPEED = 94;
const DASH_DURATION_SECONDS = 0.55;
const DASH_COOLDOWN_SECONDS = 4;
const INTERCEPT_RANGE = 44;
const INTERCEPT_COOLDOWN_SECONDS = 5.5;
const CHIP_RESPAWN_SECONDS = 2.2;
const TACKLE_LOCK_SECONDS = 0.85;
const MAX_EVENTS = 5;
const UI_PULSE_MS = 1250;

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(aX: number, aY: number, bX: number, bY: number): number {
  return Math.hypot(aX - bX, aY - bY);
}

function normalize(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y);
  if (len <= 0.0001) {
    return { x: 0, y: 0 };
  }
  return { x: x / len, y: y / len };
}

function getBase(team: Team, width: number, height: number): Vec2 {
  return team === "ally" ? { x: 36, y: height / 2 } : { x: width - 36, y: height / 2 };
}

function getChipSpawn(width: number, height: number): Vec2 {
  return { x: width / 2, y: height / 2 };
}

function getObstacles(width: number, height: number): RectObstacle[] {
  const centerX = width / 2 - 18;
  return [
    { x: centerX, y: height * 0.24, w: 36, h: 26 },
    { x: centerX, y: height * 0.64, w: 36, h: 26 }
  ];
}

function overlapsCircleRect(circleX: number, circleY: number, radius: number, rect: RectObstacle): boolean {
  const nearestX = clamp(circleX, rect.x, rect.x + rect.w);
  const nearestY = clamp(circleY, rect.y, rect.y + rect.h);
  const dx = circleX - nearestX;
  const dy = circleY - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function resolveMove(actor: Actor, targetX: number, targetY: number, width: number, height: number, obstacles: RectObstacle[]): Vec2 {
  const nextX = clamp(targetX, ACTOR_RADIUS, width - ACTOR_RADIUS);
  const nextY = clamp(targetY, ACTOR_RADIUS, height - ACTOR_RADIUS);

  if (!obstacles.some((obstacle) => overlapsCircleRect(nextX, nextY, ACTOR_RADIUS, obstacle))) {
    return { x: nextX, y: nextY };
  }

  if (!obstacles.some((obstacle) => overlapsCircleRect(nextX, actor.y, ACTOR_RADIUS, obstacle))) {
    return { x: nextX, y: actor.y };
  }

  if (!obstacles.some((obstacle) => overlapsCircleRect(actor.x, nextY, ACTOR_RADIUS, obstacle))) {
    return { x: actor.x, y: nextY };
  }

  return { x: actor.x, y: actor.y };
}

function actorName(actorId: ActorId, isZh: boolean): string {
  if (isZh) {
    return {
      player: "你",
      "ally-1": "队友",
      "enemy-1": "敌突进",
      "enemy-2": "敌控场"
    }[actorId];
  }
  return {
    player: "You",
    "ally-1": "Ally Bot",
    "enemy-1": "Enemy Rush",
    "enemy-2": "Enemy Guard"
  }[actorId];
}

function actorBadge(actorId: ActorId, isZh: boolean): string {
  if (actorId === "player") {
    return isZh ? "你" : "YOU";
  }
  if (actorId === "ally-1") {
    return isZh ? "友" : "A";
  }
  if (actorId === "enemy-1") {
    return isZh ? "突" : "R";
  }
  return isZh ? "控" : "G";
}

function formatArenaEvent(event: ArenaEvent, isZh: boolean): string {
  if (event.type === "pickup") {
    return isZh
      ? `${actorName(event.actorId, true)} 拿到芯片`
      : `${actorName(event.actorId, false)} secured the chip`;
  }
  if (event.type === "score") {
    return isZh
      ? `${actorName(event.actorId, true)} 成功护送得分`
      : `${actorName(event.actorId, false)} escorted and scored`;
  }
  return isZh
    ? `${actorName(event.actorId, true)} 拦截 ${actorName(event.targetId, true)}`
    : `${actorName(event.actorId, false)} intercepted ${actorName(event.targetId, false)}`;
}

function cloneArena(arena: ArenaState): ArenaState {
  return {
    ...arena,
    actors: arena.actors.map((actor) => ({ ...actor })),
    chip: { ...arena.chip }
  };
}

function createArena(width: number, height: number): ArenaState {
  const allyBase = getBase("ally", width, height);
  const enemyBase = getBase("enemy", width, height);
  const spawn = getChipSpawn(width, height);

  return {
    width,
    height,
    tick: 0,
    actors: [
      {
        id: "player",
        team: "ally",
        x: allyBase.x + 22,
        y: allyBase.y,
        vx: 0,
        vy: 0,
        hasChip: false,
        tackleLock: 0
      },
      {
        id: "ally-1",
        team: "ally",
        x: allyBase.x + 26,
        y: allyBase.y + 48,
        vx: 0,
        vy: 0,
        hasChip: false,
        tackleLock: 0
      },
      {
        id: "enemy-1",
        team: "enemy",
        x: enemyBase.x - 26,
        y: enemyBase.y - 42,
        vx: 0,
        vy: 0,
        hasChip: false,
        tackleLock: 0
      },
      {
        id: "enemy-2",
        team: "enemy",
        x: enemyBase.x - 26,
        y: enemyBase.y + 42,
        vx: 0,
        vy: 0,
        hasChip: false,
        tackleLock: 0
      }
    ],
    chip: {
      x: spawn.x,
      y: spawn.y,
      holderId: null,
      respawnLeft: 0
    }
  };
}
function chooseBotTarget(actor: Actor, arena: ArenaState, holder: Actor | undefined): Vec2 {
  const ownBase = getBase(actor.team, arena.width, arena.height);
  const mid = getChipSpawn(arena.width, arena.height);
  const laneY = actor.id === "ally-1" || actor.id === "enemy-1" ? arena.height * 0.3 : arena.height * 0.7;

  if (actor.hasChip) {
    return ownBase;
  }

  if (arena.chip.respawnLeft <= 0 && arena.chip.holderId === null) {
    return { x: arena.chip.x, y: arena.chip.y };
  }

  if (holder && holder.team !== actor.team) {
    return { x: holder.x, y: holder.y };
  }

  if (holder && holder.team === actor.team) {
    const offsetX = actor.team === "ally" ? -22 : 22;
    const offsetY = actor.id === "ally-1" || actor.id === "enemy-1" ? -24 : 24;
    return {
      x: clamp(holder.x + offsetX, ACTOR_RADIUS, arena.width - ACTOR_RADIUS),
      y: clamp(holder.y + offsetY, ACTOR_RADIUS, arena.height - ACTOR_RADIUS)
    };
  }

  return { x: mid.x, y: laneY };
}

function simulateArenaFrame(
  arena: ArenaState,
  stick: StickState,
  dashBoostActive: boolean,
  modifiers: CombatModifiers
): FrameResult {
  const next = cloneArena(arena);
  next.tick += 1;

  const events: ArenaEvent[] = [];
  let allyScoreGain = 0;
  let enemyScoreGain = 0;

  const obstacles = getObstacles(next.width, next.height);
  const spawn = getChipSpawn(next.width, next.height);
  const actorMap = new Map<ActorId, Actor>(next.actors.map((actor) => [actor.id, actor]));
  const player = actorMap.get("player");

  if (!player) {
    return { next: arena, events, allyScoreGain, enemyScoreGain };
  }

  for (const actor of next.actors) {
    actor.tackleLock = Math.max(0, actor.tackleLock - FIELD_DT_SECONDS);
  }

  const playerSpeed = dashBoostActive ? PLAYER_DASH_SPEED * modifiers.dashScale : PLAYER_SPEED * modifiers.speedScale;
  player.vx = stick.x * playerSpeed;
  player.vy = stick.y * playerSpeed;

  const currentHolder = next.chip.holderId ? actorMap.get(next.chip.holderId) : undefined;

  for (const actor of next.actors) {
    if (actor.id === "player") {
      continue;
    }
    const target = chooseBotTarget(actor, next, currentHolder);
    const dir = normalize(target.x - actor.x, target.y - actor.y);
    const speed = actor.hasChip ? BOT_SPEED * 0.84 : BOT_SPEED;
    actor.vx = dir.x * speed;
    actor.vy = dir.y * speed;
  }

  for (const actor of next.actors) {
    const desiredX = actor.x + actor.vx * FIELD_DT_SECONDS;
    const desiredY = actor.y + actor.vy * FIELD_DT_SECONDS;
    const moved = resolveMove(actor, desiredX, desiredY, next.width, next.height, obstacles);
    actor.x = moved.x;
    actor.y = moved.y;
  }

  if (next.chip.respawnLeft > 0) {
    next.chip.respawnLeft = Math.max(0, next.chip.respawnLeft - FIELD_DT_SECONDS);
    if (next.chip.respawnLeft === 0) {
      next.chip.x = spawn.x;
      next.chip.y = spawn.y;
    }
  }

  for (const attacker of next.actors) {
    if (attacker.tackleLock > 0) {
      continue;
    }
    const target = next.actors.find(
      (candidate) =>
        candidate.team !== attacker.team &&
        candidate.hasChip &&
        distance(attacker.x, attacker.y, candidate.x, candidate.y) <= TACKLE_RANGE
    );
    if (!target) {
      continue;
    }
    const successRate =
      attacker.id === "player"
        ? Math.min(0.98, (dashBoostActive ? 0.96 : 0.7) + modifiers.tackleBonus)
        : 0.36;
    if (Math.random() <= successRate) {
      target.hasChip = false;
      next.chip.holderId = null;
      next.chip.x = target.x;
      next.chip.y = target.y;
      attacker.tackleLock = TACKLE_LOCK_SECONDS;
      events.push({
        type: "tackle",
        actorId: attacker.id,
        team: attacker.team,
        targetId: target.id
      });
    } else {
      attacker.tackleLock = TACKLE_LOCK_SECONDS * 0.55;
    }
  }

  if (next.chip.respawnLeft <= 0 && next.chip.holderId === null) {
    let selected: Actor | undefined;
    let selectedDist = Number.POSITIVE_INFINITY;
    for (const actor of next.actors) {
      const dist = distance(actor.x, actor.y, next.chip.x, next.chip.y);
      const shouldPick = dist <= PICKUP_RANGE && dist < selectedDist;
      const playerTieBreak = dist <= PICKUP_RANGE && Math.abs(dist - selectedDist) < 0.8 && actor.id === "player";
      if (shouldPick || playerTieBreak) {
        selected = actor;
        selectedDist = dist;
      }
    }
    if (selected) {
      selected.hasChip = true;
      next.chip.holderId = selected.id;
      next.chip.x = selected.x;
      next.chip.y = selected.y;
      events.push({
        type: "pickup",
        actorId: selected.id,
        team: selected.team
      });
    }
  }

  if (next.chip.holderId) {
    const holder = actorMap.get(next.chip.holderId);
    if (holder) {
      const holderBase = getBase(holder.team, next.width, next.height);
      const reachedBase = distance(holder.x, holder.y, holderBase.x, holderBase.y) <= BASE_RADIUS - 3;
      if (reachedBase) {
        holder.hasChip = false;
        next.chip.holderId = null;
        next.chip.respawnLeft = CHIP_RESPAWN_SECONDS;
        next.chip.x = spawn.x;
        next.chip.y = spawn.y;
        events.push({
          type: "score",
          actorId: holder.id,
          team: holder.team
        });
        if (holder.team === "ally") {
          allyScoreGain += 1;
        } else {
          enemyScoreGain += 1;
        }
      } else {
        next.chip.x = holder.x;
        next.chip.y = holder.y;
      }
    } else {
      next.chip.holderId = null;
    }
  }

  return { next, events, allyScoreGain, enemyScoreGain };
}

function runInterceptSkill(arena: ArenaState, interceptRangeBonus: number): { next: ArenaState; events: ArenaEvent[] } {
  const next = cloneArena(arena);
  const player = next.actors.find((actor) => actor.id === "player");
  if (!player) {
    return { next: arena, events: [] };
  }

  const target = next.actors.find(
    (actor) =>
      actor.team === "enemy" &&
      actor.hasChip &&
      distance(actor.x, actor.y, player.x, player.y) <= INTERCEPT_RANGE + interceptRangeBonus
  );

  if (!target) {
    return { next, events: [] };
  }

  target.hasChip = false;
  next.chip.holderId = null;
  next.chip.x = target.x;
  next.chip.y = target.y;

  const events: ArenaEvent[] = [
    {
      type: "tackle",
      actorId: "player",
      team: "ally",
      targetId: target.id
    }
  ];

  if (!player.hasChip && distance(player.x, player.y, next.chip.x, next.chip.y) <= PICKUP_RANGE + 2) {
    player.hasChip = true;
    next.chip.holderId = "player";
    next.chip.x = player.x;
    next.chip.y = player.y;
    events.push({
      type: "pickup",
      actorId: "player",
      team: "ally"
    });
  }

  return { next, events };
}

function getEventAnchor(event: ArenaEvent, arena: ArenaState): Vec2 | null {
  if (event.type === "pickup" || event.type === "score") {
    const actor = arena.actors.find((item) => item.id === event.actorId);
    return actor ? { x: actor.x, y: actor.y } : null;
  }

  const target = arena.actors.find((item) => item.id === event.targetId);
  if (target) {
    return { x: target.x, y: target.y };
  }

  const actor = arena.actors.find((item) => item.id === event.actorId);
  return actor ? { x: actor.x, y: actor.y } : null;
}

function createActorAnimMap(arena: ArenaState): Record<ActorId, { x: Animated.Value; y: Animated.Value }> {
  const actorPosition = (actorId: ActorId): Vec2 => {
    const actor = arena.actors.find((item) => item.id === actorId);
    if (!actor) {
      return { x: 0, y: 0 };
    }
    return { x: actor.x, y: actor.y };
  };

  const player = actorPosition("player");
  const ally = actorPosition("ally-1");
  const enemy1 = actorPosition("enemy-1");
  const enemy2 = actorPosition("enemy-2");

  return {
    player: { x: new Animated.Value(player.x), y: new Animated.Value(player.y) },
    "ally-1": { x: new Animated.Value(ally.x), y: new Animated.Value(ally.y) },
    "enemy-1": { x: new Animated.Value(enemy1.x), y: new Animated.Value(enemy1.y) },
    "enemy-2": { x: new Animated.Value(enemy2.x), y: new Animated.Value(enemy2.y) }
  };
}

function deriveCombatModifiers(
  loadout: { spray: string; sticker: string; emote: string; title: string },
  options: { sprays: string[]; stickers: string[]; emotes: string[]; titles: string[] },
  buddy: { synergy: number; intimacy: number } | null
): CombatModifiers {
  const sprayTier = Math.max(0, options.sprays.indexOf(loadout.spray));
  const stickerTier = Math.max(0, options.stickers.indexOf(loadout.sticker));
  const emoteTier = Math.max(0, options.emotes.indexOf(loadout.emote));
  const titleTier = Math.max(0, options.titles.indexOf(loadout.title));
  const buddySync = buddy ? buddy.synergy / 100 : 0.72;
  const bond = buddy ? buddy.intimacy / 100 : 0.45;

  return {
    speedScale: 1 + sprayTier * 0.02 + Math.max(0, (buddySync - 0.7) * 0.12),
    dashScale: 1 + emoteTier * 0.03 + bond * 0.04,
    tackleBonus: stickerTier * 0.03 + bond * 0.05,
    interceptRangeBonus: titleTier * 4 + emoteTier * 2,
    passXpBonus: 2 + titleTier + emoteTier
  };
}

export function HomeScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";
  const { match } = state;
  const [fieldWidth, setFieldWidth] = useState(DEFAULT_FIELD_WIDTH);
  const [arena, setArena] = useState<ArenaState>(() => createArena(DEFAULT_FIELD_WIDTH, FIELD_HEIGHT));
  const [stick, setStick] = useState<StickState>({ active: false, x: 0, y: 0, intensity: 0 });
  const [events, setEvents] = useState<string[]>([]);
  const [impactFx, setImpactFx] = useState<ImpactFx | null>(null);
  const [scoreFlashTeam, setScoreFlashTeam] = useState<Team | null>(null);

  const arenaRef = useRef(arena);
  const stickRef = useRef(stick);
  const matchRef = useRef(match);
  const wasInMatchRef = useRef(false);
  const dashCooldownRef = useRef(0);
  const interceptCooldownRef = useRef(0);
  const dashBoostRef = useRef(0);
  const actorAnimRef = useRef<Record<ActorId, { x: Animated.Value; y: Animated.Value }>>(createActorAnimMap(arena));
  const chipAnimRef = useRef({ x: new Animated.Value(arena.chip.x), y: new Animated.Value(arena.chip.y) });
  const basePulse = useRef(new Animated.Value(0)).current;
  const chipPulse = useRef(new Animated.Value(0)).current;
  const chipSpin = useRef(new Animated.Value(0)).current;
  const arenaScan = useRef(new Animated.Value(0)).current;
  const dashPulse = useRef(new Animated.Value(0)).current;
  const interceptPulse = useRef(new Animated.Value(0)).current;
  const impactScale = useRef(new Animated.Value(0)).current;
  const impactOpacity = useRef(new Animated.Value(0)).current;
  const scoreFlash = useRef(new Animated.Value(0)).current;
  const activeBuddy = state.queuedBuddyId ? state.buddies.find((item) => item.id === state.queuedBuddyId) ?? null : null;
  const combatModifiers = useMemo(
    () => deriveCombatModifiers(state.loadout, state.options, activeBuddy),
    [activeBuddy, state.loadout, state.options]
  );

  const playSfx = (type: SfxType) => {
    if (NativeSoundManager?.playTouchSound) {
      NativeSoundManager.playTouchSound();
      if (type === "score") {
        setTimeout(() => NativeSoundManager.playTouchSound?.(), 80);
      }
    }

    if (type === "score") {
      Vibration.vibrate(30);
      return;
    }

    if (type === "tackle") {
      Vibration.vibrate(18);
      return;
    }

    if (type === "skill") {
      Vibration.vibrate(10);
    }
  };

  const runImpact = (x: number, y: number, team: Team) => {
    setImpactFx({ x, y, team });
    impactScale.setValue(0.25);
    impactOpacity.setValue(0.9);
    Animated.parallel([
      Animated.timing(impactScale, {
        toValue: 1.75,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(impactOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      setImpactFx((prev) => {
        if (!prev) {
          return prev;
        }
        if (Math.abs(prev.x - x) < 0.1 && Math.abs(prev.y - y) < 0.1 && prev.team === team) {
          return null;
        }
        return prev;
      });
    });
  };

  const runScoreFlash = (team: Team) => {
    setScoreFlashTeam(team);
    scoreFlash.setValue(0.48);
    Animated.timing(scoreFlash, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start(() => {
      setScoreFlashTeam((prev) => (prev === team ? null : prev));
    });
  };

  useEffect(() => {
    arenaRef.current = arena;
    (["player", "ally-1", "enemy-1", "enemy-2"] as ActorId[]).forEach((actorId) => {
      const actor = arena.actors.find((item) => item.id === actorId);
      if (!actor) {
        return;
      }
      Animated.timing(actorAnimRef.current[actorId].x, {
        toValue: actor.x,
        duration: FIELD_TICK_MS,
        easing: Easing.linear,
        useNativeDriver: true
      }).start();
      Animated.timing(actorAnimRef.current[actorId].y, {
        toValue: actor.y,
        duration: FIELD_TICK_MS,
        easing: Easing.linear,
        useNativeDriver: true
      }).start();
    });

    Animated.timing(chipAnimRef.current.x, {
      toValue: arena.chip.x,
      duration: FIELD_TICK_MS,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
    Animated.timing(chipAnimRef.current.y, {
      toValue: arena.chip.y,
      duration: FIELD_TICK_MS,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  }, [arena]);

  useEffect(() => {
    stickRef.current = stick;
  }, [stick]);

  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    const baseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(basePulse, { toValue: 1, duration: UI_PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(basePulse, { toValue: 0, duration: UI_PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );

    const chipAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(chipPulse, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(chipPulse, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );

    const spinAnim = Animated.loop(
      Animated.timing(chipSpin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    const scanAnim = Animated.loop(
      Animated.timing(arenaScan, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    const dashAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(dashPulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(dashPulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );

    const interceptAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(interceptPulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(interceptPulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );

    baseAnim.start();
    chipAnim.start();
    spinAnim.start();
    scanAnim.start();
    dashAnim.start();
    interceptAnim.start();

    return () => {
      baseAnim.stop();
      chipAnim.stop();
      spinAnim.stop();
      scanAnim.stop();
      dashAnim.stop();
      interceptAnim.stop();
    };
  }, [arenaScan, basePulse, chipPulse, chipSpin, dashPulse, interceptPulse]);

  useEffect(() => {
    const wasInMatch = wasInMatchRef.current;
    if (match.isInMatch && !wasInMatch) {
      const refreshedArena = createArena(fieldWidth, FIELD_HEIGHT);
      arenaRef.current = refreshedArena;
      actorAnimRef.current = createActorAnimMap(refreshedArena);
      chipAnimRef.current.x.setValue(refreshedArena.chip.x);
      chipAnimRef.current.y.setValue(refreshedArena.chip.y);
      setArena(refreshedArena);
      runImpact(refreshedArena.width / 2, refreshedArena.height / 2, "ally");
      playSfx("skill");
      setEvents([
        isZh ? "对局开始，优先抢中路芯片，再护送回基地。" : "Match live. Secure center chip and escort it home."
      ]);
      dashCooldownRef.current = 0;
      interceptCooldownRef.current = 0;
      dashBoostRef.current = 0;
      const idleStick: StickState = { active: false, x: 0, y: 0, intensity: 0 };
      stickRef.current = idleStick;
      setStick(idleStick);
    }

    if (!match.isInMatch && wasInMatch && match.phase === "DONE") {
      runScoreFlash(match.allyScore >= match.enemyScore ? "ally" : "enemy");
      setEvents((prev) =>
        [
          isZh
            ? `对局结束 ${match.allyScore}:${match.enemyScore}，${match.allyScore >= match.enemyScore ? "胜利" : "失利"}`
            : `Match end ${match.allyScore}:${match.enemyScore}, ${match.allyScore >= match.enemyScore ? "victory" : "defeat"}`,
          ...prev
        ].slice(0, MAX_EVENTS)
      );
      const idleStick: StickState = { active: false, x: 0, y: 0, intensity: 0 };
      stickRef.current = idleStick;
      setStick(idleStick);
      dashBoostRef.current = 0;
    }

    wasInMatchRef.current = match.isInMatch;
  }, [fieldWidth, isZh, match.allyScore, match.enemyScore, match.isInMatch, match.phase]);

  useEffect(() => {
    if (!match.isInMatch) {
      return;
    }
    const timer = setInterval(() => {
      dispatch({ type: "TICK_MATCH" });
    }, 1000);
    return () => clearInterval(timer);
  }, [dispatch, match.isInMatch]);

  useEffect(() => {
    if (!match.isInMatch) {
      return;
    }

    const interval = setInterval(() => {
      const currentMatch = matchRef.current;
      if (!currentMatch.isInMatch || currentMatch.secondsLeft <= 0) {
        return;
      }

      dashCooldownRef.current = Math.max(0, dashCooldownRef.current - FIELD_DT_SECONDS);
      interceptCooldownRef.current = Math.max(0, interceptCooldownRef.current - FIELD_DT_SECONDS);
      dashBoostRef.current = Math.max(0, dashBoostRef.current - FIELD_DT_SECONDS);

      const frame = simulateArenaFrame(arenaRef.current, stickRef.current, dashBoostRef.current > 0, combatModifiers);
      arenaRef.current = frame.next;
      setArena(frame.next);

      if (frame.allyScoreGain > 0) {
        for (let i = 0; i < frame.allyScoreGain; i += 1) {
          dispatch({ type: "SCORE", side: "ally", value: 1 });
        }
      }

      if (frame.enemyScoreGain > 0) {
        for (let i = 0; i < frame.enemyScoreGain; i += 1) {
          dispatch({ type: "SCORE", side: "enemy", value: 1 });
        }
      }

      if (frame.events.length > 0) {
        const eventText = frame.events.map((event) => formatArenaEvent(event, isZh));
        setEvents((prev) => [...eventText, ...prev].slice(0, MAX_EVENTS));

        for (const event of frame.events) {
          if (event.type === "pickup") {
            dispatch({ type: "TRACK_MATCH_EVENT", event: event.team === "ally" ? "ALLY_PICKUP" : "ENEMY_PICKUP" });
            playSfx("pickup");
          } else if (event.type === "score") {
            dispatch({ type: "TRACK_MATCH_EVENT", event: event.team === "ally" ? "ALLY_SCORE" : "ENEMY_SCORE" });
            playSfx("score");
            runScoreFlash(event.team);
          } else {
            dispatch({ type: "TRACK_MATCH_EVENT", event: event.team === "ally" ? "ALLY_TACKLE" : "ENEMY_TACKLE" });
            playSfx("tackle");
          }

          const anchor = getEventAnchor(event, frame.next);
          if (anchor) {
            runImpact(anchor.x, anchor.y, event.team);
          }
        }
      }
    }, FIELD_TICK_MS);

    return () => clearInterval(interval);
  }, [combatModifiers, dispatch, isZh, match.isInMatch]);
  const phaseLabel = useMemo(() => {
    if (isZh) {
      return {
        OPENING: "开局争芯片 (0:00-0:30)",
        MID: "中盘拉扯与护送 (0:30-2:30)",
        ENDGAME: "终局高压争夺 (2:30-4:00)",
        DONE: "对局已结束"
      }[match.phase];
    }
    return {
      OPENING: "Opening Resource Fight (0:00-0:30)",
      MID: "Mid Rotation & Teamfight (0:30-2:30)",
      ENDGAME: "High-value Endgame Chip (2:30-4:00)",
      DONE: "Match Ended"
    }[match.phase];
  }, [isZh, match.phase]);

  const matchTip = useMemo(() => {
    if (isZh) {
      if (!match.isInMatch && match.phase === "DONE") {
        return match.allyScore >= match.enemyScore
          ? "你赢下本局。继续开下一把可推进赛季任务。"
          : "本局失利。多用冲刺+拦截打断敌方护送。";
      }
      if (!match.isInMatch) {
        return "按住左侧摇杆移动，右侧技能负责冲刺与拦截。";
      }
      if (dashBoostRef.current > 0) {
        return "冲刺生效中：你当前速度提升，优先压敌方持芯片目标。";
      }
      return "芯片在中路刷新，优先控中再护送回基地得分。";
    }

    if (!match.isInMatch && match.phase === "DONE") {
      return match.allyScore >= match.enemyScore
        ? "Victory secured. Queue again to progress season missions."
        : "Defeat this round. Time dash + intercept to break enemy escorts.";
    }
    if (!match.isInMatch) {
      return "Hold left joystick to move. Dash and intercept are your playmaking tools.";
    }
    if (dashBoostRef.current > 0) {
      return "Dash active. Collapse on enemy chip carriers now.";
    }
    return "Control center spawn first, then escort the chip back to base.";
  }, [isZh, match.allyScore, match.enemyScore, match.isInMatch, match.phase]);

  const linkageLabel = isZh
    ? `联动增益：移速 +${Math.round((combatModifiers.speedScale - 1) * 100)}% · 拦截范围 +${combatModifiers.interceptRangeBonus} · 赛季XP +${combatModifiers.passXpBonus}`
    : `Linked buffs: Move +${Math.round((combatModifiers.speedScale - 1) * 100)}% · Intercept +${combatModifiers.interceptRangeBonus} · Pass XP +${combatModifiers.passXpBonus}`;

  const winRate = match.roundsPlayed === 0 ? 0 : Math.round((match.wins / match.roundsPlayed) * 100);
  const progressPercent = ((240 - match.secondsLeft) / 240) * 100;
  const allyBase = getBase("ally", arena.width, arena.height);
  const enemyBase = getBase("enemy", arena.width, arena.height);
  const obstacles = getObstacles(arena.width, arena.height);
  const dashCooling = dashCooldownRef.current > 0;
  const interceptCooling = interceptCooldownRef.current > 0;
  const matchResultText =
    match.phase !== "DONE" || match.isInMatch
      ? null
      : isZh
        ? `结算 ${match.allyScore}:${match.enemyScore} · ${match.allyScore >= match.enemyScore ? "胜利" : "失利"}`
        : `Result ${match.allyScore}:${match.enemyScore} · ${match.allyScore >= match.enemyScore ? "Win" : "Loss"}`;
  const basePulseScale = basePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08]
  });
  const basePulseOpacity = basePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6]
  });
  const chipScale = chipPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.12]
  });
  const chipGlow = chipPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.88]
  });
  const chipRotate = chipSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });
  const scanTranslateY = arenaScan.interpolate({
    inputRange: [0, 1],
    outputRange: [-FIELD_HEIGHT * 0.6, FIELD_HEIGHT * 1.2]
  });
  const dashGlow = dashPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.78]
  });
  const interceptGlow = interceptPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.78]
  });
  const scoreFlashColor =
    scoreFlashTeam === "ally" ? "rgba(0, 220, 169, 0.95)" : scoreFlashTeam === "enemy" ? "rgba(255, 108, 66, 0.95)" : "transparent";

  const startMatch = () => {
    dispatch({ type: "START_MATCH" });
  };

  const triggerDash = () => {
    if (!match.isInMatch || dashCooldownRef.current > 0) {
      return;
    }
    dispatch({ type: "TRACK_MATCH_EVENT", event: "PLAYER_DASH" });
    dashCooldownRef.current = DASH_COOLDOWN_SECONDS;
    dashBoostRef.current = DASH_DURATION_SECONDS;
    playSfx("skill");
    const player = arenaRef.current.actors.find((item) => item.id === "player");
    if (player) {
      runImpact(player.x, player.y, "ally");
    }
    setEvents((prev) => [(isZh ? "冲刺启动，移速提升。" : "Dash engaged. Movement speed boosted."), ...prev].slice(0, MAX_EVENTS));
    setArena((prev) => ({ ...prev }));
  };

  const triggerIntercept = () => {
    if (!match.isInMatch || interceptCooldownRef.current > 0) {
      return;
    }
    dispatch({ type: "TRACK_MATCH_EVENT", event: "PLAYER_INTERCEPT_ATTEMPT" });
    interceptCooldownRef.current = INTERCEPT_COOLDOWN_SECONDS;
    const result = runInterceptSkill(arenaRef.current, combatModifiers.interceptRangeBonus);
    arenaRef.current = result.next;
    setArena(result.next);
    playSfx("skill");

    if (result.events.length > 0) {
      for (const event of result.events) {
        const anchor = getEventAnchor(event, result.next);
        if (anchor) {
          runImpact(anchor.x, anchor.y, event.team);
        }
        if (event.type === "pickup") {
          dispatch({ type: "TRACK_MATCH_EVENT", event: "ALLY_PICKUP" });
          playSfx("pickup");
        } else if (event.type === "tackle") {
          dispatch({ type: "TRACK_MATCH_EVENT", event: "PLAYER_INTERCEPT_SUCCESS" });
          dispatch({ type: "TRACK_MATCH_EVENT", event: "ALLY_TACKLE" });
          playSfx("tackle");
        }
      }
      setEvents((prev) => [...result.events.map((event) => formatArenaEvent(event, isZh)), ...prev].slice(0, MAX_EVENTS));
      return;
    }
    setEvents((prev) => [(isZh ? "拦截落空，继续贴近敌方持芯片目标。" : "Intercept missed. Close distance to enemy carrier."), ...prev].slice(0, MAX_EVENTS));
  };

  const updateStickFromTouch = (event: GestureResponderEvent) => {
    const center = JOYSTICK_PAD_SIZE / 2;
    const rawX = event.nativeEvent.locationX - center;
    const rawY = event.nativeEvent.locationY - center;
    const dist = Math.hypot(rawX, rawY);
    const ratio = dist > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / dist : 1;
    const normX = (rawX * ratio) / JOYSTICK_RADIUS;
    const normY = (rawY * ratio) / JOYSTICK_RADIUS;
    const nextStick: StickState = {
      active: true,
      x: normX,
      y: normY,
      intensity: Math.min(1, dist / JOYSTICK_RADIUS)
    };
    stickRef.current = nextStick;
    setStick(nextStick);
  };

  const resetStick = () => {
    const nextStick: StickState = { active: false, x: 0, y: 0, intensity: 0 };
    stickRef.current = nextStick;
    setStick(nextStick);
  };

  const onArenaLayout = (event: LayoutChangeEvent) => {
    const width = Math.max(280, Math.round(event.nativeEvent.layout.width));
    if (Math.abs(width - fieldWidth) < 2) {
      return;
    }
    setFieldWidth(width);
    if (!matchRef.current.isInMatch) {
      const resetArena = createArena(width, FIELD_HEIGHT);
      arenaRef.current = resetArena;
      actorAnimRef.current = createActorAnimMap(resetArena);
      chipAnimRef.current.x.setValue(resetArena.chip.x);
      chipAnimRef.current.y.setValue(resetArena.chip.y);
      setArena(resetArena);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.cardTitle}>{isZh ? "核心模式：能量争夺战（实时操作版）" : "Core Mode: Energy Heist (Realtime Controls)"}</Text>
        <Text style={styles.cardText}>
          {isZh
            ? "不是按钮加减分。你现在要移动、抢芯片、护送回点、用冲刺和拦截打断敌方节奏。"
            : "No more static +/- buttons. Move, secure chips, escort home, and disrupt enemy carries with active skills."}
        </Text>
        <View style={styles.badgeRow}>
          <StatBadge label={isZh ? "局数" : "Rounds"} value={`${match.roundsPlayed}`} />
          <StatBadge label={isZh ? "胜场" : "Wins"} value={`${match.wins}`} />
          <StatBadge label={isZh ? "胜率" : "Win Rate"} value={`${winRate}%`} />
        </View>
      </NeonCard>

      <NeonCard>
        <View style={styles.matchTop}>
          <View>
            <Text style={styles.timer}>{formatSeconds(match.secondsLeft)}</Text>
            <Text style={styles.phase}>{phaseLabel}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{match.allyScore}</Text>
            <Text style={styles.scoreSep}>:</Text>
            <Text style={[styles.scoreText, styles.enemyScore]}>{match.enemyScore}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
        </View>
        <Text style={styles.catchup}>
          {isZh ? "追击机制增益：" : "Catch-up Buff:"} <Text style={styles.catchupValue}>{`${match.catchUpBuff}%`}</Text>
        </Text>
        <Text style={styles.matchTip}>{matchTip}</Text>
        <Text style={styles.linkageTip}>{linkageLabel}</Text>

        <View style={styles.arenaShell}>
          <View style={styles.arena} onLayout={onArenaLayout}>
            <Animated.View
              style={[
                styles.basePulseRing,
                {
                  left: allyBase.x - BASE_RADIUS,
                  top: allyBase.y - BASE_RADIUS,
                  opacity: basePulseOpacity,
                  transform: [{ scale: basePulseScale }]
                }
              ]}
            />
            <Animated.View
              style={[
                styles.basePulseRing,
                styles.basePulseEnemy,
                {
                  left: enemyBase.x - BASE_RADIUS,
                  top: enemyBase.y - BASE_RADIUS,
                  opacity: basePulseOpacity,
                  transform: [{ scale: basePulseScale }]
                }
              ]}
            />
            <View style={[styles.baseZone, styles.allyBase, { left: allyBase.x - BASE_RADIUS, top: allyBase.y - BASE_RADIUS }]} />
            <View style={[styles.baseZone, styles.enemyBase, { left: enemyBase.x - BASE_RADIUS, top: enemyBase.y - BASE_RADIUS }]} />
            <View style={styles.centerLine} />
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]} />
            {obstacles.map((obstacle, index) => (
              <View
                key={`obstacle-${index}`}
                style={[styles.obstacle, { left: obstacle.x, top: obstacle.y, width: obstacle.w, height: obstacle.h }]}
              />
            ))}
            {arena.chip.respawnLeft <= 0 && (
              <Animated.View
                style={[
                  styles.chip,
                  {
                    left: -CHIP_RADIUS,
                    top: -CHIP_RADIUS,
                    opacity: chipGlow,
                    transform: [
                      { translateX: chipAnimRef.current.x },
                      { translateY: chipAnimRef.current.y },
                      { rotate: "45deg" },
                      { rotate: chipRotate },
                      { scale: chipScale }
                    ]
                  }
                ]}
              />
            )}
            {arena.actors.map((actor) => {
              const isPlayer = actor.id === "player";
              const size = isPlayer ? 28 : 24;
              const bobOffset = Math.sin((arena.tick + (isPlayer ? 0 : 6)) * 0.12) * 1.6;
              return (
                <Animated.View
                  key={actor.id}
                  style={[
                    styles.actor,
                    actor.team === "ally" ? styles.actorAlly : styles.actorEnemy,
                    isPlayer && styles.actorPlayer,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      left: -(size / 2),
                      top: -(size / 2),
                      transform: [
                        { translateX: actorAnimRef.current[actor.id].x },
                        { translateY: actorAnimRef.current[actor.id].y },
                        { translateY: bobOffset }
                      ]
                    }
                  ]}
                >
                  {actor.hasChip && (
                    <Animated.View
                      style={[
                        styles.chipAura,
                        {
                          opacity: chipGlow,
                          transform: [{ rotate: chipRotate }, { scale: chipScale }]
                        }
                      ]}
                    />
                  )}
                  <Text style={styles.actorText}>{actorBadge(actor.id, isZh)}</Text>
                </Animated.View>
              );
            })}
            {impactFx && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.impactFx,
                  impactFx.team === "ally" ? styles.impactAlly : styles.impactEnemy,
                  {
                    left: impactFx.x - 22,
                    top: impactFx.y - 22,
                    opacity: impactOpacity,
                    transform: [{ scale: impactScale }]
                  }
                ]}
              />
            )}
            {scoreFlashTeam && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.scoreFlash,
                  {
                    backgroundColor: scoreFlashColor,
                    opacity: scoreFlash
                  }
                ]}
              />
            )}
            <Text style={[styles.baseLabel, { left: allyBase.x - 12, top: allyBase.y + BASE_RADIUS + 2 }]}>
              {isZh ? "我方" : "ALLY"}
            </Text>
            <Text style={[styles.baseLabel, { left: enemyBase.x - 14, top: enemyBase.y + BASE_RADIUS + 2 }]}>
              {isZh ? "敌方" : "ENEMY"}
            </Text>
          </View>
        </View>
        <View style={styles.controlRow}>
          <View>
            <Text style={styles.controlTitle}>{isZh ? "移动摇杆" : "Move Stick"}</Text>
            <View
              style={styles.joystickPad}
              onStartShouldSetResponder={() => match.isInMatch}
              onMoveShouldSetResponder={() => match.isInMatch}
              onResponderGrant={updateStickFromTouch}
              onResponderMove={updateStickFromTouch}
              onResponderRelease={resetStick}
              onResponderTerminate={resetStick}
            >
              <View style={styles.joystickRing} />
              <View
                style={[
                  styles.joystickKnob,
                  {
                    transform: [{ translateX: stick.x * JOYSTICK_RADIUS }, { translateY: stick.y * JOYSTICK_RADIUS }]
                  }
                ]}
              />
            </View>
            <Text style={styles.stickMeta}>
              {isZh ? "力度" : "Force"} {Math.round(stick.intensity * 100)}%
            </Text>
          </View>

          <View style={styles.skillCol}>
            <View style={styles.skillButtonWrap}>
              <Animated.View
                pointerEvents="none"
                style={[styles.skillHalo, styles.skillHaloDash, { opacity: dashCooling ? 0.15 : dashGlow }]}
              />
              <TouchableOpacity
                style={[styles.skillButton, dashCooling && styles.skillButtonDisabled]}
                onPress={triggerDash}
                disabled={!match.isInMatch || dashCooling}
              >
                <Text style={styles.skillName}>{isZh ? "冲刺" : "Dash"}</Text>
                <Text style={styles.skillCd}>{dashCooling ? `${dashCooldownRef.current.toFixed(1)}s` : isZh ? "就绪" : "Ready"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.skillButtonWrap}>
              <Animated.View
                pointerEvents="none"
                style={[styles.skillHalo, styles.skillHaloIntercept, { opacity: interceptCooling ? 0.15 : interceptGlow }]}
              />
              <TouchableOpacity
                style={[styles.skillButton, interceptCooling && styles.skillButtonDisabled]}
                onPress={triggerIntercept}
                disabled={!match.isInMatch || interceptCooling}
              >
                <Text style={styles.skillName}>{isZh ? "拦截" : "Intercept"}</Text>
                <Text style={styles.skillCd}>
                  {interceptCooling ? `${interceptCooldownRef.current.toFixed(1)}s` : isZh ? "就绪" : "Ready"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.logBox}>
          <Text style={styles.logTitle}>{isZh ? "战场播报" : "Field Feed"}</Text>
          {events.length === 0 ? (
            <Text style={styles.logItem}>{isZh ? "等待开局..." : "Waiting for kickoff..."}</Text>
          ) : (
            events.map((line, index) => (
              <Text key={`${line}-${index}`} style={styles.logItem}>
                {line}
              </Text>
            ))
          )}
        </View>

        {matchResultText && (
          <View style={styles.resultBanner}>
            <Text style={styles.resultText}>{matchResultText}</Text>
          </View>
        )}

        {!match.isInMatch && (
          <TouchableOpacity style={styles.primaryButton} onPress={startMatch}>
            <Text style={styles.primaryButtonText}>{isZh ? "开始 4v4 对局" : "Start 4v4 Match"}</Text>
          </TouchableOpacity>
        )}
      </NeonCard>

      <NeonCard>
        <Text style={styles.cardTitle}>{isZh ? "当前版本强化点" : "Current Build Upgrades"}</Text>
        <Text style={styles.cardText}>
          {isZh
            ? "1. 实时移动 + 抢夺 + 护送完整闭环  2. 技能冷却与拦截对抗  3. 障碍地图提高操作上限  4. 得分直接联动赛季任务。"
            : "1. Realtime move-capture-escort loop  2. Cooldown-based skill counterplay  3. Obstacle map for higher skill ceiling  4. Score updates linked to season progression."}
        </Text>
      </NeonCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 18
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text
  },
  cardText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.subText
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
    flexWrap: "wrap"
  },
  matchTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  timer: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.text
  },
  phase: {
    marginTop: 2,
    fontSize: 12,
    color: colors.subText,
    fontWeight: "600"
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6
  },
  scoreText: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.primary
  },
  enemyScore: {
    color: colors.accent
  },
  scoreSep: {
    fontSize: 26,
    color: colors.subText,
    fontWeight: "700"
  },
  progressTrack: {
    marginTop: 10,
    height: 9,
    borderRadius: radius.sm,
    backgroundColor: "#E3F6EB",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.electric
  },
  catchup: {
    marginTop: 10,
    fontSize: 13,
    color: colors.subText
  },
  catchupValue: {
    color: colors.warning,
    fontWeight: "800"
  },
  matchTip: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subText,
    fontWeight: "600"
  },
  linkageTip: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: colors.electric,
    fontWeight: "700"
  },
  arenaShell: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#CAE6D9",
    backgroundColor: "#062722",
    overflow: "hidden"
  },
  arena: {
    height: FIELD_HEIGHT,
    backgroundColor: "#10382F",
    position: "relative"
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: "rgba(16, 183, 255, 0.12)"
  },
  centerLine: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: 2,
    marginLeft: -1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.15)"
  },
  obstacle: {
    position: "absolute",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  basePulseRing: {
    position: "absolute",
    width: BASE_RADIUS * 2,
    height: BASE_RADIUS * 2,
    borderRadius: BASE_RADIUS,
    borderWidth: 2,
    borderColor: "rgba(24, 212, 168, 0.45)",
    backgroundColor: "rgba(24, 212, 168, 0.08)"
  },
  basePulseEnemy: {
    borderColor: "rgba(255, 109, 70, 0.5)",
    backgroundColor: "rgba(255, 109, 70, 0.08)"
  },
  baseZone: {
    position: "absolute",
    width: BASE_RADIUS * 2,
    height: BASE_RADIUS * 2,
    borderRadius: BASE_RADIUS,
    borderWidth: 2
  },
  allyBase: {
    borderColor: "rgba(24, 212, 168, 0.9)",
    backgroundColor: "rgba(24, 212, 168, 0.18)"
  },
  enemyBase: {
    borderColor: "rgba(255, 109, 70, 0.92)",
    backgroundColor: "rgba(255, 109, 70, 0.15)"
  },
  baseLabel: {
    position: "absolute",
    fontSize: 10,
    color: "#D8F9EE",
    fontWeight: "700"
  },
  chip: {
    position: "absolute",
    width: CHIP_RADIUS * 2,
    height: CHIP_RADIUS * 2,
    borderRadius: 4,
    backgroundColor: "#FFF287",
    borderWidth: 1,
    borderColor: "#FFD029"
  },
  actor: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  actorAlly: {
    backgroundColor: "#00B893",
    borderColor: "#B2FFE9"
  },
  actorEnemy: {
    backgroundColor: "#FF6C42",
    borderColor: "#FFD2C5"
  },
  actorPlayer: {
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  actorText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900"
  },
  chipAura: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#FFD829"
  },
  impactFx: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2
  },
  impactAlly: {
    borderColor: "rgba(16, 255, 184, 0.94)",
    backgroundColor: "rgba(16, 255, 184, 0.22)"
  },
  impactEnemy: {
    borderColor: "rgba(255, 126, 80, 0.94)",
    backgroundColor: "rgba(255, 126, 80, 0.22)"
  },
  scoreFlash: {
    ...StyleSheet.absoluteFillObject
  },
  controlRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14
  },
  controlTitle: {
    fontSize: 12,
    color: colors.subText,
    fontWeight: "700"
  },
  joystickPad: {
    marginTop: 6,
    width: JOYSTICK_PAD_SIZE,
    height: JOYSTICK_PAD_SIZE,
    borderRadius: JOYSTICK_PAD_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ECFAF3",
    alignItems: "center",
    justifyContent: "center"
  },
  joystickRing: {
    width: JOYSTICK_RADIUS * 2,
    height: JOYSTICK_RADIUS * 2,
    borderRadius: JOYSTICK_RADIUS,
    borderWidth: 1,
    borderColor: "#8FCDB5",
    borderStyle: "dashed"
  },
  joystickKnob: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#CAFFF1"
  },
  stickMeta: {
    marginTop: 6,
    fontSize: 11,
    color: colors.subText
  },
  skillCol: {
    flex: 1,
    justifyContent: "space-between",
    gap: 8
  },
  skillButtonWrap: {
    position: "relative"
  },
  skillHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md
  },
  skillHaloDash: {
    backgroundColor: "rgba(26, 191, 255, 0.35)"
  },
  skillHaloIntercept: {
    backgroundColor: "rgba(255, 112, 69, 0.32)"
  },
  skillButton: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#8AE2CB",
    backgroundColor: "#E7FFF6",
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  skillButtonDisabled: {
    opacity: 0.55
  },
  skillName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  skillCd: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: colors.subText
  },
  logBox: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F4FFF9",
    padding: 10
  },
  logTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text
  },
  logItem: {
    marginTop: 5,
    fontSize: 12,
    color: colors.subText
  },
  resultBanner: {
    marginTop: 10,
    borderRadius: radius.md,
    backgroundColor: "#113429",
    paddingVertical: 9,
    alignItems: "center"
  },
  resultText: {
    color: "#C8FFE8",
    fontWeight: "800",
    fontSize: 12
  },
  primaryButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15
  }
});
