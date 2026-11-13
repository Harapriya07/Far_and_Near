import { Outlet } from "react-router-dom";
import { SharedBucketListProvider } from "../../context/SharedBucketListContext.jsx";
import Navbar from "./Navbar.jsx";
import SideNav from "./SideNav.jsx";
import "./NavBar.css";

function AppLayout() {
  return (
    <SharedBucketListProvider>
    <div className="app-shell">
      <Navbar />
      <div className="app-shell__body">
        <SideNav />
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
    </SharedBucketListProvider>
  );
}

export default AppLayout;
