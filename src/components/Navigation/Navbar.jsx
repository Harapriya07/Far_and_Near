import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="app-topbar">
      <Link to="/dashboard" className="app-topbar__logo">
        Far & Near
      </Link>
      <div className="app-topbar__spacer" />
    </header>
  );
}

export default Navbar;
