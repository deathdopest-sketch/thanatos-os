import { ExternalLink } from 'lucide-react';
import { openChatWindow } from './RotViceApp';

const CHATCOMMON_URL = 'https://chatcommon.com';

export function ChatCommonApp() {
  return (
    <div className="chat-app">
      <div className="chat-panel chat-launch">
        <h3>ChatCommon</h3>
        <p className="chat-hint">Opens chatcommon.com in its own window. Sign in there as yourself.</p>
        <button type="button" className="primary-action" onClick={() => openChatWindow(CHATCOMMON_URL)}><ExternalLink size={15} /> Open ChatCommon</button>
      </div>
    </div>
  );
}
