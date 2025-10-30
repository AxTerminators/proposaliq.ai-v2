import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Proposals from './pages/Proposals';
import ProposalBuilder from './pages/ProposalBuilder';
import Resources from './pages/Resources';
import Chat from './pages/Chat';
import Subscription from './pages/Subscription';
import Discussions from './pages/Discussions';
import AdminPortal from './pages/AdminPortal';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import ExportCenter from './pages/ExportCenter';
import OpportunityFinder from './pages/OpportunityFinder';
import PastPerformance from './pages/PastPerformance';
import Team from './pages/Team';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import TeamingPartners from './pages/TeamingPartners';
import Feedback from './pages/Feedback';
import RateFeedback from './pages/RateFeedback';
import ClientPortal from './pages/ClientPortal';
import ClientProposalView from './pages/ClientProposalView';
import Clients from './pages/Clients';
import CostEstimator from './pages/CostEstimator';
import ClientSatisfactionSurvey from './pages/ClientSatisfactionSurvey';
import ClientFeedbackForm from './pages/ClientFeedbackForm';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Onboarding": Onboarding,
    "Proposals": Proposals,
    "ProposalBuilder": ProposalBuilder,
    "Resources": Resources,
    "Chat": Chat,
    "Subscription": Subscription,
    "Discussions": Discussions,
    "AdminPortal": AdminPortal,
    "LandingPage": LandingPage,
    "Home": Home,
    "Pricing": Pricing,
    "Settings": Settings,
    "Analytics": Analytics,
    "ExportCenter": ExportCenter,
    "OpportunityFinder": OpportunityFinder,
    "PastPerformance": PastPerformance,
    "Team": Team,
    "Calendar": Calendar,
    "Tasks": Tasks,
    "TeamingPartners": TeamingPartners,
    "Feedback": Feedback,
    "RateFeedback": RateFeedback,
    "ClientPortal": ClientPortal,
    "ClientProposalView": ClientProposalView,
    "Clients": Clients,
    "CostEstimator": CostEstimator,
    "ClientSatisfactionSurvey": ClientSatisfactionSurvey,
    "ClientFeedbackForm": ClientFeedbackForm,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};