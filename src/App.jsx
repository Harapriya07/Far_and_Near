import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Landing from "./pages/Landing.jsx";
import NotFound from "./pages/NotFound.jsx";
import Login from "./components/Auth/Login.jsx";
import Signup from "./components/Auth/Signup.jsx";
import SpaceSetup from "./components/Auth/SpaceSetup.jsx";
import ProtectedRoute from "./components/Auth/ProtectedRoute.jsx";
import AppLayout from "./components/Navigation/AppLayout.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import GamesHub from "./pages/GamesHub.jsx";
import TruthOrDare from "./components/Games/TruthOrDare.jsx";
import WouldYouRather from "./components/Games/WouldYouRather.jsx";
import NeverHaveIEver from "./components/Games/NeverHaveIEver.jsx";
import FinishMySentence from "./components/Games/FinishMySentence.jsx";
import TicTacToe from "./components/Games/TicTacToe.jsx";
import Ludo from "./components/Games/Ludo.jsx";
import GameRoomGate from "./components/Games/GameRoomGate.jsx";
import SharedGameHome from "./components/Games/SharedGameHome.jsx";
import BucketList from "./components/BucketList/BucketList.jsx";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/space/setup" element={<SpaceSetup />} />

              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/games" element={<GamesHub />} />
                <Route element={<GameRoomGate />}>
                  <Route path="/games/room" element={<SharedGameHome />} />
                  <Route path="/games/truth-or-dare" element={<TruthOrDare />} />
                  <Route path="/games/would-you-rather" element={<WouldYouRather />} />
                  <Route path="/games/never-have-i-ever" element={<NeverHaveIEver />} />
                  <Route path="/games/finish-my-sentence" element={<FinishMySentence />} />
                  <Route path="/games/tic-tac-toe" element={<TicTacToe />} />
                  <Route path="/games/ludo" element={<Ludo />} />
                </Route>
                <Route path="/bucket-list" element={<BucketList />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
