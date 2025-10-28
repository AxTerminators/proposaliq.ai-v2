import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Proposals from './pages/Proposals';
import ProposalBuilder from './pages/ProposalBuilder';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Onboarding": Onboarding,
    "Proposals": Proposals,
    "ProposalBuilder": ProposalBuilder,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};