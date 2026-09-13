# GGA Expanded Criticals 0.1.0

An optional house-rule module for **GURPS 4e Game Aid (GGA) 0.18.x on Foundry V14**.  It expands the critical-success range at high effective skill and uses GGA's own critical-success chat presentation and stored roll result.

Default progression: critical on 7 or less at effective skill 20, 8 or less at 25, 9 or less at 30, and another +1 every five effective skill levels.  The GM can change the starting skill and interval independently, or switch the house rule off.

## Install or update

1. From Foundry's **Setup** screen, open **Add-on Modules**.
2. Paste `https://github.com/Farmeroz/gga-expanded-criticals/releases/latest/download/module.json` into **Manifest URL** and select **Install**.
3. Open your GURPS world, enable **GGA Expanded Criticals** in **Manage Modules**, and save/reload.
4. Open **Game Settings > Configure Settings > GGA Expanded Criticals**.  The defaults are already set to the agreed house rule.

Install it on the computer/server hosting Foundry.  Connected players receive the module from that server; they do not install their own copy.  No libWrapper, socketlib, npm installation, or other additional module is required to play.  For a manual installation, download the versioned ZIP from [GitHub Releases](https://github.com/Farmeroz/gga-expanded-criticals/releases).

This initial release deliberately does not declare live-verified Foundry compatibility, so Foundry may show an unverified-compatibility notice.  It is restricted to Foundry V14 and GGA 0.18.x.  Source-level integration was tested against the released GGA **v0.18.23**; other 0.18.x builds have not been individually tested.

## Settings

All three are **world settings controlled by the GM**.  Changes affect new rolls once saved and received by the connected clients; no reload is needed for these settings.  Previous chat cards retain the result they originally received.

| Setting | Default | Meaning |
| --- | ---: | --- |
| Enable expanded critical successes | On | Switch off for normal GGA critical successes on new rolls. |
| First expanded critical at effective skill | 20 | Skill where 7 becomes a critical success.  Whole number, minimum 17. |
| Effective skill interval | 5 | Additional skill needed for each further +1 to the critical range.  Whole number, minimum 1. |

| Effective skill | Start 20, interval 5 | Start 20, interval 10 |
| ---: | ---: | ---: |
| 16-19 | 6 | 6 |
| 20-24 | 7 | 7 |
| 25-29 | 8 | 7 |
| 30-34 | 9 | 8 |
| 35-39 | 10 | 8 |
| 40-44 | 11 | 9 |

Each table value means that number or less.  To start later as well, use (for example) first skill 25 and interval 10: 7 at 25, 8 at 35, 9 at 45.

## Rules and scope

- The calculation uses **final effective skill**, after the Modifier Bucket and any maximum-target modifier GGA applies.  Skill 25 with a -6 penalty gives effective skill 19 and the normal threshold of 6.  Skill 16 with +4 gives effective skill 20 and threshold 7.  A target capped at 16 retains threshold 6.
- Standard critical successes remain: 3-4, plus 5 at effective skill 15+, and 6 at 16+ (**Basic Set, p. B347**).
- Expanded criticals stop at **16**.  Rolls of 17 and 18 still fail; critical failures remain exactly as GGA classifies them (**pp. B343, B348**).
- Applies to ordinary targeted success rolls through GGA, including skills, attributes, attacks, spells, and active defences.  A defence uses its effective defence score, not the underlying weapon skill.  Other targeted checks using that same GGA path also receive the rule.
- Damage, reaction/table rolls, and plain untargeted dice rolls are not expanded.  Independent macros or other modules that calculate their own success/critical results bypass this integration.
- Critical hits and critical defences still have their usual GURPS 4e consequences (**p. B381**).  The module supplies the native critical-success classification; it does not add new automation for tables, damage, spell costs, or defence denial.

## Integration with GGA and Roll Clarity

The module wraps `GURPS.setLastTargetedRoll` synchronously and promotes only eligible normal successes, before GGA clones the result and renders `die-roll-chat-message.hbs`.  It updates the original `chatdata.isCritSuccess` field, so the native critical-success label/style, `lastTargetedRoll`, actor/token result stores, and GGA `/if` `cs:{...}` branches see the expanded result.

It delegates to the existing function exactly once with the same arguments and receiver.  It does not replace GGA's dice roller, modify system files, generate extra rolls/messages, change roll totals/margins, or add its own sockets.  Incoming result copies are preserved as sent, rather than being recalculated under later settings.  Disabling the house rule leaves new GGA results untouched.

**GGA Roll Clarity 0.1.0** was included in the automated compatibility checks.  It continues to recognise the native roll heading, decorate the GM's visible result, and issue a result-free blind-roll receipt to the rolling player.  Public, Private to GM, Blind to GM, and Self Only message permissions/options were compared against unmodified GGA in the test harness.

Live behaviour with your complete module collection remains to be checked in Foundry.  Neither module introduces a new secrecy boundary around GGA's client-side roll data or outcome-dependent scripts.

## Quick live check

With both modules enabled, use a test actor and GGA's normal rolls.  GGA's physical-dice entry can supply exact totals if you already have that feature enabled.

1. Effective skill **20**, total **7**: normal GGA **Critical Success** display.
2. Effective skill **19**, total **7**: ordinary success.
3. Effective skill **25**, total **8**: critical with interval 5; ordinary success after changing interval to 10.
4. Switch the module setting **off**: total 7 at effective skill 20 becomes an ordinary success; total 6 remains critical.
5. Make a qualifying blind roll as a player with Roll Clarity enabled: the GM sees the critical result, and the player receives the usual receipt without an outcome.
6. Check one active defence, one spell/attack, and any critical-dependent macros you actually use.  Re-enable the house rule and restore interval 5 afterwards if that is your intended setting.

## Disable and diagnose

To stop applying the rule, untick **Enable expanded critical successes**.  To remove the integration entirely, disable **GGA Expanded Criticals** in Manage Modules and reload.  No actor records or system files need restoring.

For diagnostics in the browser console:

```js
game.modules.get("gga-expanded-criticals").api.status()
game.modules.get("gga-expanded-criticals").api.threshold(25)
```

The first reports installation status and the toggle; the second calculates the threshold for that effective skill using the current settings.  These calls do not roll dice or create chat messages.  Status describes initial installation; it cannot detect an unrelated module subsequently replacing the wrapped GGA function without delegation.

## Verification and source

See `TESTING.md` in the repository for the recorded results and remaining live checks.  The repository contains the reproducible tests; release ZIPs contain only files needed by Foundry.  Only developers running the tests need the npm development dependencies.

References:

- GURPS 4e **Basic Set**, pp. **B343, B347-348, B381**.  The progression above 6 is a house rule.
- [GGA v0.18.23 roll implementation](https://github.com/crnormand/gurps/blob/v0.18.23/module/dierolls/dieroll.js)
- [GGA v0.18.23 result store](https://github.com/crnormand/gurps/blob/v0.18.23/module/gurps.js)
- [GGA v0.18.23 critical-dependent chat processing](https://github.com/crnormand/gurps/blob/v0.18.23/module/chat/if.js)
- [Foundry module installation structure](https://foundryvtt.com/article/module-development/)

Report problems through [GitHub Issues](https://github.com/Farmeroz/gga-expanded-criticals/issues).  Released under the [MIT licence](LICENSE.txt).

GURPS is a trademark of Steve Jackson Games.  This unofficial module is not affiliated with or endorsed by Steve Jackson Games, Foundry Gaming LLC, or the GURPS Game Aid maintainers.  No rulebook text, artwork, or critical-result tables are bundled.
