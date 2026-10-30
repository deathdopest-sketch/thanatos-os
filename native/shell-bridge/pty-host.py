#!/usr/bin/env python3
"""Runs a login shell in a real terminal (pty) for the Thanatos Terminal app.

stdin  -> keystrokes for the shell
stdout <- everything the shell prints
fd 3   -> control lines, e.g. {"cols": 120, "rows": 32} to resize

Python's pty module means no native Node addon to compile. Exits with the
shell's exit status; closing stdin hangs up the shell.
"""
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios


def set_size(fd, cols, rows):
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


def main():
    cols = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    rows = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    shell = os.environ.get("SHELL") or "/bin/bash"

    pid, master = pty.fork()
    if pid == 0:
        os.execvp(shell, [shell, "-l"])

    set_size(master, cols, rows)
    control = 3
    inputs = [0, master, control]
    buf = b""
    while True:
        try:
            ready, _, _ = select.select(inputs, [], [])
        except InterruptedError:
            continue
        if master in ready:
            try:
                data = os.read(master, 65536)
            except OSError:
                data = b""
            if not data:
                break
            os.write(1, data)
        if 0 in ready:
            data = os.read(0, 65536)
            if not data:
                os.kill(pid, signal.SIGHUP)
                break
            os.write(master, data)
        if control in ready:
            data = os.read(control, 4096)
            if not data:
                inputs.remove(control)
                continue
            buf += data
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                try:
                    msg = json.loads(line)
                    set_size(master, max(10, min(500, int(msg["cols"]))), max(4, min(200, int(msg["rows"]))))
                except (ValueError, KeyError, TypeError):
                    pass
    _, status = os.waitpid(pid, 0)
    sys.exit(os.waitstatus_to_exitcode(status) if hasattr(os, "waitstatus_to_exitcode") else 0)


if __name__ == "__main__":
    main()
