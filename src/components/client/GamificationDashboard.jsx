import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Award,
  Trophy,
  Star,
  Zap,
  Target,
  TrendingUp,
  Flame,
  Crown,
  Sparkles,
  CheckCircle2,
  Eye,
  MessageSquare,
  Clock,
  Users,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';
import moment from "moment";

const ACHIEVEMENT_DEFINITIONS = [
  {
    type: "first_proposal_view",
    name: "First Steps",
    description: "Viewed your first proposal",
    icon: Eye,
    points: 10,
    tier: "bronze",
    trigger: { event: "proposal_view", count: 1 }
  },
  {
    type: "thorough_reader",
    name: "Thorough Reader",
    description: "Read a proposal from start to finish",
    icon: CheckCircle2,
    points: 25,
    tier: "silver",
    trigger: { event: "full_scroll", count: 1 }
  },
  {
    type: "fast_responder",
    name: "Fast Responder",
    description: "Responded within 24 hours",
    icon: Zap,
    points: 30,
    tier: "silver",
    trigger: { event: "quick_response", count: 1 }
  },
  {
    type: "engagement_champion",
    name: "Engagement Champion",
    description: "Viewed 10+ proposals",
    icon: Trophy,
    points: 50,
    tier: "gold",
    trigger: { event: "proposal_view", count: 10 }
  },
  {
    type: "feedback_master",
    name: "Feedback Master",
    description: "Left 20+ comments",
    icon: MessageSquare,
    points: 75,
    tier: "gold",
    trigger: { event: "comment", count: 20 }
  },
  {
    type: "collaboration_star",
    name: "Collaboration Star",
    description: "Shared proposals with team members",
    icon: Users,
    points: 40,
    tier: "silver",
    trigger: { event: "team_invite", count: 1 }
  },
  {
    type: "milestone_reached",
    name: "Decision Maker",
    description: "Made your first approval decision",
    icon: Target,
    points: 50,
    tier: "gold",
    trigger: { event: "approval_decision", count: 1 }
  },
  {
    type: "streak_keeper",
    name: "Streak Keeper",
    description: "Logged in 7 days in a row",
    icon: Flame,
    points: 100,
    tier: "platinum",
    trigger: { event: "login_streak", count: 7 }
  },
  {
    type: "early_adopter",
    name: "Early Adopter",
    description: "One of the first to join the platform",
    icon: Rocket,
    points: 50,
    tier: "gold",
    trigger: { event: "early_signup", count: 1 }
  }
];

const TIER_COLORS = {
  bronze: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  silver: { bg: "bg-slate-200", text: "text-slate-700", border: "border-slate-400" },
  gold: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  platinum: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" }
};

export default function GamificationDashboard({ user, client, proposals = [] }) {
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);

  // Query achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user.email],
    queryFn: () => base44.entities.GamificationAchievement.filter({
      user_email: user.email
    }, '-unlocked_date'),
    initialData: []
  });

  // Query engagement metrics for progress
  const { data: metrics = [] } = useQuery({
    queryKey: ['user-metrics', user.email],
    queryFn: async () => {
      if (!client) return [];
      return base44.entities.ClientEngagementMetric.filter({
        client_id: client.id
      });
    },
    initialData: [],
    enabled: !!client
  });

  // Calculate progress toward unlockable achievements
  const calculateProgress = () => {
    const progress = {};
    const counts = {
      proposal_view: metrics.filter(m => m.event_type === 'page_view').length,
      comment: metrics.filter(m => m.event_type === 'comment_added').length,
      approval_decision: metrics.filter(m => m.event_type === 'approval_action').length,
      full_scroll: metrics.filter(m => m.scroll_depth_percent >= 95).length,
      quick_response: metrics.filter(m => {
        const responseTime = new Date(m.created_date) - new Date(m.created_date);
        return responseTime < 24 * 60 * 60 * 1000;
      }).length
    };

    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      const unlocked = achievements.find(a => a.achievement_type === def.type);
      if (!unlocked && def.trigger) {
        const current = counts[def.trigger.event] || 0;
        const required = def.trigger.count;
        progress[def.type] = {
          current,
          required,
          percentage: Math.min((current / required) * 100, 100)
        };
      }
    });

    return progress;
  };

  const progress = calculateProgress();

  // Unlock achievement mutation
  const unlockAchievementMutation = useMutation({
    mutationFn: async (achievementDef) => {
      return base44.entities.GamificationAchievement.create({
        user_email: user.email,
        achievement_type: achievementDef.type,
        achievement_name: achievementDef.name,
        achievement_description: achievementDef.description,
        points_earned: achievementDef.points,
        tier: achievementDef.tier,
        unlocked_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      triggerConfetti();
    }
  });

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Check for new achievements
  useEffect(() => {
    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      const unlocked = achievements.find(a => a.achievement_type === def.type);
      const prog = progress[def.type];
      
      if (!unlocked && prog && prog.percentage >= 100) {
        // Auto-unlock
        unlockAchievementMutation.mutate(def);
      }
    });
  }, [progress]);

  // Calculate total points
  const totalPoints = achievements.reduce((sum, a) => sum + (a.points_earned || 0), 0);

  // Calculate level (100 points per level)
  const level = Math.floor(totalPoints / 100) + 1;
  const pointsToNextLevel = ((level) * 100) - totalPoints;
  const levelProgress = ((totalPoints % 100) / 100) * 100;

  // Get tier counts
  const tierCounts = {
    bronze: achievements.filter(a => a.tier === 'bronze').length,
    silver: achievements.filter(a => a.tier === 'silver').length,
    gold: achievements.filter(a => a.tier === 'gold').length,
    platinum: achievements.filter(a => a.tier === 'platinum').length
  };

  // Calculate engagement streak
  const uniqueDays = [...new Set(metrics.map(m => 
    moment(m.created_date).format('YYYY-MM-DD')
  ))].sort().reverse();

  let currentStreak = 0;
  const today = moment().format('YYYY-MM-DD');
  for (let i = 0; i < uniqueDays.length; i++) {
    const expectedDate = moment().subtract(i, 'days').format('YYYY-MM-DD');
    if (uniqueDays[i] === expectedDate) {
      currentStreak++;
    } else {
      break;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-600" />
            Your Progress & Achievements
          </CardTitle>
          <CardDescription>
            Earn points and unlock achievements as you engage with proposals
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Level & Points */}
      <Card className="border-none shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Level {level}</h3>
                <p className="text-sm text-slate-600">{totalPoints} total points</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Next level</p>
              <p className="text-lg font-bold text-purple-600">{pointsToNextLevel} points</p>
            </div>
          </div>
          <Progress value={levelProgress} className="h-3" />
          <p className="text-xs text-slate-500 mt-2 text-center">
            {levelProgress.toFixed(0)}% to Level {level + 1}
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold text-slate-900">{achievements.length}</p>
            <p className="text-xs text-slate-600">Achievements</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Flame className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-2xl font-bold text-slate-900">{currentStreak}</p>
            <p className="text-xs text-slate-600">Day Streak</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Eye className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-slate-900">{proposals.length}</p>
            <p className="text-xs text-slate-600">Proposals Viewed</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-slate-900">
              {metrics.filter(m => m.event_type === 'comment_added').length}
            </p>
            <p className="text-xs text-slate-600">Comments Left</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Collection */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Achievement Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {['bronze', 'silver', 'gold', 'platinum'].map(tier => {
              const colors = TIER_COLORS[tier];
              return (
                <div key={tier} className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}>
                  <Trophy className={`w-8 h-8 ${colors.text} mx-auto mb-2`} />
                  <p className="text-center font-bold text-2xl">{tierCounts[tier]}</p>
                  <p className={`text-center text-xs capitalize ${colors.text}`}>{tier}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unlocked Achievements */}
      {achievements.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Unlocked Achievements ({achievements.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map(achievement => {
                const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === achievement.achievement_type) || {};
                const Icon = def.icon || Award;
                const colors = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;

                return (
                  <Card key={achievement.id} className={`border-2 ${colors.border} ${colors.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold ${colors.text}`}>{achievement.achievement_name}</h4>
                          <p className={`text-sm ${colors.text} opacity-80 mb-2`}>
                            {achievement.achievement_description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge className={colors.bg}>
                              +{achievement.points_earned} points
                            </Badge>
                            <p className="text-xs text-slate-500">
                              {moment(achievement.unlocked_date).fromNow()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Toward Next Achievements */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Next Achievements</CardTitle>
          <CardDescription>Keep engaging to unlock these rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ACHIEVEMENT_DEFINITIONS
              .filter(def => !achievements.find(a => a.achievement_type === def.type))
              .slice(0, 5)
              .map(def => {
                const Icon = def.icon;
                const colors = TIER_COLORS[def.tier];
                const prog = progress[def.type] || { current: 0, required: 1, percentage: 0 };

                return (
                  <div key={def.type} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-slate-900">{def.name}</h4>
                          <Badge className={colors.bg}>
                            +{def.points} points
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{def.description}</p>
                        <div className="space-y-1">
                          <Progress value={prog.percentage} className="h-2" />
                          <p className="text-xs text-slate-500">
                            {prog.current} / {prog.required} {def.trigger?.event?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Motivational Message */}
      {achievements.length === 0 && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Start Your Journey!</h3>
            <p className="text-slate-600 mb-4">
              Engage with proposals to earn your first achievement and start climbing the levels
            </p>
            <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
              <Eye className="w-4 h-4 mr-2" />
              View a Proposal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}