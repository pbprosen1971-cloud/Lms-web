/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Moon, 
  Sun, 
  Menu, 
  X, 
  LogOut, 
  User, 
  LayoutDashboard, 
  Settings, 
  Bell, 
  ExternalLink, 
  ChevronDown,
  Home,
  Radio,
  BookOpen,
  GraduationCap,
  Calculator,
  Gift,
  Award
} from 'lucide-react';
import { UserProfile } from '../types';
import MedhaLogo from './MedhaLogo';
import Tooltip from './Tooltip';
import NotificationModal from './NotificationModal';
import { subscribeToNotifications } from '../services/notificationService';

export const STUDY_NAV_CATEGORIES = [
  { id: 'all', label: 'সকল স্টাডি ম্যাটেরিয়াল', badge: 'ALL' },
  { id: 'Syllabus', label: 'সিলেবাস', badge: 'PDF' },
  { id: 'Notes', label: 'হ্যান্ড নোট ও সামারি', badge: 'NOTE' },
  { id: 'Suggestion', label: 'স্পেশাল সাজেশন', badge: 'HOT' },
  { id: 'Previous Questions', label: 'বিগত সালের প্রশ্ন', badge: 'JOB' },
  { id: 'Job Preparation', label: 'জব প্রিপারেশন', badge: 'PREP' },
  { id: 'Admission Preparation', label: 'ভর্তি প্রস্তুতি', badge: 'EDU' },
  { id: 'Other', label: 'অন্যান্য', badge: 'EXTRA' },
];

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Navbar({
  currentView,
  setView,
  user,
  onLogout,
  darkMode,
  toggleDarkMode,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifCount, setNotifCount] = useState<number>(0);
  const [isStudyDropdownOpen, setIsStudyDropdownOpen] = useState(false);
  const [isMobileStudyOpen, setIsMobileStudyOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = subscribeToNotifications((list) => {
      setNotifCount(list.length);
    });
    return () => unsub();
  }, []);

  const isAdminUser =
    user?.role === 'admin' ||
    ['medha@admin.com', 'admin@medha.com', 'pbprosen1971@gmail.com', 'prosenjit@medha.com'].includes(
      (user?.email || '').toLowerCase().trim()
    );

  interface NavItem {
    label: string;
    view: string;
    path: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    isExternal?: boolean;
  }

  const navItems: NavItem[] = [
    { label: 'হোম', view: 'home', path: '/', href: '/', icon: Home },
    { label: 'লাইভ পরিক্ষা', view: 'live-exam', path: '/live-exam', href: '/live-exam', icon: Radio },
    { label: 'প্রশ্নব্যাংক', view: 'job-questionbank', path: '/job-questionbank', href: '/job-questionbank', icon: BookOpen },
    { label: 'চাকরি পরীক্ষার ফলাফল', view: 'job-result', path: '/all-job-result', href: '/all-job-result', icon: Award },
    { label: 'স্টাডি ম্যাটেরিয়াল', view: 'study-materials', path: '/study-materials', href: '/study-materials', icon: GraduationCap },
    { label: 'বয়স ক্যালকুলেটর', view: 'age-calculator', path: '/age-calculator', href: '/age-calculator', icon: Calculator },
    { label: 'রেফারেল', view: 'referral', path: '/referral', href: '/referral', icon: Gift },
    ...(user ? [{ label: 'ড্যাশবোর্ড', view: 'dashboard', path: '/dashboard', href: '/dashboard', icon: LayoutDashboard }] : []),
    ...(isAdminUser ? [{ label: 'এডমিন প্যানেল', view: 'admin', path: '/admin', href: '/admin', icon: Settings }] : []),
  ];

  const handleNavClick = (view: string) => {
    setView(view);
    setIsOpen(false);
    setIsStudyDropdownOpen(false);
    setIsMobileStudyOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleCategoryNavClick = (catId: string) => {
    setIsStudyDropdownOpen(false);
    setIsMobileStudyOpen(false);
    setIsOpen(false);
    const targetPath = catId === 'all' ? '/study-materials' : `/study-materials?category=${encodeURIComponent(catId)}`;
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setView('study-materials');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-300 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => {
              setView('home');
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
            }}
          >
            <div className="rounded-xl overflow-hidden shadow-md shadow-[#00a854]/25 group-hover:scale-105 transition-transform duration-200">
              <MedhaLogo className="h-10 w-10" withBackground />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-800 dark:text-white leading-tight tracking-tight group-hover:text-primary transition-colors duration-200">
                মেধা এক্সাম
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Job Exam Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links - Expanding Capsule Pill Bar */}
          <div className="hidden md:flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/70 shadow-inner space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              const isHovered = hoveredNav === item.view;
              const isExpanded = isActive || isHovered;

              if (item.isExternal) {
                return (
                  <a
                    key={item.view}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setHoveredNav(item.view)}
                    onMouseLeave={() => setHoveredNav(null)}
                    className={`relative flex items-center h-9 rounded-full text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                      isHovered
                        ? 'bg-white dark:bg-slate-700/80 text-primary dark:text-emerald-400 shadow-xs px-3'
                        : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-emerald-400 px-2.5'
                    }`}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap flex items-center ${
                        isExpanded
                          ? 'max-w-[140px] opacity-100 ml-1.5'
                          : 'max-w-0 opacity-0 ml-0'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ExternalLink className="h-3 w-3 ml-1 opacity-70 shrink-0" />
                    </div>
                  </a>
                );
              }

              if (item.view === 'study-materials') {
                return (
                  <div
                    key={item.view}
                    className="relative"
                    onMouseEnter={() => {
                      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
                      setHoveredNav(item.view);
                      setIsStudyDropdownOpen(true);
                    }}
                    onMouseLeave={() => {
                      setHoveredNav(null);
                      dropdownTimerRef.current = setTimeout(() => {
                        setIsStudyDropdownOpen(false);
                      }, 200);
                    }}
                  >
                    <a
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.view);
                        setIsStudyDropdownOpen((prev) => !prev);
                      }}
                      className={`relative flex items-center h-9 rounded-full text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                        isActive
                          ? 'bg-primary text-white shadow-sm shadow-primary/30 px-3.5 font-bold'
                          : isHovered
                          ? 'bg-white dark:bg-slate-700/80 text-primary dark:text-emerald-400 shadow-xs px-3'
                          : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-emerald-400 px-2.5'
                      }`}
                      aria-haspopup="true"
                      aria-expanded={isStudyDropdownOpen}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap flex items-center ${
                          isExpanded
                            ? 'max-w-[160px] opacity-100 ml-1.5'
                            : 'max-w-0 opacity-0 ml-0'
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 ml-1 transition-transform duration-300 ease-in-out shrink-0 ${
                            isStudyDropdownOpen
                              ? 'rotate-180 text-current'
                              : 'rotate-0 text-current opacity-70'
                          }`}
                        />
                      </div>
                    </a>

                    {/* Smooth Dropdown Box */}
                    {isStudyDropdownOpen && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in origin-top space-y-0.5"
                        onMouseEnter={() => {
                          if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
                          setHoveredNav(item.view);
                          setIsStudyDropdownOpen(true);
                        }}
                        onMouseLeave={() => {
                          setHoveredNav(null);
                          dropdownTimerRef.current = setTimeout(() => {
                            setIsStudyDropdownOpen(false);
                          }, 200);
                        }}
                      >
                        <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                          ক্যাটাগরি অনুযায়ী দেখুন
                        </div>

                        {STUDY_NAV_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryNavClick(cat.id)}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-all flex items-center justify-between group/cat cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover/cat:bg-emerald-500 transition-colors" />
                              <span>{cat.label}</span>
                            </span>
                            {cat.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover/cat:bg-emerald-100 dark:group-hover/cat:bg-emerald-900/50 group-hover/cat:text-emerald-700 dark:group-hover/cat:text-emerald-300 transition-colors">
                                {cat.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.view}
                  href={item.path}
                  onMouseEnter={() => setHoveredNav(item.view)}
                  onMouseLeave={() => setHoveredNav(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.view);
                  }}
                  className={`relative flex items-center h-9 rounded-full text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/30 px-3.5 font-bold'
                      : isHovered
                      ? 'bg-white dark:bg-slate-700/80 text-primary dark:text-emerald-400 shadow-xs px-3'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-emerald-400 px-2.5'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                      isExpanded
                        ? 'max-w-[140px] opacity-100 ml-1.5'
                        : 'max-w-0 opacity-0 ml-0'
                    }`}
                  >
                    <span>{item.label}</span>
                  </div>
                </a>
              );
            })}
          </div>

          {/* User Controls and Theme Switcher */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Notification Bell Button */}
            <Tooltip content="নোটিফিকেশন সেন্টার (Notifications)" position="bottom">
              <button
                onClick={() => setIsNotifModalOpen(true)}
                className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-all duration-200 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary/40 shadow-xs active:scale-95 group"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 group-hover:text-primary transition-colors" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
            </Tooltip>

            {/* Dark Mode / Light Mode Toggle Button */}
            <Tooltip
              content={darkMode ? 'ডে মোড (Theme Toggle)' : 'নাইট মোড (Theme Toggle)'}
              position="bottom"
            >
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-primary dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-amber-400 transition-all duration-300 font-semibold text-xs border border-slate-200/80 dark:border-slate-700/80 hover:border-primary/40 shadow-xs active:scale-95 group"
                aria-label="Toggle Theme"
              >
                {darkMode ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-500 group-hover:rotate-45 transition-transform duration-300" />
                    <span className="group-hover:text-primary dark:group-hover:text-amber-300 transition-colors duration-200">ডে মোড</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300 group-hover:-rotate-12 transition-transform duration-300" />
                    <span className="group-hover:text-primary transition-colors duration-200">নাইট মোড</span>
                  </>
                )}
              </button>
            </Tooltip>

            {user ? (
              <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-3">
                <Tooltip content="ইউজার প্রোফাইল (User Profile)" position="bottom">
                  <button
                    onClick={() => handleNavClick('profile')}
                    aria-label="User Profile"
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ${
                      currentView === 'profile' ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover border border-slate-300 group-hover:border-primary transition-colors duration-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-primary group-hover:border-primary/50 transition-colors duration-200">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors duration-200 max-w-[100px] truncate">
                        {user.name}
                      </p>
                      <p className="text-[9px] text-slate-400 capitalize">{user.role === 'admin' ? 'এডমিন' : 'শিক্ষার্থী'}</p>
                    </div>
                  </button>
                </Tooltip>

                <Tooltip content="লগ আউট (Log Out)" position="bottom">
                  <button
                    onClick={onLogout}
                    aria-label="Log Out"
                    className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-all duration-200 hover:scale-105"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('login')}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
                    currentView === 'login'
                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                      : 'glass-btn-secondary text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  লগইন
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                    currentView === 'register'
                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                      : 'glass-btn-primary text-white'
                  }`}
                >
                  রেজিস্ট্রেশন
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setIsNotifModalOpen(true)}
              aria-label="Notifications"
              className="relative p-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="px-2 pt-3 pb-3 space-y-1">
            {user ? (
              <div className="pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 px-3 space-y-3">
                <div
                  onClick={() => handleNavClick('profile')}
                  className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 cursor-pointer hover:border-primary/40 transition-all"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleNavClick('profile')}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold"
                  >
                    <User className="h-3.5 w-3.5" /> প্রোফাইল
                  </button>
                  <button
                    onClick={() => handleNavClick('referral')}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 text-xs font-semibold"
                  >
                    রেফারেল
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 text-xs font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" /> লগ আউট
                  </button>
                </div>
              </div>
            ) : (
              <div className="pb-3 mb-2 grid grid-cols-2 gap-2 px-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleNavClick('login')}
                  className={`w-full py-2.5 text-center text-sm font-semibold rounded-xl transition-all ${
                    currentView === 'login'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-700 hover:text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  লগইন
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className={`w-full py-2.5 text-center text-sm font-semibold rounded-xl transition-all ${
                    currentView === 'register'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-white bg-primary/90 hover:bg-primary-dark shadow-md'
                  }`}
                >
                  রেজিস্ট্রেশন
                </button>
              </div>
            )}

            {navItems.map((item) => {
              const isActive = currentView === item.view;
              if (item.isExternal) {
                return (
                  <a
                    key={item.view}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between w-full text-left px-3.5 py-2.5 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-200 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30"
                  >
                    <span className="flex items-center gap-2">
                      <span>📅 {item.label}</span>
                      <ExternalLink className="h-4 w-4 opacity-60" />
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">Facebook</span>
                  </a>
                );
              }
              if (item.view === 'study-materials') {
                return (
                  <div key={item.view} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <a
                        href={item.path}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(item.view);
                        }}
                        className={`flex-1 text-left px-3.5 py-2.5 rounded-xl text-base font-medium cursor-pointer transition-all duration-200 ${
                          isActive
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400 font-bold border-l-4 border-primary dark:border-emerald-400 pl-3'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className={isActive ? 'text-primary dark:text-emerald-400 font-bold' : ''}>{item.label}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsMobileStudyOpen((prev) => !prev)}
                        className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 rounded-xl"
                        aria-label="ক্যাটাগরি সমূহ"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isMobileStudyOpen ? 'rotate-180 text-primary' : 'rotate-0'}`} />
                      </button>
                    </div>
                    {isMobileStudyOpen && (
                      <div className="pl-5 pr-2 py-1 space-y-1 border-l-2 border-emerald-500/20 ml-4">
                        {STUDY_NAV_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryNavClick(cat.id)}
                            className="w-full text-left py-1.5 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary rounded-lg transition-colors flex items-center justify-between"
                          >
                            <span>{cat.label}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500">{cat.badge}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.view}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.view);
                  }}
                  className={`flex items-center justify-between w-full text-left px-3.5 py-2.5 rounded-xl text-base font-medium cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400 font-bold border-l-4 border-primary dark:border-emerald-400 pl-3'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={isActive ? 'text-primary dark:text-emerald-400 font-bold' : ''}>{item.label}</span>
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-2 bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-300 shadow-sm shadow-emerald-500/50 opacity-100'
                        : 'w-0 opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                </a>
              );
            })}

            {/* Mobile Theme Toggle */}
            <div className="pt-2 pb-1 px-1">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-amber-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
              >
                {darkMode ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>ডে মোডে সুইচ করুন</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    <span>নাইট মোডে সুইচ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Push Notification Center Modal */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        currentUser={user}
        onNavigate={setView}
      />
    </nav>
  );
}
