'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [serverIp, setServerIp] = useState('192.168.1.100');
  const [port, setPort] = useState('3000');
  const [maxWarnings, setMaxWarnings] = useState('3');
  const [allowCopyPaste, setAllowCopyPaste] = useState(false);
  const [enableConsole, setEnableConsole] = useState(true);
  const [saved, setSaved] = useState(false);
  
  const [profileName, setProfileName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 bg-[#030712] min-h-screen text-[#f0f2f8]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">System Settings</h1>
        <p className="text-[#7b8aaa] text-sm mt-1">Configure LAN connectivity parameters and exam integrity policies.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {saved && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm rounded-xl font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            Settings updated successfully!
          </div>
        )}

        {/* Section 1: Profile Settings */}
        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-1">Profile Settings</h2>
          <p className="text-xs text-[#7b8aaa] mb-4">Update your display name and password. You must enter your current password to save these changes.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-accent">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-accent bg-[#070b18] text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-accent">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-accent bg-[#070b18] text-white font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-accent">Current Password (Required for Profile Changes)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-accent bg-[#070b18] text-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: LAN Connectivity */}
        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-1">LAN Connectivity</h2>
          <p className="text-xs text-[#7b8aaa] mb-4">Used to build LAN access links for students. Candidates connect to this IP.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-accent">Host Server IP Address</label>
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-accent bg-[#070b18] text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-accent">Port Number</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-accent bg-[#070b18] text-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Security Policy */}
        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-1">Exam Security Policy</h2>
          <p className="text-xs text-[#7b8aaa] mb-4">Configure exam integrity rules and allowed student behaviours.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-accent">Max Tab Switches Allowed</label>
              <input
                type="number"
                value={maxWarnings}
                onChange={(e) => setMaxWarnings(e.target.value)}
                className="w-32 px-4 py-2.5 border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-accent bg-[#070b18] text-white font-medium"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={allowCopyPaste}
                  onChange={(e) => setAllowCopyPaste(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${allowCopyPaste ? 'bg-[#bf4507]' : 'bg-[#1a2440]'}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowCopyPaste ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-[#f0f2f8]">Allow copy &amp; paste inside programming editor</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={enableConsole}
                  onChange={(e) => setEnableConsole(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${enableConsole ? 'bg-[#bf4507]' : 'bg-[#1a2440]'}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enableConsole ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-[#f0f2f8]">Allow student code execution console</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="bg-accent hover:bg-accent-hover text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          Save Configurations
        </button>
      </form>
    </div>
  );
}
