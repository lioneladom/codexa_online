import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

import { getSocketUrl } from '@/config/api';

interface Props {
  code: string;
  language: string;
  runId: number;
  timeLimitSec: number;
}

export default function RunTerminal({ code, language, runId, timeLimitSec }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize XTerm
    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      theme: {
        background: '#060814',
        foreground: '#4ade80',
        cursor: '#4ade80',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.writeln('Connecting to execution sandbox...\r');

    // Connect to WebSocket socket.io server
    const socket = io(getSocketUrl());

    socket.on('connect', () => {
      term.writeln('Sandbox connected. Executing code...\r');
      socket.emit('runCode', { code, language, timeLimitSec });
    });

    socket.on('terminalOutput', (data: string) => {
      term.write(data);
    });

    socket.on('terminalExit', (data: { code: number; signal?: string }) => {
      term.writeln(`\r\nProgram execution completed (exit code: ${data.code}).\r`);
      socket.disconnect();
    });

    socket.on('connect_error', (err) => {
      term.writeln(`\r\nSandbox connection failure: ${err.message}\r`);
    });

    // Write input keys back to the spawned process
    const disposable = term.onData((data) => {
      if (socket.connected) {
        socket.emit('terminalInput', data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      disposable.dispose();
      term.dispose();
      socket.disconnect();
    };
  }, [code, language, runId, timeLimitSec]);

  return (
    <div
      ref={containerRef}
      data-exam-typing-area="true"
      style={{ height: '100%', width: '100%', background: '#060814', padding: '12px' }}
      className="rounded-b-2xl"
    />
  );
}
