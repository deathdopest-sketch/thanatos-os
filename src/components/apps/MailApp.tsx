import { Copy, Mail, ShieldCheck } from 'lucide-react';
import { MAIL_WEBMAIL_URL, MAIL_ADMIN_URL, MAIL_DOMAIN } from '../../lib/mail-config';
import { cp } from '../../lib/storage';

export function MailApp() {
  return (
    <div className="mail-app">
      <Mail size={46} />
      <h3>MumbleChat Mail</h3>
      <p>Use real MumbleChat mailboxes through Mailu. Account creation stays manual until the Mailu API bridge is added.</p>
      <div className="mail-links">
        <a href={MAIL_WEBMAIL_URL} target="_blank" rel="noreferrer"><button type="button"><Mail size={15} /> Webmail</button></a>
        <a href={MAIL_ADMIN_URL} target="_blank" rel="noreferrer"><button type="button"><ShieldCheck size={15} /> Admin</button></a>
        <button type="button" onClick={() => cp(MAIL_WEBMAIL_URL)}><Copy size={15} /> Copy webmail</button>
      </div>
      <code>{MAIL_DOMAIN}</code>
    </div>
  );
}
