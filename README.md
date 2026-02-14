# Proposal IQ / GovHQ
This is another project I built to help government contractors generate proposals. 
I got pretty close to launching it, but decided to go a different direction.

<img width="1073" height="769" alt="Screenshot 2026-02-14 at 10 21 37 AM" src="https://github.com/user-attachments/assets/96d992eb-6111-46c7-8df2-2acf10ca7be6" />

It was built on Base44. 
At the time that I was using B44, it was not mature enough for me, so I moved on to use more mature tools.

If you do use this, you'll need to build out an integration with Openrouter or LiteLLM to use your own LLM API keys fort the proposal generation.

Currently, it is using B44 API LLM integration which will not work outside of B44. You'll need to code in your own integration to one of the LLM models.
B44 uses their own: base44.integrations.Core.InvokeLLM

I'm making these codes available to the public for anyone who wants to work with it, improve on it, fork it or pull it for your own use.

Give me your thougths on this proposal generating app. 

If you do use it, let me know how it goes with your version or improvements to the app.


Here's a list of all the features and functionalities. Lots of good stuff here to review.

Core Features & Capabilities
1. Proposal Pipeline Management
Multi-Board Kanban System - Master board + type-specific boards (RFP, RFI, SBIR, GSA, IDIQ, State/Local, 15-Column RFP workflow)
Drag-and-Drop Workflow - Move proposals through stages (Qualifying → Planning → Drafting → Reviewing → Submitted → Won/Lost/Archived)
Card Templates - Pre-configured proposal card templates with custom fields
WIP Limits - Work-in-progress limits per column with soft/hard enforcement
Swimlanes - Group by client, lead writer, project type, agency, or custom fields
Checklist Integration - Column-specific checklists with manual, system, and AI-triggered items

2. Proposal Builder (8-Phase Workflow)
Phase 1: Basic Information & Solicitation Upload
Phase 2: Strategic Evaluation & Go/No-Go Analysis
Phase 3: Compliance Matrix Generation
Phase 4: Win Theme Development
Phase 5: Content Planning & Outline
Phase 6: AI-Assisted Writing with RAG
Phase 7: Pricing Module (CLIN Builder, Labor Rates, Subcontractor Management)
Phase 8: Final Review & Export

3. AI-Powered Features
InvokeLLM Integration - Context-aware AI responses with web search capability
AI Confidence Scoring - Automated win probability analysis
Smart Reference Discovery - RAG-based retrieval from past proposals
AI Writing Assistant - Section generation with citation tracking
Predictive Health Dashboard - Risk alerts and schedule predictions
Competitor Analysis - AI-driven competitive intelligence

4. Content Library & RAG System
Hierarchical Folder Structure - Organized content repository
Boilerplate Management - Reusable text blocks by category
Document Ingestion - PDF, DOCX parsing with semantic chunking
Semantic Search - Find relevant content across all resources
Quality Feedback Loop - Rate AI-generated content to improve future outputs
Citation Tracking - Audit trail for AI-sourced content

5. Resource Management
Past Performance Records - Structured project history with CPARS ratings
Key Personnel Database - Resumes, certifications, clearances, availability
Teaming Partners - Capability statements, certifications, collaboration history
Win Themes Library - Reusable discriminators and value propositions

6. Client Portal (Consultant Mode)
Client Organizations - Isolated workspaces per client
Proposal Sharing - Share drafts with clients for review
Client Annotations - Highlight, comment, and question tools
Approval Workflows - Multi-step approval gates
Engagement Metrics - Track client views, time spent, scroll depth
Client Team Members - Invite client stakeholders with role-based access

7. Data Calls Module
Data Call Templates - Reusable checklist templates
Checklist Management - Track item completion with file uploads
Deadline Tracking - Due dates with overdue alerts
Discussion Threads - Per-item comments and Q&A
Export to PDF/Excel - Generate formatted data call reports

8. Calendar & Scheduling
Proposal Timeline Editor - Internal deadlines and key milestones
Calendar Events - Meetings, reviews, submission deadlines
Conflict Detection - Identify scheduling conflicts
Team Calendar View - See all team member availability
Gantt Chart View - Visual project timeline

9. Task Management
Proposal Tasks - Linked to specific proposals/sections
General Tasks - Organization-wide task tracking
Subtasks - Break down complex work items
Priority Levels - Low/Medium/High/Urgent
Assignment & Due Dates - Track ownership and deadlines

10. Collaboration Features
Real-time Notifications - Mentions, assignments, status changes
Discussion Threads - Proposal-level and section-level comments
Section Comments - Inline feedback on proposal content
Activity Timeline - Audit log of all actions
@Mentions - Tag team members in discussions

11. Analytics & Reporting
Pipeline Analytics - Value, win rate, stage distribution
Multi-Board Analytics - Cross-board performance metrics
Revenue Charts - Won/Submitted/Pipeline visualization
Win/Loss Analysis - Capture lessons learned
Custom Reports - Build ad-hoc reports
AI Token Usage Dashboard - Monitor LLM consumption

12. Export & Document Generation
Export Templates - Agency-specific formatting (margins, fonts, headers)
PDF Generation - Professional proposal documents
Batch Export - Multiple proposals at once
Export Presets - Save common export configurations
Compliance Matrix Export - Standalone compliance documents

13. Admin Portal (Super Admin)
User Management - RBAC with 9 admin role levels
Organization Management - Multi-tenant architecture
Demo Account Manager - Create fully-seeded demo environments
Audit Logs - Track all admin actions
System Health Monitoring - Error tracking, performance metrics
Email Template Management - Customize system emails
Billing & Subscriptions - Plan management, token credits

14. Integrations & Automation
Automation Rules - Trigger actions on proposal events
AI Workflow Suggestions - Smart automation recommendations
Email Notifications - Automated client/team notifications
Onboarding Email Sequences - Drip campaigns for new users

15. Mobile Experience
Responsive Design - Full mobile support
Mobile Kanban View - Touch-optimized board
Mobile Navigation - Bottom nav for quick access
Swipeable Cards - Gesture-based interactions

Technical Architecture
Layer	Technology
Frontend	React, Tailwind CSS, TypeScript
State Management	TanStack Query (React Query)
UI Components	shadcn/ui, Radix UI primitives
Drag & Drop	@hello-pangea/dnd
Charts	Recharts
Rich Text	React Quill
Backend	Base44 Platform (entities, functions, integrations)
AI	Base44 InvokeLLM with web context
File Storage	Base44 UploadFile integration
