import { useState } from 'react';
import { Search } from 'lucide-react';

const MAN_DB: Record<string, string> = {
  ls: 'ls [OPTION]... [FILE]...\n\nList directory contents.\n\n  -a   show hidden files\n  -l   long format\n  -h   human-readable sizes\n  -R   recursive\n  -t   sort by time\n  -S   sort by size',
  cd: 'cd [DIR]\n\nChange directory.\n\n  cd ~    home directory\n  cd -    previous directory\n  cd ..   parent directory',
  grep: 'grep [OPTION]... PATTERN [FILE]...\n\nSearch text patterns.\n\n  -i   ignore case\n  -r   recursive\n  -n   line numbers\n  -v   invert match\n  -E   extended regex',
  find: 'find [PATH] [EXPRESSION]\n\nSearch for files.\n\n  -name "*.txt"   by name\n  -type f         files only\n  -type d         dirs only\n  -mtime -7       modified last 7 days\n  -size +10M      larger than 10MB',
  cat: 'cat [OPTION]... [FILE]...\n\nConcatenate and print files.\n\n  -n   number lines\n  -A   show special chars\n  -s   squeeze blank lines',
  chmod: 'chmod MODE FILE\n\nChange file permissions.\n\n  chmod 755 file   rwxr-xr-x\n  chmod 644 file   rw-r--r--\n  chmod +x file    add execute',
  ssh: 'ssh [USER@]HOST\n\nSecure shell remote login.\n\n  -p PORT   custom port\n  -i KEY    identity file\n  -L PORT:HOST:PORT  local port forward',
  tar: 'tar [OPTION]... [FILE]...\n\nArchive utility.\n\n  -czf archive.tar.gz dir/   create gzip\n  -xzf archive.tar.gz        extract\n  -tf  archive.tar.gz        list contents',
  ps: 'ps [OPTION]...\n\nReport process status.\n\n  ps aux    all processes\n  ps -ef    POSIX style\n  ps -p PID specific process',
  kill: 'kill [OPTION]... PID\n\nSend signal to process.\n\n  kill PID     SIGTERM (graceful)\n  kill -9 PID  SIGKILL (force)\n  kill -l      list signals',
  curl: 'curl [OPTION]... URL\n\nTransfer data with URLs.\n\n  -X POST           HTTP method\n  -H "Header: val"  add header\n  -d "data"         request body\n  -o file           output to file\n  -L                follow redirects',
  git: 'git <command>\n\nVersion control.\n\n  git init        initialize\n  git clone URL   clone\n  git add .       stage all\n  git commit -m   commit\n  git push        push\n  git pull        fetch+merge\n  git log --oneline  short log',
  docker: 'docker <command>\n\nContainer runtime.\n\n  docker ps        list running\n  docker run IMG   run container\n  docker build -t  build image\n  docker stop ID   stop\n  docker images    list images',
  vim: 'vim [FILE]\n\nModal text editor.\n\n  i      insert mode\n  Esc    normal mode\n  :w     save\n  :q     quit\n  :wq    save and quit\n  /pat   search',
  nano: 'nano [FILE]\n\nSimple editor.\n\n  Ctrl+O  save\n  Ctrl+X  exit\n  Ctrl+W  search\n  Ctrl+K  cut line',
  systemctl: 'systemctl [CMD] [SVC]\n\nManage systemd services.\n\n  systemctl start svc\n  systemctl stop svc\n  systemctl restart svc\n  systemctl status svc\n  systemctl enable svc',
  apt: 'apt [CMD] [PKG]\n\nDebian package manager.\n\n  apt update        refresh lists\n  apt upgrade       upgrade all\n  apt install PKG   install\n  apt remove PKG    remove\n  apt search TERM   search',
  pacman: 'pacman [OPTION] [PKG]\n\nArch package manager.\n\n  -Syu      full upgrade\n  -S PKG    install\n  -R PKG    remove\n  -Ss TERM  search',
  rsync: 'rsync [OPTION]... SRC DEST\n\nFile synchronization.\n\n  -a   archive (recursive+preserve)\n  -v   verbose\n  -z   compress\n  -P   show progress\n  --delete  delete extras',
  crontab: 'crontab [OPTION]\n\nSchedule commands.\n\n  crontab -e    edit\n  crontab -l    list\n  crontab -r    remove\n\nFMT: MIN HOUR DOM MON DOW CMD\n  0 * * * *   every hour',
  awk: "awk [PROGRAM] [FILE]\n\nText processing.\n\n  awk '{print $1}'        first column\n  awk -F: '{print $1}'    colon-separated\n  awk 'NR==5'             print line 5",
  sed: "sed [SCRIPT] [FILE]\n\nStream editor.\n\n  sed 's/old/new/'    replace first\n  sed 's/old/new/g'   replace all\n  sed -i 's/a/b/g' f  edit in place",
  wget: 'wget [OPTION]... URL\n\nFile downloader.\n\n  -O file    output filename\n  -q         quiet\n  -r         recursive\n  -np        no parent dirs'
};

export function ManPagesApp() {
  const [cmd, setCmd] = useState('ls');
  const commands = Object.keys(MAN_DB);
  const content = MAN_DB[cmd] ?? (commands.filter((c) => c.startsWith(cmd.toLowerCase())).length > 0 ? `Did you mean: ${commands.filter((c) => c.startsWith(cmd.toLowerCase())).join(', ')}?` : `Not found. Try: ${commands.slice(0, 8).join(', ')}`);
  return (
    <div className="man-app">
      <div className="man-search"><Search size={15} style={{ color: '#c7a45e', flexShrink: 0 }} /><input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Search command..." /></div>
      <div className="man-layout">
        <div className="man-sidebar">{commands.map((c) => <button key={c} type="button" className={c === cmd ? 'selected' : ''} onClick={() => setCmd(c)}>{c}</button>)}</div>
        <pre className="man-content">{content}</pre>
      </div>
    </div>
  );
}
