# Plant Atlas

An interactive, map-first web application designed to visualize where plant species are **native**, **introduced**, or **invasive**, alongside real-world observation records.

**Live Demo:** [plant-atlas.plantatlas.workers.dev](https://plant-atlas.plantatlas.workers.dev)

---

## Overview

Understanding plant geography is crucial for ecology, conservation, and invasive species management. **Plant Atlas** answers a simple question: *Where does a plant belong, where has it spread, and what evidence supports those labels?*

The map provides country-level range data and point occurrences, allowing users to separate a species' natural habitat from regions where it was human-introduced or established as invasive.

---

## Features

* **Instant Search:** Search through a catalog of species by common or scientific name.
* **Multi-Layer Map Controls:** Toggle individual map layers on or off:
  * **Native Range:** Historic and natural geographic distribution.
  * **Introduced Range:** Areas where the species was naturalized by human activity.
  * **Invasive Range:** Regions where the species is actively designated as invasive.
  * **Occurrence Records:** Precise observation points and specimen records.
* **Quick Examples:** Try preset plant profiles like *Orange Daylily*, *Garlic Mustard*, *Kudzu*, and *Common Milkweed*.
* **Responsive Design:** Built-in mobile support with a clean, dark-themed control panel and full-screen map experience.

---

## Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Mapping Library:** [Leaflet.js](https://leafletjs.com/)
* **Hosting & Edge Deployment:** [Cloudflare Workers](https://workers.cloudflare.com/)
* **Version Control & CI/CD:** GitHub Actions

---

## Data Sources & Methodology

Plant Atlas references data structures from authoritative biodiversity platforms:

* **Taxonomy & Native Ranges:** Inspired by Kew *Plants of the World Online* (POWO) / *World Checklist of Vascular Plants* (WCVP).
* **Occurrence Records:** Integrated with global biodiversity repositories like [GBIF](https://www.gbif.org/) and [iNaturalist](https://www.inaturalist.org/).
* **Invasive Status:** Reference data aligned with the *Global Register of Introduced and Invasive Species* (GRIIS) and CABI Compendium.
