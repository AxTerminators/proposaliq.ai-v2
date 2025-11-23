import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server,
  GitBranch,
  Shield,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const DEPLOYMENT_PROCEDURE = `
# Production Deployment Procedure

## Pre-Deployment Checklist
- [ ] All smoke tests passing (100%)
- [ ] Security audit complete with zero critical issues
- [ ] Performance benchmarks met (>90 Lighthouse score)
- [ ] Database backup verified (within last 24 hours)
- [ ] Rollback plan reviewed and understood by team
- [ ] On-call schedule confirmed
- [ ] Staging environment matches production configuration

## Deployment Steps

### 1. Pre-Deployment (T-30 minutes)
1. Notify users of planned maintenance window via email and in-app banner
2. Set up war room (Slack channel + video call)
3. Confirm all team members are available
4. Final smoke test run on staging
5. Database backup initiated

### 2. Deployment Window (T-0 to T+15 minutes)
1. Enable maintenance mode
2. Deploy database migrations (if any)
3. Deploy application code to production
4. Run post-deployment smoke tests
5. Verify critical functionality
6. Disable maintenance mode

### 3. Post-Deployment Monitoring (T+15 to T+60 minutes)
1. Monitor error rates in Sentry
2. Check API response times
3. Verify user login success rate
4. Monitor database performance
5. Check for any spike in support tickets

### 4. Go/No-Go Decision (T+60 minutes)
- **GO**: All metrics green, no critical errors, user feedback positive
- **NO-GO**: Execute rollback procedure immediately

## Success Metrics
- Error rate: <0.1%
- API response time p95: <200ms
- User login success rate: >99%
- Zero critical bugs reported
- Page load time: <1.5s
`;

const ROLLBACK_PLAN = `
# Rollback Procedure

## When to Rollback
Immediately rollback if any of the following occur:
- Critical functionality is broken (login, proposal creation, data access)
- Error rate exceeds 1%
- Security vulnerability discovered
- Data corruption or loss detected
- More than 5 high-priority bugs reported within first hour

## Rollback Steps

### Immediate Actions (Within 5 minutes)
1. **STOP** - Halt all deployment activities
2. **COMMUNICATE** - Alert team in war room
3. **DECIDE** - Product Manager makes rollback decision
4. **EXECUTE** - Follow rollback procedure below

### Technical Rollback Procedure

#### Option 1: Application Rollback (Preferred, ~5 minutes)
\`\`\`bash
# Revert to previous application version
git revert HEAD
npm run build
npm run deploy:production

# Verify rollback successful
curl https://app.govhq.ai/health
\`\`\`

#### Option 2: Database Rollback (If migrations were run, ~15 minutes)
\`\`\`bash
# Restore from pre-deployment backup
# WARNING: This will lose any data created during deployment window

# 1. Enable maintenance mode
# 2. Stop application servers
# 3. Restore database from backup
# 4. Restart application with previous version
# 5. Run smoke tests
# 6. Disable maintenance mode
\`\`\`

### Post-Rollback Actions
1. Notify users deployment was reverted
2. Document what went wrong
3. Schedule post-mortem meeting
4. Fix issues in staging
5. Re-test thoroughly
6. Schedule new deployment attempt

## Rollback Testing
- Rollback procedure tested quarterly on staging
- Last tested: [DATE]
- Next scheduled test: [DATE]
`;

const MONITORING_SETUP = `
# Production Monitoring & Alerting

## Error Monitoring (Sentry)
- **Critical Errors**: Slack alert to #critical-alerts + PagerDuty
- **High Priority Errors**: Slack alert to #engineering
- **Error Rate Threshold**: >10 errors/minute triggers alert
- **Response SLA**: <15 minutes for critical, <1 hour for high

## Performance Monitoring
- **API Response Time**: Alert if p95 >500ms for 5 minutes
- **Database Query Time**: Alert if >1s average
- **Page Load Time**: Alert if >3s average
- **Uptime**: Alert if <99.9% in 24-hour window

## Infrastructure Monitoring
- **Server CPU**: Alert if >80% for 10 minutes
- **Memory Usage**: Alert if >85% for 10 minutes
- **Disk Space**: Alert if >90% used
- **Database Connections**: Alert if >80% of pool used

## Business Metrics
- **User Signups**: Alert if drops by >50% hour-over-hour
- **Login Success Rate**: Alert if <95%
- **Proposal Creation**: Alert if drops by >30% hour-over-hour
- **Payment Processing**: Alert on any failures

## Alert Channels
- **Slack**: #critical-alerts, #engineering, #product
- **PagerDuty**: Critical only, 24/7 on-call rotation
- **Email**: Engineering team + Product Manager
- **Dashboard**: Real-time metrics at monitoring.govhq.ai
`;

const ON_CALL_SCHEDULE = `
# On-Call Schedule (Week of Launch)

## Primary On-Call
- **Monday-Wednesday**: John Doe (Lead Developer)
  - Phone: +1-555-0100
  - Backup: Jane Smith

- **Thursday-Sunday**: Jane Smith (Senior Developer)
  - Phone: +1-555-0101
  - Backup: John Doe

## Escalation Path
1. **Level 1**: Primary On-Call (response: <15 min)
2. **Level 2**: Backup On-Call (if no response in 15 min)
3. **Level 3**: Engineering Manager (if no response in 30 min)
4. **Level 4**: CTO (critical issues only)

## Support Contacts
- **DevOps**: devops@govhq.ai
- **Database Admin**: dba@govhq.ai
- **Security Team**: security@govhq.ai
- **Product Manager**: pm@govhq.ai

## Common Issues & Resolutions
See playbook at: https://docs.govhq.ai/playbook
`;

export default function DeploymentPlan({ user }) {
  const [activeTab, setActiveTab] = useState('procedure');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Production Deployment Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="procedure">Deployment Procedure</TabsTrigger>
              <TabsTrigger value="rollback">Rollback Plan</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="oncall">On-Call Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="procedure" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-blue-600" />
                    Deployment Procedure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{DEPLOYMENT_PROCEDURE}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rollback" className="space-y-4">
              <Card className="border-2 border-amber-300 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-5 h-5" />
                    Rollback Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{ROLLBACK_PLAN}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Monitoring & Alerting Setup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{MONITORING_SETUP}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="oncall" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    On-Call Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{ON_CALL_SCHEDULE}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}