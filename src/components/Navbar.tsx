/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Moon, Sun, Menu, X, LogOut, User, LayoutDashboard, Settings } from 'lucide-react';
import { UserProfile } from '../types';

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
    { label: 'হোম', view: 'home' },
    ...(user ? [{ label: 'ড্যাশবোর্ড', view: 'dashboard' }] : []),
    ...(user?.role === 'admin' ? [{ label: 'এডমিন প্যানেল', view: 'admin' }] : []),
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="p-2 rounded-xl bg-primary text-white shadow-md shadow-primary/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-800 dark:text-white leading-tight tracking-tight">
                মেধা এক্সাম
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Student Exam Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentView === item.view
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* User Controls and Theme Switcher */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Dark Mode / Light Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-amber-400 transition-all duration-300 font-semibold text-xs border border-slate-200/80 dark:border-slate-700/80 shadow-xs active:scale-95"
              aria-label="Toggle Theme"
              title={darkMode ? 'ডে মোডে সুইচ করুন' : 'নাইট মোডে সুইচ করুন'}
            >
              {darkMode ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>ডে মোড</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  <span>নাইট মোড</span>
                </>
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-3">
                <button
                  onClick={() => handleNavClick('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 ${
                    currentView === 'profile' ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-slate-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                      {user.name}
                    </p>
                    <p className="text-[9px] text-slate-400 capitalize">{user.role === 'admin' ? 'এডমিন' : 'শিক্ষার্থী'}</p>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors duration-200"
                  title="লগ আউট"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('login')}
                  className="px-4 py-2 text-sm font-medium glass-btn-secondary rounded-xl"
                >
                  লগইন
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className="px-4 py-2 text-sm font-semibold text-white glass-btn-primary rounded-xl"
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
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`block w-full text-left px-3 py-2.5 rounded-xl text-base font-medium ${
                  currentView === item.view
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}

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
                    onClick={onLogout}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 text-xs font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" /> লগ আউট
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-2 px-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                <button
                  onClick={() => handleNavClick('login')}
                  className="w-full py-2.5 text-center text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  লগইন
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className="w-full py-2.5 text-center text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md"
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
