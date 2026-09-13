/** Run GGA's actual v0.18.23 roll routine and template with mocked Foundry services. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ID, VERSION, DEFAULTS, criticalThreshold } from '../scripts/rules.js';
import { installIntegration } from '../scripts/integration.js';
import {
  ReceiptController,
  describeCheck,
  decorate,
} from './fixtures/gga-roll-clarity-0.1.0/scripts/core.js';

const req = process.env.GEC_TEST_DEPS
  ? createRequire(pathToFileURL(`${process.env.GEC_TEST_DEPS}/package.json`))
  : createRequire(import.meta.url);
const Handlebars = req('handlebars').create();
const XRegExp = req('xregexp');
const { Window } = await import(pathToFileURL(req.resolve('happy-dom')).href);
const fixture = (path) =>
  readFileSync(new URL(`./fixtures/gga-0.18.23/${path}`, import.meta.url), 'utf8');
const source = fixture('module/dierolls/dieroll.js');
const nativeRoutine = source.slice(source.indexOf('async function _doRoll('));
const nativeSetter = fixture('setLastTargetedRoll.js.txt');
const chatTemplate = Handlebars.compile(fixture('templates/die-roll-chat-message.hbs'));
Handlebars.registerHelper({
  not: (x) => !x,
  eq: (a, b) => a === b,
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  displayNumber: (x) => x,
  gurpslink: (x) => x,
  localize: (key) =>
    ({
      'GURPS.rollCriticalSuccess': 'Critical Success!',
      'GURPS.rollCriticalFailure': 'Critical Failure!',
      'GURPS.rollSuccess': 'Success!',
      'GURPS.rollFailure': 'Failure!',
    })[key] ?? key,
});

function harness({ total = 7, mode = 'public', settings = { ...DEFAULTS }, install = true } = {}) {
  const messages = [],
    broadcasts = [],
    events = [],
    rendered = [];
  let evaluations = 0;
  const dice = [];
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      for (let c = 1; c <= 6; c++) {
        if (a + b + c === total && !dice.length) dice.push(a, b, c);
      }
  const user = { id: 'player', name: 'Player', isGM: false };
  const users = new Map([
    [user.id, user],
    ['gm', { id: 'gm', isGM: true }],
  ]);
  const selectedMode = { value: mode, isBlind: () => mode === 'blind' };
  const ctx = vm.createContext({
    console,
    game: {
      user,
      users,
      dice3d: null,
      settings: { get: () => false },
      keyboard: { isModifierActive: () => false },
      socket: { emit: (topic, data) => broadcasts.push({ topic, data: structuredClone(data) }) },
    },
    GURPS: {
      lastTargetedRoll: {},
      lastTargetedRolls: {},
      PendingOTFs: [],
      ModifierBucket: {
        modifierStack: { usingRapidStrike: false },
        applyMods: async (mods) => mods,
      },
      applyModifierDesc: async (_actor, desc) => (desc === 'cap16' ? 16 : null),
      executeOTF: (cmd) => events.push(cmd),
    },
    Settings: { SYSTEM_NAME: 'gurps', SETTING_SHIFT_CLICK_BLIND: 'shiftBlind' },
    canvas: { tokens: { placeables: [] } },
    CONFIG: { sounds: { dice: 'dice.wav' } },
    navigator: { platform: 'Win32' },
    TokenActions: {
      fromToken: async () => ({
        consumeAction: async () => {
          events.push('consumeAction');
        },
      }),
    },
    computePotentialHits: () => ({ rateOfFire: 3, recoil: 2, potentialHits: 3 }),
    Roll: {
      create: (formula) => ({
        formula,
        total,
        dice: [{ results: dice.map((result) => ({ result })) }],
        evaluate: async () => {
          evaluations++;
        },
      }),
    },
    ChatMessage: {
      getSpeaker: () => ({ actor: 'actor', token: 'token', alias: 'Test Hero' }),
      getWhisperRecipients: () => [{ id: 'gm' }],
      applyRollMode: (data, value) => {
        if (value === 'blind') {
          data.blind = true;
          data.whisper = ['gm'];
        }
        if (value === 'gm') {
          data.whisper = ['gm'];
        }
        if (value === 'self') {
          data.whisper = ['player'];
        }
      },
      create: (data, options) => {
        messages.push({ data, options });
        return Promise.resolve(data);
      },
    },
    Foundry: {
      getMessageMode: () => selectedMode,
      applyMessageMode: (opts, m) => ({ ...opts, messageMode: m.value }),
    },
    MessageMode: { Blind: { value: 'blind' } },
    renderTemplate: async (path, data) => {
      rendered.push({ path, data });
      return chatTemplate(data);
    },
  });
  vm.runInContext(`${nativeSetter}\n${nativeRoutine}\nglobalThis.nativeRoll = _doRoll;`, ctx);
  if (install) installIntegration(ctx.GURPS, () => settings);
  return {
    ctx,
    messages,
    broadcasts,
    rendered,
    events,
    settings,
    users,
    user,
    evaluations: () => evaluations,
    roll: (options = {}) =>
      ctx.nativeRoll({
        origtarget: 20,
        chatthing: '[S:"Observation"]',
        thing: 'Observation',
        ...options,
      }),
  };
}

test('native roll stores, broadcasts, and renders the expanded critical from one dice evaluation', async () => {
  const h = harness();
  assert.equal(await h.roll(), true);
  assert.equal(h.evaluations(), 1);
  assert.equal(h.messages.length, 1);
  assert.equal(h.broadcasts.length, 1);
  assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, true);
  assert.equal(h.ctx.GURPS.lastTargetedRolls.actor.isCritSuccess, true);
  assert.equal(h.ctx.GURPS.lastTargetedRolls.token.isCritSuccess, true);
  assert.equal(h.broadcasts[0].data.chatdata.isCritSuccess, true);
  assert.match(h.messages[0].data.content, /<span class='crit success'>Critical Success!<\/span>/);
  assert.equal(h.rendered[0].data.rtotal, 7);
  assert.equal(h.rendered[0].data.margin, 13);
});

test('native penalties, bonuses, target caps, string targets, and changed settings', async () => {
  for (const [target, mods, settings, expected] of [
    [25, [{ modint: -6, desc: 'penalty' }], { ...DEFAULTS }, false],
    [16, [{ modint: 4, desc: 'bonus' }], { ...DEFAULTS }, true],
    [30, [{ modint: 10, desc: 'cap16' }], { ...DEFAULTS }, false],
    ['20', [], { ...DEFAULTS }, true],
    [20, [], { ...DEFAULTS, enabled: false }, false],
    [20, [], { ...DEFAULTS, firstExtraSkill: 25 }, false],
  ]) {
    const h = harness({ settings });
    await h.roll({ origtarget: target, targetmods: mods });
    assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, expected);
  }
  const h = harness({ total: 8 });
  await h.roll({ origtarget: 25 });
  assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, true);
  h.settings.interval = 10;
  await h.roll({ origtarget: 25 });
  assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, false);
});

test('native 17/18 failures and critical failures remain unchanged, even at extreme skill', async () => {
  for (const skill of [14, 15, 16, 20, 1000])
    for (const total of [17, 18]) {
      const h = harness({ total });
      assert.equal(await h.roll({ origtarget: skill }), false);
      assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, false);
      assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritFailure, total === 18 || skill <= 15);
      assert.equal(h.ctx.GURPS.lastTargetedRoll.failure, true);
    }
  const h = harness({ total: 16 });
  await h.roll({ origtarget: 1000 });
  assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, true);
});

test('native untargeted rolls bypass the integration; enabling adds no chat messages', async () => {
  const h = harness();
  await h.roll({ origtarget: -1, formula: '3d6' });
  assert.equal(h.evaluations(), 1);
  assert.equal(h.messages.length, 1);
  assert.equal(h.broadcasts.length, 0);
  assert.equal(h.ctx.GURPS.lastTargetedRoll.isCritSuccess, undefined);
  assert.doesNotMatch(h.messages[0].data.content, /Critical Success/);
});

test('all four native visibility modes preserve permissions, raw dice, and message options', async () => {
  for (const mode of ['public', 'gm', 'blind', 'self']) {
    const base = harness({ mode, install: false }),
      expanded = harness({ mode });
    await base.roll();
    await expanded.roll();
    const plain = (data) => JSON.parse(JSON.stringify(data));
    const normal = plain(base.messages),
      changed = plain(expanded.messages);
    changed[0].data.content = normal[0].data.content;
    assert.deepEqual(changed, normal, mode);
    assert.match(expanded.messages[0].data.content, /Critical Success!/);
  }
});

test('native attack resources, follow-on damage link, and pass scripts still run once', async () => {
  const h = harness();
  h.ctx.canvas.tokens.placeables.push({ id: 'token' });
  await h.roll({
    actor: { getOwners: () => [] },
    optionalArgs: {
      obj: { rcl: 2, rof: 3, passotf: 'pass-script' },
      followon: '[2d cut]',
      action: { type: 'attack' },
    },
  });
  assert.deepEqual(h.events, ['pass-script', 'consumeAction']);
  assert.match(h.messages[0].data.content, /\[2d cut\]/);
  assert.equal(h.ctx.GURPS.lastTargetedRoll.rofrcl, 3);
  assert.equal(h.evaluations(), 1);
});

test('native /if critical-success branch consumes the expanded result', async () => {
  for (const enabled of [true, false]) {
    const h = harness({ settings: { ...DEFAULTS, enabled } });
    h.ctx.XRegExp = XRegExp;
    h.ctx.parselink = () => ({ action: { type: 'attribute' } });
    h.ctx.OtfActionType = { modifier: 'modifier' };
    h.ctx.ChatProcessor = class {
      priv() {}
      send() {}
      msgs() {
        return { event: {}, data: {} };
      }
    };
    h.ctx.GURPS.performAction = () => h.roll();
    const ifSource = fixture('module/chat/if.js')
      .replace(/^import .*$/gm, '')
      .replace('export class', 'class');
    vm.runInContext(`${ifSource}\nglobalThis.IfChatProcessor=IfChatProcessor;`, h.ctx);
    const processor = new h.ctx.IfChatProcessor(),
      branches = [];
    processor._handleResult = async (branch) => branches.push(branch.trim());
    await processor.process(
      '/if [DX20] cs:{critical-branch} s:{success-branch} f:{failure-branch}',
    );
    assert.deepEqual(branches, [enabled ? 'critical-branch' : 'success-branch']);
  }
});

test('Roll Clarity recognises the native critical card and keeps blind receipts result-free', async () => {
  const h = harness({ mode: 'blind' });
  await h.roll();
  const window = new Window();
  try {
    const description = describeCheck(h.messages[0].data.content, window.DOMParser);
    assert.deepEqual(description, { check: 'Observation', baseTarget: 20 });
    const receipts = [];
    const controller = new ReceiptController({
      user: () => h.user,
      users: () => h.users,
      settings: () => ({ audience: 'self', detail: 'check' }),
      describe: (content) => describeCheck(content, window.DOMParser),
      randomId: () => 'receipt-token',
      create: async (data, options) => {
        receipts.push({ data, options });
        return data;
      },
      notify: (message) => assert.fail(message),
    });
    const msg = {
      ...h.messages[0].data,
      id: 'message-id',
      author: h.user,
      isRoll: true,
      flags: {},
      updateSource(update) {
        this.flags['gga-roll-clarity'] = {
          requestToken: update['flags.gga-roll-clarity.requestToken'],
        };
      },
    };
    controller.before(msg, {}, {}, 'player');
    await controller.after(msg, {}, 'player');
    assert.equal(receipts.length, 1);
    assert.deepEqual(receipts[0].data.whisper, ['player']);
    assert.match(receipts[0].data.content, /Observation/);
    assert.doesNotMatch(receipts[0].data.content, /critical|success|margin|\b7\b|\b13\b|\b20\b/i);
    assert.deepEqual(receipts[0].data.rolls, []);
    assert.equal(receipts[0].options.messageMode, 'self');
    const html = window.document.createElement('li');
    html.innerHTML = h.messages[0].data.content;
    decorate({ ...msg, visible: true, isContentVisible: true }, html, { users: h.users });
    assert.match(html.textContent, /Blind to GM/);
    assert.match(html.textContent, /Critical Success!/);
    const hidden = window.document.createElement('li');
    decorate({ ...msg, visible: true, isContentVisible: false }, hidden, { users: h.users });
    assert.equal(hidden.textContent, '');
  } finally {
    await window.happyDOM.close();
  }
});

test('Foundry lifecycle registers three world settings, installs on V14/GGA 0.18, and exposes read-only diagnostics', () => {
  const registered = new Map(),
    callbacks = new Map(),
    warnings = [];
  const entry = {};
  const ctx = vm.createContext({
    ID,
    VERSION,
    DEFAULTS,
    criticalThreshold,
    installIntegration,
    console,
    Hooks: { once: (event, fn) => callbacks.set(event, fn) },
    foundry: {
      data: {
        fields: {
          NumberField: class {
            constructor(options) {
              this.options = options;
            }
          },
        },
      },
    },
    game: {
      system: { id: 'gurps', version: '0.18.23' },
      release: { generation: 14 },
      modules: new Map([[ID, entry]]),
      settings: {
        register: (id, key, config) => {
          assert.equal(id, ID);
          registered.set(key, config);
        },
        get: (_id, key) => registered.get(key).default,
      },
    },
    GURPS: { setLastTargetedRoll() {} },
    ui: { notifications: { warn: (message) => warnings.push(message) } },
  });
  const main = readFileSync(new URL('../scripts/main.js', import.meta.url), 'utf8').replace(
    /^import .*$/gm,
    '',
  );
  vm.runInContext(main, ctx);
  callbacks.get('init')();
  callbacks.get('ready')();
  assert.equal(registered.size, 3);
  for (const config of registered.values()) {
    assert.equal(config.scope, 'world');
    assert.equal(config.requiresReload, false);
  }
  assert.equal(registered.get('firstExtraSkill').type.options.min, 17);
  assert.equal(registered.get('interval').type.options.min, 1);
  assert.equal(registered.get('interval').type.options.integer, true);
  assert.equal(entry.api.status().installed, true);
  assert.equal(entry.api.threshold(25), 8);
  assert.equal(warnings.length, 0);
  ctx.game.system.version = '0.19.0';
  callbacks.get('ready')();
  assert.equal(entry.api.status().installed, false);
  assert.equal(warnings.length, 1);
});
