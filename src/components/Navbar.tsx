/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Moon, Sun, Menu, X, LogOut, User, LayoutDashboard, Settings } from 'lucide-react';
import { UserProfile } from '../types';
import MedhaLogo from './MedhaLogo';
import Tooltip from './Tooltip';

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

  const navItems = [
    { label: 'হোম', view: 'home', path: '/', href: '/' },
    { label: 'স্টাডি ম্যাটেরিয়াল', view: 'study-materials', path: '/study-materials', href: '/study-materials' },
    { label: 'রেফারেল', view: 'referral', path: '/referral', href: '/referral' },
    ...(user ? [{ label: 'ড্যাশবোর্ড', view: 'dashboard', path: '/dashboard', href: '/dashboard' }] : []),
    ...(user?.role === 'admin' ? [{ label: 'এডমিন প্যানেল', view: 'admin', path: '/admin', href: '/admin' }] : []),
  ];

  const handleNavClick = (view: string) => {
    setView(view);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('home')}>
            <div className="rounded-xl overflow-hidden shadow-md shadow-[#00a854]/25 group-hover:scale-105 transition-transform duration-200">
              <MedhaLogo className="h-10 w-10" withBackground />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-800 dark:text-white leading-tight tracking-tight group-hover:text-primary transition-colors duration-200">
                মেধা এক্সাম
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Student Exam Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <a
                  key={item.view}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.view);
                  }}
                  className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group flex items-center justify-center ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 font-semibold'
                      : 'text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="relative z-10 transition-colors duration-200 group-hover:text-primary dark:group-hover:text-emerald-400">
                    {item.label}
                  </span>
                  {/* Subtle bottom border transition */}
                  <span
                    className={`absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full transition-all duration-300 ease-out ${
                      isActive
                        ? 'bg-primary dark:bg-emerald-400 scale-x-100 opacity-100 shadow-xs shadow-primary/30'
                        : 'bg-primary/60 dark:bg-emerald-400/60 scale-x-0 group-hover:scale-x-100 opacity-0 group-hover:opacity-80 origin-center'
                    }`}
                  />
                  {/* Small subtle colored indicator dot beneath active link */}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary dark:bg-emerald-400 shadow-xs shadow-primary/60 animate-in fade-in zoom-in-75 duration-200"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* User Controls and Theme Switcher */}
          <div className="hidden md:flex items-center space-x-3">
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
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
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
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold border-l-4 border-primary pl-3'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-primary dark:bg-emerald-400 shadow-sm shadow-primary/50" />
                  )}
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

            {user ? (
              <div className="pt-4 pb-2 border-t border-slate-200 dark:border-slate-800 mt-4 px-3 space-y-3">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</h4>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
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
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 text-xs font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" /> লগ আউট
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-2 px-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                <button
                  onClick={() => handleNavClick('login')}
                  className={`w-full py-2.5 text-center text-sm font-semibold rounded-xl transition-all ${
                    currentView === 'login'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
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
          </div>
        </div>
      )}
    </nav>
  );
}
