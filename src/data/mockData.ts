import { BuddyProfile, ChallengeMap, SeasonMission, StreetGroup, WorkshopOptions } from "../types/models";

export const buddies: BuddyProfile[] = [
  { id: "b1", name: "夜猫阿曜", role: "突进", synergy: 92, winRate: 61, recentStreak: 4, intimacy: 74 },
  { id: "b2", name: "蓝调汽水", role: "控场", synergy: 88, winRate: 58, recentStreak: 2, intimacy: 66 },
  { id: "b3", name: "白线折返", role: "支援", synergy: 84, winRate: 56, recentStreak: 3, intimacy: 53 },
  { id: "b4", name: "涂鸦哨兵", role: "干扰", synergy: 81, winRate: 54, recentStreak: 1, intimacy: 49 }
];

export const workshopOptions: WorkshopOptions = {
  sprays: ["电磁波纹", "夜跑涂层", "街角霓虹", "光点溅射"],
  stickers: ["飞跃芯片", "冲榜模式", "搭子认证", "高光回放"],
  emotes: ["翻盘手势", "能量起势", "无伤拦截", "冲线欢呼"],
  titles: ["街区引擎", "节奏切片师", "搭子指挥官", "终局操盘手"]
};

export const missions: SeasonMission[] = [
  {
    id: "play_3",
    title: "完成 3 场能量争夺战",
    progress: 0,
    target: 3,
    reward: { currency: "credit", amount: 450 },
    claimed: false
  },
  {
    id: "win_1",
    title: "拿下 1 场胜利",
    progress: 0,
    target: 1,
    reward: { currency: "ticket", amount: 80 },
    claimed: false
  },
  {
    id: "pair_2",
    title: "和搭子双排 2 次",
    progress: 0,
    target: 2,
    reward: { currency: "ticket", amount: 120 },
    claimed: false
  },
  {
    id: "like_2",
    title: "点赞社区挑战图 2 次",
    progress: 0,
    target: 2,
    reward: { currency: "diamond", amount: 8 },
    claimed: false
  }
];

export const challengeMaps: ChallengeMap[] = [
  { id: "m1", name: "空轨反打站", styleTag: "终局翻盘", likes: 9412, completionRate: 63 },
  { id: "m2", name: "立体巷战环", styleTag: "高机动", likes: 7684, completionRate: 58 },
  { id: "m3", name: "断桥抢芯线", styleTag: "快节奏", likes: 11022, completionRate: 66 },
  { id: "m4", name: "重力涂鸦场", styleTag: "脑洞挑战", likes: 5930, completionRate: 47 }
];

export const streetGroup: StreetGroup = {
  name: "火花17街区团",
  memberCount: 27,
  weekCoopScore: 3240,
  rank: 19
};

export const liveOpsSchedule: string[] = [
  "每周：社区挑战图精选 + 限时轮换玩法",
  "每月：主题版本（新角色或新地图）",
  "每赛季 8 周：段位重置 + 赛季剧情 + 大型活动"
];
