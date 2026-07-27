# News & Highlights images

Drop images for news items and home highlights here, then reference them from
`data/highlights.json` (`image`) or `data/news.json` (`images[].src`).

These are the filenames the current `data/highlights.json` expects. Until you
add them, each card automatically falls back to a cover image (no broken image):

- `autcon-cross-platform-bim-xr.jpg`: latest Automation in Construction paper
- `phd-defense.jpg`: PhD thesis defense photo
- `reunixchange-release.jpg`: ReUniXchange release

LinkedIn note: posts and their images cannot be fetched automatically (LinkedIn
requires login and blocks automated access). To use a LinkedIn image, open the
post, save the image, drop it in this folder, and point the JSON `image` field at it.

Recommended: landscape JPG/PNG, ~1200×675 (16:9), optimized for web.

## Live LinkedIn post (embed): "live while static"

To show the *actual* LinkedIn post (image, text, reactions) live on the static
site, use LinkedIn's official embed instead of a saved image:

1. On LinkedIn, open the post → the ⋯ menu → **Embed this post**.
2. Copy the URL inside the iframe `src`, e.g.
   `https://www.linkedin.com/embed/feed/update/urn:li:share:7300000000000000000`
3. Add it to that item in `data/news.json` as `"embedUrl": "...that URL..."`.

When `embedUrl` is set, the News tab renders the live post in an iframe and skips
the static image for that item. (Automatically listing *all* your posts is not
possible on a static site; LinkedIn has no open API and blocks cross-origin
fetches, so embeds are added per post.)
