# Plant Atlas

A green, map-first static website for exploring where plants are native, introduced, and invasive.

## Web-ready build

This version is **static-site ready**. It has no server requirement and no API UI. The browser loads the catalog from `data/plants.json` and the world geometry from `data/world.geojson`.

The interface takes inspiration from established biodiversity/reference products such as iNaturalist’s map-first Explore workflow and Kew Plants of the World Online’s search-first plant reference.

## Run locally

Use any static web server. For example, with Python 3:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Do **not** use `file:///.../index.html` for final testing; serving the folder over HTTP is more representative of the deployed site.

## Deploy for free

### Cloudflare Pages — recommended

1. Create a GitHub repository and upload the contents of this folder.
2. In Cloudflare Dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository.
4. Choose the framework preset **None** (or leave it unconfigured).
5. Set the build command to `exit 0`.
6. Set the build output directory to `/` (the repository root).
7. Deploy.

Cloudflare Pages assigns a free `*.pages.dev` project subdomain.

### GitHub Pages

1. Create a public GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.

Your free address will be either `https://USERNAME.github.io/REPOSITORY/` for a project site or `https://USERNAME.github.io/` for a user site.

### Vercel

Import the GitHub repository into Vercel and deploy it as a static project. Vercel provides a free `*.vercel.app` address on the Hobby plan.

## Adding a species

Edit `data/plants.json` and add another object to the array:

```json
{
  "id": "my-plant",
  "common": "My plant",
  "scientific": "Genus species",
  "family": "Family",
  "status": "native",
  "note": "Short description.",
  "ranges": {
    "native": ["USA", "CAN"],
    "introduced": [],
    "invasive": []
  },
  "observationCenter": [41.6, -93.6],
  "sources": ["https://example.org/source"]
}
```

The `ranges` arrays use ISO 3166-1 alpha-3-style country codes matching `data/world.geojson`. The website reads them automatically.

## Important data note

The included country ranges are demonstration data. Do not publish them as authoritative plant distributions. For a production database, replace the demo country lists with source-backed geographic polygons and retain citations/evidence for each mapped status.

## Country codes

The world basemap currently contains 177 features and uses the codes listed in `COUNTRY_CODES.md`. Most are ISO 3166-1 alpha-3 codes; three special map identifiers are documented there.

