import { ID, ReceiptController, decorate } from "./core.js";

Hooks.once("init", () => {
  if (game.system.id !== "gurps") return;
  const common = { scope: "world", config: true, requiresReload: true };
  game.settings.register(ID, "labels", {
    ...common, name: "Show roll visibility labels", type: Boolean, default: true,
    hint: "Label visible roll results as Public, Private to GM, Blind to GM, Self Only, or custom recipients."
  });
  game.settings.register(ID, "borders", {
    ...common, name: "Add coloured roll borders", type: Boolean, default: true,
    hint: "Add a coloured border alongside the text label. Text always identifies the mode."
  });
  game.settings.register(ID, "audience", {
    ...common, name: "Blind-roll confirmation audience", type: String, default: "self",
    choices: { self: "Rolling player only", gm: "Rolling player and recipient GMs", public: "Everyone", off: "No confirmations" },
    hint: "Only player-submitted blind rolls produce confirmations. Everyone announces the character and chosen detail to the whole group. GM-initiated rolls stay silent."
  });
  game.settings.register(ID, "detail", {
    ...common, name: "Blind-roll confirmation detail", type: String, default: "check",
    choices: { generic: "Character only", check: "Character and check name", base: "Character, check, and original target" },
    hint: "Original target is the number in GGA's check heading, before roll modifiers. Enable it only if that number is player-known. Dice, margins, effective targets, and outcomes are never copied. Unrecognised checks get a generic confirmation."
  });
});

Hooks.once("ready", () => {
  if (game.system.id !== "gurps") return;
  if (Number(game.release.generation) !== 14 || !/^0\.18\./.test(game.system.version)) {
    ui.notifications.warn("GGA Roll Clarity 0.1.0 targets Foundry V14 and GGA 0.18.x. It has not activated on this version.");
    return;
  }
  const settings = () => ({
    audience: game.settings.get(ID, "audience"), detail: game.settings.get(ID, "detail")
  });
  const controller = new ReceiptController({
    user: () => game.user, users: () => game.users, settings,
    randomId: () => foundry.utils.randomID(24),
    create: (data, options) => foundry.documents.ChatMessage.create(data, options),
    notify: message => ui.notifications.warn(message)
  });
  Hooks.on("preCreateChatMessage", (...args) => {
    try { controller.before(...args); }
    catch { ui.notifications.warn("GGA Roll Clarity could not prepare a confirmation. The roll can still proceed."); }
  });
  Hooks.on("createChatMessage", (...args) => {
    void controller.after(...args).catch(() => {
      ui.notifications.warn("GGA Roll Clarity could not confirm this roll. Please check with the GM.");
    });
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    decorate(message, html, { users: game.users,
      showLabels: game.settings.get(ID, "labels"), borders: game.settings.get(ID, "borders") });
  });
  // Existing messages can be rendered before ready. Refresh them so their labels appear too.
  ui.chat?.render({ force: true });
  console.info("GGA Roll Clarity | 0.1.0 active (preview; live-world verification required).");
});
