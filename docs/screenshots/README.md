# Screenshots

Generated, not taken by hand. Do not edit these, and do not add files here manually:
the next `npm run capture` overwrites the folder for the version it captures.

```sh
npm run capture                       # every scenario, into docs/screenshots/<manifest version>/
node tools/capture.mjs --only=popup   # one scenario
node tools/capture.mjs --video=<id>   # a different stream (chat scenarios need a live one)
node tools/capture.mjs --keep-open    # leave Chrome up to poke at what it captured
```

Run it **after** bumping `manifest.json`, since the folder is named from that version and
the popup screenshots show the installed version in them.

Each image is cropped to the thing it is about, using the element's bounding box, so what
lands here is the extension and the player rather than a desktop. UI-only crops are PNG;
anything with video behind it is JPEG, which is the difference between 40KB and 300KB.

A scenario that cannot run is reported and the script exits non-zero rather than quietly
producing a short set. `sticky-chat` and `masthead-reveal` need a stream with live chat,
so they are skipped by name if the default stream has ended; pass `--video=` with a live
one.
