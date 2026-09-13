import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, criticalThreshold, expandCritical, validSettings } from '../scripts/rules.js';
import { installIntegration } from '../scripts/integration.js';

function data(skill, total) {
  return {
    origtarget: skill,
    finaltarget: skill,
    rtotal: total,
    isCritSuccess: total <= 4 || (total === 5 && skill >= 15) || (total === 6 && skill >= 16),
    isCritFailure:
      total >= 18 || (total === 17 && skill <= 15) || (total - skill >= 10 && skill > 0),
    failure: total >= 17 || total > skill,
    seventeen: total >= 17,
    margin: skill - total,
  };
}

test('default and alternative progression boundaries', () => {
  for (const [skill, threshold] of [
    [3, 4],
    [14, 4],
    [15, 5],
    [16, 6],
    [19, 6],
    [20, 7],
    [24, 7],
    [25, 8],
    [29, 8],
    [30, 9],
    [65, 16],
    [70, 16],
    [100000, 16],
  ]) {
    assert.equal(criticalThreshold(skill), threshold, `skill ${skill}`);
  }
  const slower = { ...DEFAULTS, interval: 10 };
  for (const [skill, threshold] of [
    [19, 6],
    [20, 7],
    [29, 7],
    [30, 8],
    [39, 8],
    [40, 9],
  ]) {
    assert.equal(criticalThreshold(skill, slower), threshold);
  }
  const later = { ...slower, firstExtraSkill: 25 };
  for (const [skill, threshold] of [
    [24, 6],
    [25, 7],
    [34, 7],
    [35, 8],
  ])
    assert.equal(criticalThreshold(skill, later), threshold);
});

test('all 216 outcomes across skills 1-100 preserve failures and all fields except the critical flag', () => {
  let promoted = 0;
  for (let skill = 1; skill <= 100; skill++)
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        for (let c = 1; c <= 6; c++) {
          const roll = data(skill, a + b + c),
            before = structuredClone(roll);
          const changed = expandCritical(roll);
          if (changed) promoted++;
          const expected =
            before.isCritSuccess ||
            (!before.failure &&
              !before.isCritFailure &&
              skill >= 20 &&
              a + b + c <= Math.min(16, 7 + Math.floor((skill - 20) / 5)));
          assert.equal(roll.isCritSuccess, expected);
          assert.deepEqual({ ...roll, isCritSuccess: before.isCritSuccess }, before);
          if (before.failure || before.isCritFailure) assert.equal(changed, false);
        }
  assert.ok(promoted > 0);
});

test('disabled mode preserves GGA data exactly, across every skill and total', () => {
  for (let skill = 1; skill <= 100; skill++)
    for (let total = 3; total <= 18; total++) {
      const roll = data(skill, total),
        before = structuredClone(roll);
      assert.equal(expandCritical(roll, { ...DEFAULTS, enabled: false }), false);
      assert.deepEqual(roll, before);
    }
});

test('uses final effective skill including penalties, bonuses, and caps; accepts GGA string base targets', () => {
  const penalised = { ...data(19, 7), origtarget: 25, modifier: -6 };
  assert.equal(expandCritical(penalised), false);
  const boosted = { ...data(20, 7), origtarget: 16, modifier: 4 };
  assert.equal(expandCritical(boosted), true);
  const capped = { ...data(16, 7), origtarget: 30, modifier: 10 };
  assert.equal(expandCritical(capped), false);
  assert.equal(expandCritical({ ...data(25, 8), origtarget: '25' }), true);
});

test('invalid settings and malformed/non-targeted results fail safely', () => {
  for (const settings of [
    null,
    {},
    { ...DEFAULTS, interval: 0 },
    { ...DEFAULTS, interval: -1 },
    { ...DEFAULTS, interval: 2.5 },
    { ...DEFAULTS, firstExtraSkill: 16 },
    { ...DEFAULTS, firstExtraSkill: Infinity },
    { ...DEFAULTS, enabled: 'true' },
    { ...DEFAULTS, interval: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    assert.equal(validSettings(settings), false);
    const roll = data(30, 9);
    assert.equal(expandCritical(roll, settings), false);
  }
  for (const roll of [
    null,
    {},
    { ...data(30, 9), origtarget: -1 },
    { ...data(30, 9), finaltarget: NaN },
    { ...data(30, 9), rtotal: 19 },
    { ...data(30, 9), rtotal: 8.5 },
    { ...data(30, 9), failure: true },
    { ...data(30, 9), isCritFailure: true },
    { ...data(30, 9), seventeen: true },
  ])
    assert.equal(expandCritical(roll), false);
});

test('exact critical probabilities match 3d6 enumeration', () => {
  for (const [skill, count] of [
    [19, 20],
    [20, 35],
    [25, 56],
    [30, 81],
  ]) {
    let successes = 0;
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        for (let c = 1; c <= 6; c++) {
          const roll = data(skill, a + b + c);
          expandCritical(roll);
          if (roll.isCritSuccess) successes++;
        }
    assert.equal(successes, count);
  }
});

test('wrapper changes the same object before storage, preserves this/args/return, calls once', () => {
  let calls = 0;
  const gurps = {
    setLastTargetedRoll(roll, ...args) {
      calls++;
      assert.equal(this, gurps);
      assert.equal(roll, input);
      assert.equal(roll.isCritSuccess, true);
      assert.deepEqual(args, ['actor', 'token', true, 'extra']);
      this.stored = { ...roll };
      return 123;
    },
  };
  const input = data(20, 7);
  assert.equal(installIntegration(gurps, () => DEFAULTS).installed, true);
  assert.equal(gurps.setLastTargetedRoll(input, 'actor', 'token', true, 'extra'), 123);
  assert.equal(calls, 1);
  assert.equal(gurps.stored.isCritSuccess, true);
  const installed = gurps.setLastTargetedRoll;
  installIntegration(gurps, () => DEFAULTS);
  assert.equal(gurps.setLastTargetedRoll, installed);
});

test('remote and historical results retain their original classification after settings changes', () => {
  const gurps = {
    setLastTargetedRoll(roll) {
      this.stored = { ...roll };
    },
  };
  installIntegration(gurps, () => {
    throw new Error('Must not read settings for received rolls');
  });
  for (const success of [false, true]) {
    const remote = { ...data(20, 7), isCritSuccess: success };
    gurps.setLastTargetedRoll(remote, 'actor', 'token', false);
    assert.equal(gurps.stored.isCritSuccess, success);
  }
});

test('live settings apply on the next roll and independent callers do not share result state', () => {
  let settings = { ...DEFAULTS };
  const gurps = {
    setLastTargetedRoll(roll) {
      return roll.isCritSuccess;
    },
  };
  installIntegration(gurps, () => settings);
  assert.equal(gurps.setLastTargetedRoll(data(25, 8), 'a', 't', true), true);
  settings.interval = 10;
  assert.equal(gurps.setLastTargetedRoll(data(25, 8), 'b', 'u', true), false);
  settings.enabled = false;
  assert.equal(gurps.setLastTargetedRoll(data(30, 8), 'a', 't', true), false);
  settings = { ...DEFAULTS, firstExtraSkill: 30 };
  assert.equal(gurps.setLastTargetedRoll(data(25, 7), 'a', 't', true), false);
});

test('module errors leave the roll usable, but original GGA errors are never swallowed or retried', () => {
  let calls = 0,
    reports = 0;
  const gurps = {
    setLastTargetedRoll() {
      calls++;
      return 'ok';
    },
  };
  installIntegration(
    gurps,
    () => {
      throw Error('settings error');
    },
    () => {
      reports++;
      throw Error('notification error');
    },
  );
  assert.equal(gurps.setLastTargetedRoll(data(20, 7), null, null, true), 'ok');
  assert.equal(gurps.setLastTargetedRoll(data(20, 7), null, null, true), 'ok');
  assert.equal(calls, 2);
  assert.equal(reports, 1);
  const broken = {
    setLastTargetedRoll() {
      calls++;
      throw Error('original failure');
    },
  };
  installIntegration(broken, () => DEFAULTS);
  assert.throws(
    () => broken.setLastTargetedRoll(data(20, 7), null, null, true),
    /original failure/,
  );
  assert.equal(calls, 3);
});

test('existing and subsequent cooperative wrappers continue to run', () => {
  const order = [];
  const gurps = {
    setLastTargetedRoll(roll) {
      order.push('prior');
      return roll.isCritSuccess;
    },
  };
  installIntegration(gurps, () => DEFAULTS);
  const expanded = gurps.setLastTargetedRoll;
  gurps.setLastTargetedRoll = function (...args) {
    order.push('later');
    return expanded.apply(this, args);
  };
  assert.equal(gurps.setLastTargetedRoll(data(20, 7), null, null, true), true);
  assert.deepEqual(order, ['later', 'prior']);
  assert.equal(installIntegration({}, () => DEFAULTS).installed, false);
});
