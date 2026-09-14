import { createHelpController, helpResolver } from './tooltip-engine.mjs';
export const helpConfig = {
  id: 'gga-expanded-criticals',
  scope:
    '[data-help-module="gga-expanded-criticals"], [name^="gga-expanded-criticals."], [data-key^="gga-expanded-criticals."], [data-tool="gga-expanded-criticals"], [data-control="gga-expanded-criticals"]',
  actions: {},
  fields: {},
  rules: [
    [
      '[name$=".helpTooltips"]',
      'Show or hide optional hover and keyboard help for this client. Essential labels and notices remain visible.',
    ],
  ],
  actionAttributes: ['data-action'],
};
let resolve = helpResolver(helpConfig);

export const helpController = createHelpController({ ...helpConfig, resolve });
if (globalThis.Hooks) {
  Hooks.once('init', () => helpController.register());
  Hooks.once('ready', () => helpController.start());
}
