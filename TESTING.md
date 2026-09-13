# Verification record - 0.1.0

Recorded on **6 September 2026**: **20 tests passed, 0 failed**.

Environment: Node.js v24.19.0, Handlebars 4.7.8, Happy DOM 20.8.4, and XRegExp 5.1.2. Foundry services, settings, dice evaluation, token actions, and transport were mocked. This is **not a live Foundry world or real-browser verification**.

## What ran

The source integration tests execute the actual `_doRoll` routine from GGA's released **v0.18.23**, its native `setLastTargetedRoll` assignment, its native Handlebars chat template, and its `/if` processor. They do not substitute a rewritten version of GGA's critical-success calculation. Pinned upstream fixtures and their licences are in `tests/fixtures`; URLs and SHA-256 hashes are in `tests/fixtures/sources.json`.

The Roll Clarity compatibility test uses the actual `ReceiptController`, heading parser, and decorator from **GGA Roll Clarity 0.1.0**. It supplies the real GGA template output after critical expansion, checks the blind-roll receipt, and exercises the visible/hidden-result decoration paths. It does not simulate every aspect of Foundry's document lifecycle or every installed third-party module.

Passed checks:

1. Default and alternative progression boundaries, including changed starting skill and cap 16.
2. All **216 possible 3d6 combinations at every skill from 1 to 100** (21,600 cases); failures and all unrelated data fields preserved.
3. Disabled mode leaves every skill 1-100 / total 3-18 combination unchanged.
4. Final effective skill, modifiers, caps, and numeric string base targets.
5. Invalid settings and malformed/non-targeted data fail safely.
6. Critical probabilities cross-checked by dice enumeration.
7. Same-object mutation before storage; exact arguments, receiver, return value, and single delegation.
8. Incoming/historical results retain their original classification when settings change.
9. Next-roll settings changes and independent callers.
10. Module errors retain GGA's normal result; original errors are not swallowed or retried.
11. Existing/subsequent cooperative wrappers and unavailable integration function.
12. Native GGA result store, actor/token stores, normal broadcast, and chat template agree after one dice evaluation.
13. Native modifier/cap paths, string targets, and changed settings.
14. Native 17/18 failure handling, including extreme effective skill and threshold 16.
15. Native untargeted roll bypass and no additional chat messages.
16. Public, GM, Blind, and Self message permissions/options and raw dice compared with unmodified GGA.
17. Native pass scripts, token-action consumption, and follow-on damage link each retained.
18. Native `/if` `cs:{...}` branch executes for the expanded critical; ordinary branch executes with the setting off.
19. Roll Clarity heading recognition, result-free player receipt, GM critical display, and hidden-result decoration.
20. Mocked Foundry init/ready lifecycle, three world settings, numerical field constraints, diagnostics, and unsupported-version guard.

## Repeat the tests

From the module folder, with Node.js 20 or newer:

```sh
npm install
npm test
```

Development dependencies are only for tests; Foundry does not load them. The pure rules/wrapper tests can be run without installing dependencies:

```sh
node --test tests/rules.test.js
```

The recorded build used dependencies in a separate temporary directory:

```sh
GEC_TEST_DEPS=/tmp/gga-test-deps node --test tests/*.test.js
```

## Remaining live checks

Run the short checklist in `README.md` on the actual Foundry V14 / GGA 0.18.x world. Confirm the real settings form saves correctly, connected players receive changes, representative sheet rolls use the expected path, critical-dependent macros behave as intended, and Roll Clarity works with the rest of the installed chat/dice modules.

The integration targets the GGA 0.18.x family but only release **0.18.23** was used as the pinned source fixture. A custom macro or another module that computes its own critical result, suppresses the native result-store call, or replaces that function without delegating can bypass this module. GGA updates that move critical-dependent behaviour earlier in the roll routine may require an integration update.
