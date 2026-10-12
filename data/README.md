# Data

Provider responses will be normalized into the internal shape defined by
`scripts/recommendation.js`. Recommendation rules always consume Fahrenheit,
miles per hour, local provider timestamps, and inches of snowfall. Display-unit
conversion is deliberately kept outside the rules so changing units cannot
change the selected recommendation.

Deterministic test fixtures live in `tests/fixtures/`; live provider responses
must not be committed here.

`tests/fixtures/open-meteo.js` contains synthetic geocoding, complete forecast,
and partial forecast payloads for deterministic provider-layer tests. The live
smoke test prints only a location label, timezone, day count, and recommendation
status; it does not write provider responses to disk.

This directory will contain application-owned content manifests. Live weather
responses and precise device locations must not be committed.

`content.js` owns the 45 reviewed semantic outfit recipes, equivalent male and
female fits, protective-layer rules, and the English reminder wording.
