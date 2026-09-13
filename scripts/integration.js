import { expandCritical, validSettings } from './rules.js';

const INSTALLED = Symbol.for('gga-expanded-criticals.wrapper');

/**
 * GGA 0.18.23 calls this synchronously before cloning/broadcasting chatdata
 * and rendering its native template. Retain the identical object for both.
 * The fourth argument is true for freshly rolled native checks, false for
 * incoming socket copies. Never reinterpret an incoming or historical result.
 */
export function installIntegration(gurps, getSettings, report = () => {}) {
  if (typeof gurps?.setLastTargetedRoll !== 'function') {
    return { installed: false, reason: "GGA's setLastTargetedRoll function is unavailable." };
  }
  if (gurps.setLastTargetedRoll[INSTALLED])
    return { installed: true, reason: 'Already installed.' };
  const original = gurps.setLastTargetedRoll;
  let reportedProblem = false;
  function wrappedSetLastTargetedRoll(...args) {
    if (args[3] === true) {
      // Keep our error handling separate from the original call: an error in
      // GGA must propagate once, never cause a second roll/store/socket send.
      try {
        const settings = getSettings();
        if (!validSettings(settings)) throw new Error('Invalid critical progression settings.');
        expandCritical(args[0], settings);
      } catch (error) {
        if (!reportedProblem) {
          reportedProblem = true;
          try {
            report(error);
          } catch {
            /* Notifications must not block the roll. */
          }
        }
      }
    }
    return Reflect.apply(original, this, args);
  }
  Object.defineProperty(wrappedSetLastTargetedRoll, INSTALLED, { value: true });
  gurps.setLastTargetedRoll = wrappedSetLastTargetedRoll;
  return { installed: true, reason: 'Active.' };
}
