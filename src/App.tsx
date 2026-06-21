import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/NavBar";
import HomePage from "@/pages/home";
import RankingsPage from "@/pages/rankings";
import DownloadsPage from "@/pages/downloads";
import ProfilePage from "@/pages/profile";
import WikiPage from "@/pages/wiki";
import WikiDetailPage from "@/pages/wiki-detail";
<<<<<<< HEAD
import WatchPage from "@/pages/watch";
=======
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth-context";

const queryClient = new QueryClient();

function Router() {
  return (
    <>
      <NavBar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/rankings" component={RankingsPage} />
        <Route path="/downloads" component={DownloadsPage} />
        <Route path="/profile" component={ProfilePage} />
<<<<<<< HEAD
        <Route path="/watch/:id" component={WatchPage} />
=======
>>>>>>> 61fdd465bdb0b8212177fe70a60b20a447c295ab
        <Route path="/wiki/:id" component={WikiDetailPage} />
        <Route path="/wiki" component={WikiPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
