import { ChevronUp, File, FilePlus2, Folder, FolderPlus } from 'lucide-react';
import { useVfsListing } from '../../lib/use-vfs-listing';
import { normalizePath } from '../../lib/vfs';

export function FileManagerApp() {
  const { cwd, listing, selectedFile, error, openDirectory, openFile, createDemoFile, createFolder } = useVfsListing();
  const parentPath = cwd === '/' ? '/' : normalizePath(cwd.split('/').slice(0, -1).join('/') || '/');
  return (
    <div className="file-manager">
      <div className="file-toolbar">
        <button type="button" onClick={() => openDirectory(parentPath)} disabled={cwd === '/'}><ChevronUp size={16} /><span>Up</span></button>
        <button type="button" onClick={createFolder}><FolderPlus size={16} /><span>Folder</span></button>
        <button type="button" onClick={createDemoFile}><FilePlus2 size={16} /><span>File</span></button>
        <code>{cwd}</code>
      </div>
      {error ? <div className="vfs-error">{error}</div> : null}
      <div className="file-layout">
        <div className="file-list">
          {listing?.directories.map((d) => <button key={d.path} type="button" className="file-row" onClick={() => openDirectory(d.path)}><Folder size={17} /><span>{d.name}</span><small>dir</small></button>)}
          {listing?.files.map((f) => <button key={f.path} type="button" className="file-row" onClick={() => openFile(f.path)}><File size={17} /><span>{f.name}</span><small>{f.size} B</small></button>)}
        </div>
        <pre className="file-preview">{selectedFile?.content ?? 'Select a file to preview.'}</pre>
      </div>
    </div>
  );
}
