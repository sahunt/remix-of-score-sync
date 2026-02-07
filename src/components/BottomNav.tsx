import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useState, useEffect } from 'react';
import { EDI_ICON_ID } from '@/hooks/useEdiMinimize';
import { EDI_BOUNCE_EVENT } from '@/components/edi/EdiOverlay';
import { useEdiOverlay } from '@/contexts/EdiOverlayContext';

// Custom icon components matching the design spec
const HomeIcon = ({
  className
}: {
  className?: string;
}) => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 15.25V6.25C1 5.93333 1.07083 5.63333 1.2125 5.35C1.35417 5.06667 1.55 4.83333 1.8 4.65L7.8 0.15C8.15 -0.116667 8.55 -0.25 9 -0.25C9.45 -0.25 9.85 -0.116667 10.2 0.15L16.2 4.65C16.45 4.83333 16.6458 5.06667 16.7875 5.35C16.9292 5.63333 17 5.93333 17 6.25V15.25C17 15.8 16.8042 16.2708 16.4125 16.6625C16.0208 17.0542 15.55 17.25 15 17.25H12C11.7167 17.25 11.4792 17.1542 11.2875 16.9625C11.0958 16.7708 11 16.5333 11 16.25V11.25C11 10.9667 10.9042 10.7292 10.7125 10.5375C10.5208 10.3458 10.2833 10.25 10 10.25H8C7.71667 10.25 7.47917 10.3458 7.2875 10.5375C7.09583 10.7292 7 10.9667 7 11.25V16.25C7 16.5333 6.90417 16.7708 6.7125 16.9625C6.52083 17.1542 6.28333 17.25 6 17.25H3C2.45 17.25 1.97917 17.0542 1.5875 16.6625C1.19583 16.2708 1 15.8 1 15.25Z" fill="currentColor" />
  </svg>;
const EdiIcon = ({
  className
}: {
  className?: string;
}) => <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M2.6301 11.9046C2.65985 11.7467 2.81252 11.6419 2.97036 11.6717C3.08938 11.6937 3.18124 11.7868 3.20323 11.9046L3.3145 12.4919C3.47751 13.351 4.14898 14.0237 5.00803 14.1855L5.5954 14.2967C5.75324 14.3265 5.85804 14.4791 5.82828 14.637C5.80629 14.756 5.71314 14.8479 5.5954 14.8699L5.00803 14.9811C4.14898 15.1441 3.47622 15.8156 3.3145 16.6747L3.20323 17.262C3.17348 17.4199 3.02081 17.5247 2.86298 17.4949C2.74395 17.4729 2.65209 17.3798 2.6301 17.262L2.51883 16.6747C2.35582 15.8156 1.68436 15.1428 0.825298 14.9811L0.237929 14.8699C0.0800899 14.8401 -0.0247048 14.6874 0.00505173 14.5296C0.0270457 14.4106 0.120197 14.3187 0.237929 14.2967L0.825298 14.1855C1.68436 14.0224 2.35711 13.351 2.51883 12.4919L2.6301 11.9046Z" fill="currentColor" />
    <path d="M9.63873 0.646095C9.71841 0.216301 10.1325 -0.0671802 10.5623 0.0138144C10.8837 0.0739071 11.1345 0.324729 11.1946 0.646095L11.4964 2.23986C11.9379 4.57172 13.7616 6.39671 16.0935 6.83695L17.6872 7.13873C18.117 7.21841 18.4005 7.63253 18.3195 8.06232C18.2594 8.38369 18.0086 8.63451 17.6872 8.6946L16.0935 8.99638C13.7616 9.43793 11.9366 11.2616 11.4964 13.5935L11.1946 15.1872C11.1149 15.617 10.7008 15.9005 10.271 15.8195C9.94964 15.7594 9.69882 15.5086 9.63873 15.1872L9.33696 13.5935C8.8954 11.2616 7.07172 9.43662 4.73986 8.99638L3.14609 8.6946C2.7163 8.61492 2.43282 8.2008 2.51381 7.77101C2.57391 7.44964 2.82473 7.19882 3.14609 7.13873L4.73986 6.83695C7.07172 6.3954 8.89671 4.57172 9.33696 2.23986L9.63873 0.646095Z" fill="currentColor" />
  </svg>;
const ScoresIcon = ({
  className
}: {
  className?: string;
}) => <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M16.124 13.1837L16.152 3.39055C16.152 3.37514 16.15 3.3618 16.15 3.34639C16.149 3.26294 16.146 3.18035 16.138 3.09776C16.135 3.06987 16.133 3.04198 16.13 3.0141C16.12 2.93564 16.11 2.85512 16.094 2.77666C16.089 2.75083 16.083 2.72501 16.077 2.69918C16.06 2.62278 16.042 2.54639 16.019 2.47206C16.012 2.44809 16.005 2.42514 15.997 2.40221C15.972 2.32532 15.945 2.24958 15.914 2.17476C15.906 2.15559 15.899 2.13835 15.89 2.12007C15.857 2.04238 15.821 1.96573 15.78 1.88996C15.772 1.87658 15.765 1.86414 15.758 1.85076C15.715 1.77307 15.669 1.69641 15.619 1.6216C15.613 1.61201 15.607 1.60346 15.6 1.59491C15.548 1.52001 15.493 1.44525 15.434 1.37346C15.429 1.36767 15.423 1.36195 15.419 1.35616C15.358 1.28344 15.294 1.21157 15.226 1.14355C15.157 1.07458 15.086 1.01148 15.013 0.95027C15.007 0.944481 15.002 0.93881 14.996 0.935021C14.924 0.876605 14.849 0.821142 14.775 0.769483C14.766 0.762857 14.756 0.757085 14.748 0.750459C14.673 0.700679 14.596 0.654702 14.519 0.611677C14.506 0.605052 14.493 0.597505 14.48 0.59088C14.406 0.550807 14.328 0.513687 14.25 0.480373C14.232 0.471821 14.215 0.464328 14.196 0.456701C14.121 0.426387 14.045 0.398717 13.968 0.373902C13.945 0.366347 13.922 0.358791 13.898 0.35216C13.823 0.329271 13.748 0.311095 13.671 0.293846C13.644 0.288054 13.619 0.282262 13.592 0.276469C13.513 0.261295 13.435 0.250035 13.356 0.240701C13.328 0.237765 13.299 0.233976 13.272 0.231113C13.189 0.223631 13.107 0.221041 13.025 0.219355C13.01 0.219429 12.995 0.21655 12.981 0.217623L3.18701 0.245976C1.43188 0.250889 0.00494066 1.67774 0 3.4328C-0.00494066 5.18787 1.41436 6.60682 3.16949 6.60191L5.29304 6.5961L1.55837 10.3306C0.313286 11.5755 0.307366 13.5879 1.54527 14.8259C2.78318 16.0638 4.79568 16.0582 6.04077 14.8133L9.77543 11.0786L9.76893 13.2024C9.76399 14.9575 11.1829 16.3764 12.938 16.3715C14.6932 16.3666 16.12 14.9397 16.125 13.1846L16.124 13.1837Z" fill="currentColor" />
  </svg>;
const UploadIcon = ({
  className
}: {
  className?: string;
}) => <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M2.375 17C1.72222 17 1.16319 16.7862 0.697917 16.3587C0.232639 15.9312 0 15.4173 0 14.817V12.634C0 12.3248 0.113889 12.0655 0.341667 11.8563C0.569444 11.6471 0.851389 11.5425 1.1875 11.5425C1.52361 11.5425 1.80556 11.6471 2.03333 11.8563C2.26111 12.0655 2.375 12.3248 2.375 12.634V14.817H16.625V12.634C16.625 12.3248 16.7389 12.0655 16.9667 11.8563C17.1944 11.6471 17.4764 11.5425 17.8125 11.5425C18.1486 11.5425 18.4306 11.6471 18.6583 11.8563C18.8861 12.0655 19 12.3248 19 12.634V14.817C19 15.4173 18.7674 15.9312 18.3021 16.3587C17.8368 16.7862 17.2778 17 16.625 17H2.375ZM8.3125 3.73839L6.08542 5.78493C5.84792 6.00322 5.56597 6.10783 5.23958 6.09869C4.91319 6.08955 4.63125 5.97588 4.39375 5.75759C4.17569 5.5393 4.06191 5.28464 4.05217 4.99358C4.04243 4.70251 4.15621 4.44785 4.39375 4.22956L8.66875 0.300183C8.7875 0.190959 8.91597 0.113736 9.05417 0.0681817C9.19236 0.0227272 9.34028 0 9.49792 0C9.65556 0 9.80347 0.0227272 9.94167 0.0681817C10.0799 0.113636 10.2083 0.190859 10.3271 0.300083L14.6021 4.22946C14.8396 4.44775 14.9534 4.70241 14.9436 4.99348C14.9339 5.28455 14.8201 5.5392 14.6021 5.75749C14.3646 5.97578 14.0826 6.08945 13.7563 6.09859C13.4299 6.10773 13.1479 6.00312 12.9104 5.78483L10.6833 3.73839V11.5425C10.6833 11.8517 10.5694 12.111 10.3417 12.3202C10.1139 12.5294 9.83194 12.634 9.49583 12.634C9.15972 12.634 8.87778 12.5294 8.65 12.3202C8.42222 12.111 8.30833 11.8517 8.30833 11.5425V3.73839H8.3125Z" fill="currentColor" />
  </svg>;
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  id?: string;
  bouncing?: boolean;
}
function NavItem({
  to,
  icon,
  label,
  id,
  bouncing
}: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to || to === '/home' && location.pathname === '/';
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isActive) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  return <NavLink id={id} to={to} onClick={handleClick} className={cn("flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95", isActive ? "bg-[#595E73]/90 rounded-full px-4 py-2" : "px-3 py-2", bouncing && "animate-edi-bounce")}>
      <span className="text-[#E3E3E3]">{icon}</span>
      {isActive && <span className="text-[#E3E3E3] font-medium text-sm px-[2px] pr-0 pl-[3px]">
          {label}
        </span>}
    </NavLink>;
}
export function BottomNav() {
  const [ediBouncing, setEdiBouncing] = useState(false);
  const { open: openEdi } = useEdiOverlay();

  useEffect(() => {
    const handleBounce = () => {
      setEdiBouncing(true);
      setTimeout(() => setEdiBouncing(false), 250);
    };
    window.addEventListener(EDI_BOUNCE_EVENT, handleBounce);
    return () => window.removeEventListener(EDI_BOUNCE_EVENT, handleBounce);
  }, []);

  const {
    isVisible
  } = useScrollDirection({
    threshold: 15
  });
  const location = useLocation();

  const isHomePage = location.pathname === '/home' || location.pathname === '/';
  return <>
      {!isHomePage && <div className={cn("fixed bottom-0 left-0 right-0 h-[160px] pointer-events-none z-40", "transition-transform duration-300 ease-out", isVisible ? "translate-y-0" : "translate-y-[120px]")} style={{
      background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)) 40%, transparent 100%)'
    }} />}

      <nav className={cn("fixed bottom-[46px] left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-1 h-[55px] px-5 rounded-full bg-[#383C4C] transition-transform duration-300 ease-out pl-[10px] pr-[10px]", isVisible ? "translate-y-0" : "translate-y-[120px]")}>
        <NavItem to="/home" icon={<HomeIcon />} label="Home" />
        <button
          id={EDI_ICON_ID}
          onClick={openEdi}
          className={cn(
            "flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 px-3 py-2",
            ediBouncing && "animate-edi-bounce"
          )}
        >
          <span className="text-[#E3E3E3]"><EdiIcon /></span>
        </button>
        <NavItem to="/scores" icon={<ScoresIcon />} label="Scores" />
        <NavItem to="/upload" icon={<UploadIcon />} label="Upload" />
      </nav>
    </>;
}