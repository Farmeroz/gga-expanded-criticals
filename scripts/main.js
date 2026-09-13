import { ID, VERSION, DEFAULTS, criticalThreshold } from "./rules.js";
import { installIntegration } from "./integration.js";

const readSettings = () => ({
  enabled: game.settings.get(ID, "enabled"),
  firstExtraSkill: game.settings.get(ID, "firstExtraSkill"),
  interval: game.settings.get(ID, "interval")
});

Hooks.once("init", () => {
  if (game.system.id !== "gurps") return;
  const common = { scope: "world", config: true, requiresReload: false };
  game.settings.register(ID, "enabled", {
    ...common, name: "Enable expanded critical successes", type: Boolean,
    default: DEFAULTS.enabled,
    hint: "Expand GGA's normal critical-success range at high effective skill. Switching off restores standard results for new rolls. Existing chat results stay as rolled."
  });
  const NumberField = foundry.data?.fields?.NumberField ?? foundry.fields?.NumberField;
  // Both the Foundry field and the rules layer reject invalid progression data.
  game.settings.register(ID, "firstExtraSkill", {
    ...common, name: "First expanded critical at effective skill",
    type: new NumberField({ required: true, nullable: false, integer: true, min: 17, max: Number.MAX_SAFE_INTEGER, step: 1 }),
    default: DEFAULTS.firstExtraSkill,
    hint: "The final effective skill at which a roll of 7 becomes a critical success. Default: 20. Minimum: 17, preserving standard thresholds through skill 16."
  });
  game.settings.register(ID, "interval", {
    ...common, name: "Effective skill interval",
    type: new NumberField({ required: true, nullable: false, integer: true, min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 }),
    default: DEFAULTS.interval,
    hint: "Additional effective skill needed for each further +1 to the critical range. Default: 5 (7 at 20, 8 at 25, 9 at 30). Use 10 for 7 at 20, 8 at 30, 9 at 40. Criticals stop at 16; 17 and 18 still fail."
  });
});

Hooks.once("ready", () => {
  if (game.system.id !== "gurps") return;
  let status;
  if (Number(game.release.generation) !== 14 || !/^0\.18\.\d+$/.test(game.system.version)) {
    status = { installed: false, reason: "This release requires Foundry V14 and GGA 0.18.x." };
  } else {
    status = installIntegration(globalThis.GURPS, readSettings, () => {
      ui.notifications.warn("GGA Expanded Criticals could not apply the house rule. GGA's normal result was retained. Check the module settings.");
    });
  }
  const entry = game.modules.get(ID);
  if (entry) entry.api = Object.freeze({
    version: VERSION,
    status: () => ({ ...status, enabled: readSettings().enabled }),
    threshold: effectiveSkill => criticalThreshold(effectiveSkill, readSettings())
  });
  if (!status.installed) ui.notifications.warn(`GGA Expanded Criticals: ${status.reason} The house rule has not activated.`);
  else console.info(`GGA Expanded Criticals | ${VERSION} active. Live-world verification pending.`);
});
