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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};