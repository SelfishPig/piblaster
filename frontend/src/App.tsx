import { BookOpen, House, RadioTower, Settings } from "lucide-react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { LearnPage } from "./pages/LearnPage";
import { HomePage } from "./pages/HomePage";
import { RemotesPage } from "./pages/RemotesPage";
import { StatusPage } from "./pages/StatusPage";
import { ToastProvider } from "./components/ToastProvider";

const navigation = [
  { to: "/", label: "Home", icon: House },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/remotes", label: "Remotes", icon: RadioTower },
  { to: "/status", label: "Status", icon: Settings },
];

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="drawer md:drawer-open">
          <input
            id="application-drawer"
            type="checkbox"
            className="drawer-toggle"
          />
          <div className="drawer-content min-h-dvh bg-base-200 text-base-content">
            <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 md:pt-9 md:pb-12 lg:px-10">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/remotes" element={<RemotesPage />} />
                <Route path="/status" element={<StatusPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <nav aria-label="Primary" className="dock dock-md md:hidden">
              {navigation.map((item) => (
                <MobileNavigationLink key={item.to} {...item} />
              ))}
            </nav>
          </div>
          <div className="drawer-side z-20">
            <label
              htmlFor="application-drawer"
              aria-label="Close navigation"
              className="drawer-overlay"
            />
            <aside className="min-h-full w-60 bg-base-100 p-4">
              <nav aria-label="Primary">
                <ul className="menu w-full">
                  {navigation.map((item) => (
                    <li key={item.to}>
                      <DesktopNavigationLink {...item} />
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          </div>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

function DesktopNavigationLink({
  to,
  label,
  icon: Icon,
}: (typeof navigation)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => (isActive ? "menu-active" : "")}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </NavLink>
  );
}

function MobileNavigationLink({
  to,
  label,
  icon: Icon,
}: (typeof navigation)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => (isActive ? "dock-active" : "")}
    >
      <Icon className="size-[1.2em]" />
      <span className="dock-label">{label}</span>
    </NavLink>
  );
}

export default App;
