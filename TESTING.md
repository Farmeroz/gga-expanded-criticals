# Testing

Start with the setup commands in [CONTRIBUTING.md](CONTRIBUTING.md).

## Automated coverage

Existing tests cover critical thresholds and configuration, preserving native failures, wrapper installation, native GGA roll/template behaviour, and interaction with Roll Clarity fixtures. The attributed fixtures under `tests/fixtures` remain unchanged: GGA v0.18.23 and Roll Clarity v0.1.0. These fixtures do not establish compatibility with later Roll Clarity releases. Foundry services are mocked.

The suite exercises these behaviours but does not claim complete coverage or reproduce a connected Foundry world. All automated cases should run; the standard test command treats skipped Node tests as a failure. Test output is saved under `test-output/`.

## Source fixtures

No external source download is needed. Setup confirms that the suite uses its local fixtures or mocks.

## Live check

With both modules enabled, use a test actor and GGA's normal rolls. GGA's physical-dice entry can supply exact totals if you already have that feature enabled.

1. Effective skill **20**, total **7**: normal GGA **Critical Success** display.
2. Effective skill **19**, total **7**: ordinary success.
3. Effective skill **25**, total **8**: critical with interval 5; ordinary success after changing interval to 10.
4. Switch the module setting **off**: total 7 at effective skill 20 becomes an ordinary success; total 6 remains critical.
5. Make a qualifying blind roll as a player with Roll Clarity enabled: the GM sees the critical result, and the player receives the usual receipt without an outcome.
6. Check one active defence, one spell/attack, and any critical-dependent macros you actually use. Re-enable the house rule and restore interval 5 afterwards if that is your intended setting.

Use your normal Foundry/GGA versions and module combination, and refresh connected clients after updating. Record unexpected notifications, visibility changes, or changed resource totals, together with the module versions and steps to reproduce them.

## Package verification

The build checks module/package versions, install URLs, declared assets, local imports, the allowed archive file list, and every archived file's bytes. The release ZIP contains only runtime files, the licence, and user documentation.

## Console diagnostics

```js
game.modules.get("gga-expanded-criticals").api.status()
game.modules.get("gga-expanded-criticals").api.threshold(25)
```

The first reports installation status and the toggle; the second calculates the threshold for that effective skill using the current settings. These calls do not roll dice or create chat messages. Status describes initial installation; it cannot detect an unrelated module subsequently replacing the wrapped GGA function without delegation.
