# GGA Expanded Criticals 0.1.1

An optional house-rule module for **GURPS 4e Game Aid (GGA) 0.18.x on Foundry V14**. It expands the critical-success range at high effective skill and uses GGA's own critical-success chat presentation and stored roll result.

Default progression: critical on 7 or less at effective skill 20, 8 or less at 25, 9 or less at 30, and another +1 every five effective skill levels. The GM can change the starting skill and interval independently, or switch the house rule off.

## Install or update

1. From Foundry's **Setup** screen, open **Add-on Modules**.
2. Paste `https://github.com/Farmeroz/gga-expanded-criticals/releases/latest/download/module.json` into **Manifest URL** and select **Install**.
3. Open your GURPS world, enable **GGA Expanded Criticals** in **Manage Modules**, and save/reload.
4. Open **Game Settings > Configure Settings > GGA Expanded Criticals**. The defaults are already set to the agreed house rule.

Install it on the computer/server hosting Foundry. Connected players receive the module from that server; they do not install their own copy. No libWrapper, socketlib, npm installation, or other additional module is required to play. For a manual installation, download the versioned ZIP from [GitHub Releases](https://github.com/Farmeroz/gga-expanded-criticals/releases).

Supports Foundry V14 and GGA 0.18.x. Tested in live Foundry worlds with GGA **v0.18.23**.

## Settings

All three are **world settings controlled by the GM**. Changes affect new rolls once saved and received by the connected clients; no reload is needed for these settings. Previous chat cards retain the result they originally received.

| Setting                                    | Default | Meaning                                                                                     |
| ------------------------------------------ | ------: | ------------------------------------------------------------------------------------------- |
| Enable expanded critical successes         |      On | Switch off for normal GGA critical successes on new rolls.                                  |
| First expanded critical at effective skill |      20 | Skill where 7 becomes a critical success. Whole number, minimum 17.                         |
| Effective skill interval                   |       5 | Additional skill needed for each further +1 to the critical range. Whole number, minimum 1. |

| Effective skill | Start 20, interval 5 | Start 20, interval 10 |
| --------------: | -------------------: | --------------------: |
|           16-19 |                    6 |                     6 |
|           20-24 |                    7 |                     7 |
|           25-29 |                    8 |                     7 |
|           30-34 |                    9 |                     8 |
|           35-39 |                   10 |                     8 |
|           40-44 |                   11 |                     9 |

Each table value means that number or less. To start later as well, use (for example) first skill 25 and interval 10: 7 at 25, 8 at 35, 9 at 45.

## Rules and scope

- The calculation uses **final effective skill**, after the Modifier Bucket and any maximum-target modifier GGA applies. Skill 25 with a -6 penalty gives effective skill 19 and the normal threshold of 6. Skill 16 with +4 gives effective skill 20 and threshold 7. A target capped at 16 retains threshold 6.
- Standard critical successes remain: 3-4, plus 5 at effective skill 15+, and 6 at 16+ (**Basic Set, p. B347**).
- Expanded criticals stop at **16**. Rolls of 17 and 18 still fail; critical failures remain exactly as GGA classifies them (**pp. B343, B348**).
- Applies to ordinary targeted success rolls through GGA, including skills, attributes, attacks, spells, and active defences. A defence uses its effective defence score, not the underlying weapon skill. Other targeted checks using that same GGA path also receive the rule.
- Damage, reaction/table rolls, and plain untargeted dice rolls are not expanded. Independent macros or other modules that calculate their own success/critical results bypass this integration.
- Critical hits and critical defences still have their usual GURPS 4e consequences (**p. B381**). The module supplies the native critical-success classification; it does not add new automation for tables, damage, spell costs, or defence denial.

## Using Roll Clarity

Expanded critical successes use GGA's normal critical-success display. With Roll Clarity enabled, the GM sees the result and players making blind rolls receive the usual confirmation without an outcome.

## Disable

To stop applying the rule, untick **Enable expanded critical successes**. To remove it, disable **GGA Expanded Criticals** in Manage Modules and reload.

Report problems through [GitHub Issues](https://github.com/Farmeroz/gga-expanded-criticals/issues). Released under the [MIT licence](LICENSE.txt).

GURPS is a trademark of Steve Jackson Games. This unofficial module is not affiliated with or endorsed by Steve Jackson Games, Foundry Gaming LLC, or the GURPS Game Aid maintainers. No rulebook text, artwork, or critical-result tables are bundled.
