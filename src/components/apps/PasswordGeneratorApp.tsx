import { useEffect, useRef, useState } from 'react';
import { Copy, FilePlus2, Lock, RefreshCcw, Save, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  randomToken, readAccessStore, ensureVaultInitialized, readVault, writeVault,
  ACCESS_KEY, SECURE_VAULT_KEY
} from '../../lib/access';
import { cp, readStoredValue, writeStoredValue } from '../../lib/storage';
import { MAIL_WEBMAIL_URL, MAIL_ADMIN_URL, MAIL_DOMAIN } from '../../lib/mail-config';
import type { VaultEntry, AccessSession, EncryptedPayload, AccessStore } from '../../lib/desktop-types';

export function PasswordGeneratorApp({ session }: { session: AccessSession | null }) {
  const [service, setService] = useState('mumblechat-work');
  const [domain, setDomain] = useState(MAIL_DOMAIN);
  const [localPart, setLocalPart] = useState('');
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [vaultStatus, setVaultStatus] = useState(session ? 'Decrypting vault...' : 'Run schadelkoph in Terminal to unlock the account vault.');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadVault() {
      if (!session) {
        setVault([]);
        setVaultStatus('Run schadelkoph in Terminal to unlock the account vault.');
        return;
      }
      try {
        await ensureVaultInitialized(session.vaultKey);
        const entries = await readVault(session.vaultKey);
        if (!cancelled) {
          setVault(entries);
          setVaultStatus(`Vault unlocked for ${session.username}.`);
        }
      } catch {
        if (!cancelled) setVaultStatus('Vault decrypt failed. Log out and unlock again.');
      }
    }
    void loadVault();
    const onVault = () => void loadVault();
    window.addEventListener('thanatos:vault-updated', onVault);
    return () => { cancelled = true; window.removeEventListener('thanatos:vault-updated', onVault); };
  }, [session]);

  const persistVault = async (nextVault: VaultEntry[]) => {
    if (!session) return;
    setVault(nextVault);
    await writeVault(session.vaultKey, nextVault);
    setVaultStatus(`Encrypted ${nextVault.length} account kit${nextVault.length === 1 ? '' : 's'}.`);
  };

  const generatePassword = () => {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    return randomToken(28, a);
  };

  const normalize = (value: string, fallback: string) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || fallback;

  const generate = () => {
    const normalizedService = normalize(service, 'account');
    const normalizedDomain = domain.trim().toLowerCase().replace(/^@/, '') || 'mumblechat.online';
    const generatedLocal = localPart.trim()
      ? normalize(localPart, normalizedService)
      : `${normalizedService}.${randomToken(6)}`;
    const nextEntry: VaultEntry = {
      id: nanoid(),
      service: normalizedService,
      email: `${generatedLocal}@${normalizedDomain}`,
      username: `${normalizedService}-${randomToken(5)}`,
      password: generatePassword(),
      createdAt: new Date().toLocaleString()
    };
    setEntry(nextEntry);
  };

  const save = () => {
    if (!entry || !session) return;
    void persistVault([entry, ...vault.filter((item) => item.id !== entry.id)]);
  };

  const remove = (id: string) => { void persistVault(vault.filter((item) => item.id !== id)); };

  const copyKit = (item = entry) => {
    if (!item) return;
    cp(`service=${item.service}\nemail=${item.email}\nusername=${item.username}\npassword=${item.password}\nwebmail=${MAIL_WEBMAIL_URL}`);
  };

  const exportBackup = () => {
    const access = readStoredValue(ACCESS_KEY);
    const secureVault = readStoredValue(SECURE_VAULT_KEY);
    if (!access || !secureVault) return;
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), access: JSON.parse(access), secureVault: JSON.parse(secureVault) }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `thanatos-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as { version?: number; access?: AccessStore; secureVault?: EncryptedPayload };
      if (backup.version !== 1 || !backup.access || !backup.secureVault) throw new Error('Invalid backup');
      writeStoredValue(ACCESS_KEY, JSON.stringify(backup.access));
      writeStoredValue(SECURE_VAULT_KEY, JSON.stringify(backup.secureVault));
      setVaultStatus('Backup imported. Run schadelkoph again with username, password, and recovery context.');
    } catch {
      setVaultStatus('Backup import failed.');
    }
  };

  if (!session) {
    return (
      <div className="account-vault locked-vault">
        <div className="vault-lock-panel">
          <Lock size={46} />
          <h3>Schadelkoph Gate Sealed</h3>
          <p>{vaultStatus}</p>
          <button type="button" onClick={() => importRef.current?.click()}><FilePlus2 size={15} /> Import encrypted backup</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
        </div>
      </div>
    );
  }

  return (
    <div className="account-vault">
      <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
      <div className="account-generator">
        <label>
          Service
          <input value={service} onChange={(event) => setService(event.target.value)} placeholder="new-staff-account" />
        </label>
        <label>
          Mail domain
          <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="mumblechat.online" />
        </label>
        <label>
          Email name
          <input value={localPart} onChange={(event) => setLocalPart(event.target.value)} placeholder="blank = auto alias" />
        </label>
        <button type="button" onClick={generate}>
          <RefreshCcw size={15} /> Generate account kit
        </button>
      </div>

      <div className="account-kit">
        <strong>{entry ? entry.service : 'No account kit generated'}</strong>
        <code>{entry ? `email: ${entry.email}` : 'email waits here'}</code>
        <code>{entry ? `user: ${entry.username}` : 'username waits here'}</code>
        <code>{entry ? `pass: ${entry.password}` : 'password waits here'}</code>
        <div className="account-actions">
          <button type="button" onClick={save} disabled={!entry}>
            <Save size={15} /> Save to vault
          </button>
          <button type="button" onClick={() => copyKit()} disabled={!entry}>
            <Copy size={15} /> Copy kit
          </button>
        </div>
        <small>Mailboxes are manual in Mailu for now. This vault stores encrypted account kits only.</small>
      </div>

      <div className="mail-dns-card">
        <strong>MumbleChat Mail</strong>
        <code>domain: {MAIL_DOMAIN}</code>
        <code>webmail: {MAIL_WEBMAIL_URL}</code>
        <code>admin: {MAIL_ADMIN_URL}</code>
        <div className="account-actions">
          <button type="button" onClick={() => cp(MAIL_WEBMAIL_URL)}><Copy size={14} /> Copy webmail</button>
          <button type="button" onClick={exportBackup}><Save size={14} /> Export backup</button>
          <button type="button" onClick={() => importRef.current?.click()}><FilePlus2 size={14} /> Import backup</button>
        </div>
        <small>{vaultStatus}</small>
      </div>

      <div className="vault-list">
        {vault.length ? vault.map((item) => (
          <div key={item.id} className="vault-row">
            <strong>{item.service}</strong>
            <span>{item.email}</span>
            <code>{item.password}</code>
            <small>{item.createdAt}</small>
            <button type="button" onClick={() => cp(item.email)}><Copy size={14} /> Email</button>
            <button type="button" onClick={() => cp(item.username)}><Copy size={14} /> User</button>
            <button type="button" onClick={() => cp(item.password)}><Copy size={14} /> Pass</button>
            <button type="button" onClick={() => copyKit(item)}><Copy size={14} /> Kit</button>
            <button type="button" onClick={() => remove(item.id)} aria-label={`Delete ${item.service}`}>
              <X size={14} />
            </button>
          </div>
        )) : <p>No encrypted account kits yet.</p>}
      </div>
    </div>
  );
}
