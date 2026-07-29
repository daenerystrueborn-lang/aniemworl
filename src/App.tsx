import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/NavBar";
import SplashScreen from "@/components/SplashScreen";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import HomePage from "@/pages/home";
import FrontPage from "@/pages/frontpage";
import RankingsPage from "@/pages/rankings";
import ProfilePage from "@/pages/profile";
import WikiPage from "@/pages/wiki";
import WikiDetailPage from "@/pages/wiki-detail";
import WatchPage from "@/pages/watch";
import OAuthCallbackPage from "@/pages/oauth";
import AnimePage from "@/pages/anime";
import MoviesPage from "@/pages/movies";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth-context";
import WhatsAppPopup from "@/components/WhatsAppPopup";

const queryClient = new QueryClient();

function RouterInner() {
  const [location] = useLocation();
  const isFrontPage = location === "/";

  return (
    <>
      {!isFrontPage && <NavBar />}
      <PageTransition />
      <Switch>
        <Route path="/" component={FrontPage} />
        <Route path="/home" component={HomePage} />
        <Route path="/rankings" component={RankingsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/anime" component={AnimePage} />
        <Route path="/movies" component={MoviesPage} />
        <Route path="/watch/:id" component={WatchPage} />
        <Route path="/oauth" component={OAuthCallbackPage} />
        <Route path="/wiki/:id" component={WikiDetailPage} />
        <Route path="/wiki" component={WikiPage} />
        <Route component={NotFound} />
      </Switch>
      {!isFrontPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SplashScreen />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <RouterInner />
          </WouterRouter>
          <WhatsAppPopup />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
