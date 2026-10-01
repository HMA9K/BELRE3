# Privacy en publicatie

- Anonimiseer persoonsgegevens voordat werk wordt vastgelegd, gedeeld of gepubliceerd.
- Publiceer geen echte gebruikersnamen, persoonlijke of zakelijke e-mailadressen, woon- of werkgeversgegevens, lokale gebruikersnamen of absolute gebruikerspaden.
- Gebruik relatieve paden en instelbare lokale bronmappen. Gebruik voor commits het bestaande projectpseudoniem met een GitHub-noreplyadres.
- Neem geen letterlijke persoonlijke prompts, volledige gesprekken of persoonlijke context op. Bewaar alleen noodzakelijke, geanonimiseerde projecteisen.
- Controleer bestanden, bestandsnamen, metadata, commit-auteurs en commitberichten voor publicatie. Voeg oude commits met persoonsgegevens nooit opnieuw samen met opgeschoonde geschiedenis.
- Houd originele bronstukken lokaal. Namen van onafhankelijke gepubliceerde bronnen worden niet automatisch gewijzigd.

# Samenwerken en publiceren

- Volg `docs/publiceren.md`: één taak per branch en eigen werkboom, vanaf de actuele openbare `main`.
- Controleer actieve werkbomen vóór wijzigingen. Behoud wijzigingen van andere taken en werk niet in hun werkboom.
- Voer `npm test`, een schone `npm run build:site` en de benodigde browsercontrole uit vóór samenvoegen.
- Publiceer via een GitHub-pull request naar `main` en de gekoppelde Cloudflare Pages-build. Controleer commit, build en live bestanden afzonderlijk.
- Controleer de actuele openbare branch en privacy opnieuw vlak vóór samenvoegen. Verwerk nieuwe wijzigingen eerst en herhaal de daardoor geraakte controles.
- Leg alleen geanonimiseerde projecteisen en noodzakelijk controlebewijs vast. Geparkeerde werkzaamheden worden pas hervat na een afzonderlijke opdracht.
