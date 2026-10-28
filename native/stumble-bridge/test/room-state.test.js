'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomState, HISTORY } = require('../room-state');

test('msg frames use the nick from earlier join/userlist frames', () => {
  const r = new RoomState('zombs');
  r.ingest({ stumble: 'userlist', users: [{ handle: 7, nick: 'Ghoul' }] });
  const [line] = r.ingest(JSON.stringify({ stumble: 'msg', handle: 7, text: 'brains' }), 1000);
  assert.deepEqual(line, { room: 'zombs', kind: 'chat', nick: 'Ghoul', text: 'brains', ts: 1000 });
});

test('own messages are marked self after the joined frame', () => {
  const r = new RoomState('zombs');
  r.ingest({ stumble: 'joined', self: { handle: 3, nick: 'Death' }, userlist: [] });
  const [line] = r.ingest({ stumble: 'msg', handle: 3, text: 'hi' });
  assert.equal(line.kind, 'self');
  assert.equal(line.nick, 'Death');
});

test('join, nick change, leave and closed become system lines', () => {
  const r = new RoomState('zombs');
  r.ingest({ stumble: 'join', handle: 9, nick: 'Rot' });
  const [renamed] = r.ingest({ stumble: 'nick', handle: 9, nick: 'Rotten' });
  const [left] = r.ingest({ stumble: 'quit', handle: 9 });
  const [closed] = r.ingest({ stumble: 'closed' });
  assert.equal(renamed.text, 'Rot is now Rotten');
  assert.equal(left.text, 'Rotten left');
  assert.equal(closed.kind, 'system');
  assert.equal(r.closed, true);
});

test('ignores pings, non-JSON and unknown frames', () => {
  const r = new RoomState('zombs');
  assert.deepEqual(r.ingest('0'), []);
  assert.deepEqual(r.ingest('{"stumble":"ping"}'), []);
  assert.deepEqual(r.ingest({ hello: 1 }), []);
  assert.equal(r.history.length, 0);
});

test('history is capped', () => {
  const r = new RoomState('zombs');
  for (let i = 0; i < HISTORY + 20; i++) r.ingest({ stumble: 'msg', handle: 1, nick: 'a', text: String(i) });
  assert.equal(r.history.length, HISTORY);
  assert.equal(r.history[0].text, '20');
});
