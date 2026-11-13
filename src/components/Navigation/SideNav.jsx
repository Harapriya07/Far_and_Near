import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HomeIcon, GamesIcon, ListIcon } from "./icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const links = [
  { to: "/dashboard", label: "Home", icon: HomeIcon, end: true },
  { to: "/games", label: "Games", icon: GamesIcon },
  { to: "/bucket-list", label: "Bucket List", icon: ListIcon },
];

function NavItems({ onNavigate }) {
  return links.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        "sidenav__link" + (isActive ? " sidenav__link--active" : "")
      }
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  ));
}

function SideNav() {
  const { account, space, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Couldn't log out. Please try again.");
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="sidenav sidenav--desktop" aria-label="Main navigation">
        <div className="sidenav__brand">Far & Near</div>
        <div className="sidenav__links">
          <NavItems />
        </div>

        <div className="sidenav__account">
          {space && <p className="sidenav__space">{space.name}</p>}
          {account && <p className="sidenav__user">{account.name}</p>}
          <button type="button" className="sidenav__logout" onClick={handleLogout}>
            Log out
          </button>
          {logoutError && <p role="alert" className="auth-error">{logoutError}</p>}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="sidenav sidenav--mobile" aria-label="Main navigation">
        <NavItems />
      </nav>
    </>
  );
}

export default SideNav;
