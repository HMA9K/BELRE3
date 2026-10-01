# Takenlijst BELRE3

Werkafspraak: werk per taak op een aparte branch en voeg samen via GitHub. Volg `AGENTS.md` voor privacy en publicatie.

## Prioriteit 1

- [x] Cloudflare-accountinstellingen controleren en het meetadres bijwerken in alle omgevingen (BELRE3, CAFA2, SRA) en in de meetservice. Afgerond op 1 oktober 2026: het anonieme Pages-adres werkt, de oude openbare Worker-route staat uit en privacy is gecontroleerd.

## Daarna

- [x] Logo consequent als `BELRE3` in hoofdletters weergeven in plaats van `Belre3`. Acht desktop- en mobiele controles van leerstof-, oefen- en tentamennavigatie geslaagd; lettertype Arial.
- [x] Live versie en GitHub gelijktrekken: de productiebuild volgt `main`; 96 code- en inhoudsbestanden gecontroleerd, inclusief de verklaarde toevoeging van de vastgezette privacy-installer.
- [x] Vaste deployroute kiezen: GitHub-pull request naar `main`, gevolgd door de automatische Cloudflare Pages-build. Zie `docs/publiceren.md`.
- [x] Code van de meetservice in een eigen private repo als back-up vastleggen, zonder meetgegevens of geheimen.
- [x] Afspraken tussen de assistenten vastleggen: één taak per branch en werkboom, actuele hoofdbranch opnieuw controleren, andere werkzaamheden behouden.

Controlebewijs en bronlinks: [beheercontrole van 1 oktober 2026](docs/beheer-20261001.md).

## Afzonderlijk vervolgwerk

- [ ] Bestaande uitlijningsafwijking van de assistent in de bredere browsercontrole onderzoeken. De afwijking van circa 13 pixels is ook op de ongewijzigde basiscommit vastgesteld; de bovenstaande beheertaken veranderen dit onderdeel niet.

## Vaste controle vóór elke publicatie

- [ ] Geen persoonsgegevens, e-mailadressen, lokale paden of gebruikersnamen in bestanden, bestandsnamen of commits.
- [ ] Commits alleen onder het projectpseudoniem met GitHub-noreplyadres.
