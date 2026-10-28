'use strict';

/**
 * RoomState — turns StumbleChat WebSocket frames ({ stumble: '<type>', ... }) into
 * chat lines the Thanatos widget can show. Frame shapes follow the ones the
 * automod's WsListener handles: msg, join, joined, leave/quit, nick, userlist,
 * sysmsg, closed.
 *
 * StumbleChat 'msg' frames often carry only a handle, so nicks are remembered
 * from join/joined/userlist/nick frames (and from the cam tiles on the page).
 */

const HISTORY = 300;
const MAX_TEXT = 2000;

class RoomState {
  constructor(room) {
    this.room = room;
    this.nicks = new Map();   // handle → nick
    this.history = [];        // last HISTORY chat lines
    this.selfHandle = null;
    this.closed = false;
    this.lastFrameAt = 0;
  }

  nickFor(handle) {
    return this.nicks.get(String(handle)) || null;
  }

  rememberNick(handle, nick) {
    if (handle == null || !nick) return;
    this.nicks.set(String(handle), String(nick).slice(0, 64));
    if (this.nicks.size > 5000) this.nicks.delete(this.nicks.keys().next().value);
  }

  /** Feed one raw frame payload; returns the chat lines it produced (maybe none). */
  ingest(payload, now = Date.now()) {
    let msg;
    try { msg = typeof payload === 'string' ? JSON.parse(payload) : payload; } catch { return []; }
    if (!msg || typeof msg !== 'object' || typeof msg.stumble !== 'string') return [];
    this.lastFrameAt = now;
    const lines = [];
    const add = (kind, nick, text) => {
      const line = { room: this.room, kind, nick: nick || null, text: String(text).slice(0, MAX_TEXT), ts: now };
      this.history.push(line);
      if (this.history.length > HISTORY) this.history.shift();
      lines.push(line);
    };
    const h = msg.handle != null ? String(msg.handle) : null;

    switch (msg.stumble) {
      case 'msg': {
        if (!msg.text) break;
        if (msg.nick && h) this.rememberNick(h, msg.nick);
        add(h && h === this.selfHandle ? 'self' : 'chat', msg.nick || (h && this.nickFor(h)) || `user ${h ?? '?'}`, msg.text);
        break;
      }
      case 'joined': {
        const self = msg.self || msg;
        if (self.handle != null) this.selfHandle = String(self.handle);
        if (self.handle != null && self.nick) this.rememberNick(self.handle, self.nick);
        if (Array.isArray(msg.userlist)) for (const u of msg.userlist) this.rememberNick(u.handle, u.nick);
        this.closed = false;
        add('system', null, `You joined ${this.room}`);
        break;
      }
      case 'join': {
        this.rememberNick(h, msg.nick);
        add('system', msg.nick, `${msg.nick || 'someone'} joined`);
        break;
      }
      case 'leave':
      case 'quit': {
        const nick = msg.nick || (h && this.nickFor(h));
        add('system', nick, `${nick || 'someone'} left`);
        break;
      }
      case 'nick': {
        const old = msg['old-nick'] || (h && this.nickFor(h));
        this.rememberNick(h, msg.nick);
        if (msg.nick) add('system', msg.nick, `${old || 'someone'} is now ${msg.nick}`);
        break;
      }
      case 'userlist': {
        if (Array.isArray(msg.users)) for (const u of msg.users) this.rememberNick(u.handle, u.nick);
        break;
      }
      case 'sysmsg': {
        if (msg.text) add('system', null, msg.text);
        break;
      }
      case 'closed': {
        this.closed = true;
        add('system', null, 'Room closed by StumbleChat');
        break;
      }
      default:
        break;
    }
    return lines;
  }
}

module.exports = { RoomState, HISTORY };
