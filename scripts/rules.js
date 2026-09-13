/** GURPS 4e house rule. No Foundry globals or side effects. */
export const ID = "gga-expanded-criticals";
export const VERSION = "0.1.0";
export const DEFAULTS = Object.freeze({ enabled: true, firstExtraSkill: 20, interval: 5 });

export function validSettings(settings) {
  return settings != null && typeof settings.enabled === "boolean" &&
    Number.isSafeInteger(settings.firstExtraSkill) && settings.firstExtraSkill >= 17 &&
    Number.isSafeInteger(settings.interval) && settings.interval >= 1;
}

/** 3-4 normally, 5 at 15, 6 at 16; B347. Expanded results stop at 16. */
export function criticalThreshold(effectiveSkill, settings = DEFAULTS) {
  if (!Number.isFinite(effectiveSkill)) return null;
  const standard = effectiveSkill >= 16 ? 6 : effectiveSkill >= 15 ? 5 : 4;
  if (!validSettings(settings) || !settings.enabled || effectiveSkill < settings.firstExtraSkill) {
    return standard;
  }
  return Math.min(16, 7 + Math.floor((effectiveSkill - settings.firstExtraSkill) / settings.interval));
}

/**
 * Only promote a normal success in the additional 7-16 range. Preserve GGA's
 * existing ordinary criticals, failures, margins, raw dice, and other fields.
 * GGA already applied the Modifier Bucket and any target cap to finaltarget.
 */
export function expandCritical(chatdata, settings = DEFAULTS) {
  if (!validSettings(settings) || !settings.enabled || !chatdata || typeof chatdata !== "object") return false;
  if (!["number", "string"].includes(typeof chatdata.origtarget) ||
      !Number.isFinite(Number(chatdata.origtarget)) || Number(chatdata.origtarget) <= 0 ||
      !Number.isFinite(chatdata.finaltarget) || !Number.isInteger(chatdata.rtotal) ||
      chatdata.rtotal < 7 || chatdata.rtotal > 16 ||
      chatdata.isCritSuccess !== false || chatdata.isCritFailure !== false ||
      chatdata.failure !== false || chatdata.seventeen !== false ||
      chatdata.rtotal > chatdata.finaltarget) return false;
  if (chatdata.rtotal > criticalThreshold(chatdata.finaltarget, settings)) return false;
  chatdata.isCritSuccess = true;
  return true;
}
