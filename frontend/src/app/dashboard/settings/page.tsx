'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [serverIp, setServerIp] = useState('192.168.1.100');
  const [port, setPort] = useState('3000');
  const [maxWarnings, setMaxWarnings] = useState('3');
  const [allowCopyPaste, setAllowCopyPaste] = useState(false);
  const [enableConsole, setEnableConsole] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0a0f24]">System Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your offline local area network (LAN) deployment parameters.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl bg-white border border-[#e2e8f0] p-8 rounded-2xl shadow-sm">
        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl font-semibold">
            Settings updated successfully!
          </div>
        )}

        {/* Section 1: LAN Connectivity */}
        <div>
          <h2 className="text-lg font-bold text-[#0a0f24] border-b border-slate-100 pb-2 mb-4">LAN Connectivity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Host Server IP Address</label>
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="w-full px-4 py-2 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Port Number</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-4 py-2 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Used to build LAN access links for students. Candidates must connect to this address.</p>
        </div>

        {/* Section 2: Exam Security Policy */}
        <div>
          <h2 className="text-lg font-bold text-[#0a0f24] border-b border-slate-100 pb-2 mb-4">Exam Security Policy</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Max Tab Switches Allowed</label>
              <input
                type="number"
                value={maxWarnings}
                onChange={(e) => setMaxWarnings(e.target.value)}
                className="w-32 px-4 py-2 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-slate-400 mt-1">Alerts invigilator when exceeded. Exam can be auto-submitted if configured.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="allowCopyPaste"
                type="checkbox"
                checked={allowCopyPaste}
                onChange={(e) => setAllowCopyPaste(e.target.checked)}
                className="h-4 w-4 text-accent border-[#e2e8f0] rounded focus:ring-accent"
              />
              <label htmlFor="allowCopyPaste" className="text-sm font-medium text-slate-700">
                Allow copy & paste inside programming editor
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="enableConsole"
                type="checkbox"
                checked={enableConsole}
                onChange={(e) => setEnableConsole(e.target.checked)}
                className="h-4 w-4 text-accent border-[#e2e8f0] rounded focus:ring-accent"
              />
              <label htmlFor="enableConsole" className="text-sm font-medium text-slate-700">
                Allow student output compilation logs execution console
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="bg-[#1b2554] hover:bg-[#0a0f24] text-white font-semibold py-2 px-6 rounded-xl text-sm transition-all"
        >
          Save Configurations
        </button>
      </form>
    </div>
  );
}
