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

## Eenvoudige techniek met volledig leerresultaat (Ponytail)

- Begrijp eerst de opdracht, de bestaande code en de volledige route van invoer tot zichtbaar resultaat. Zoek alle aanroepplaatsen van code die je wijzigt.
- Kies daarna de eerste passende oplossing: geen nieuwe functie als die niet nodig is; hergebruik bestaande code of patronen; gebruik de standaardbibliotheek; gebruik een ingebouwde platformfunctie; gebruik een al aanwezige afhankelijkheid; schrijf pas daarna de kleinste leesbare nieuwe oplossing. Eén regel is alleen beter als die ook helder en correct is.
- Voeg geen ongevraagde abstracties, vermijdbare afhankelijkheden of overbodige standaardcode toe. Kies bij gelijke omvang de oplossing die ook randgevallen correct behandelt.
- Herstel fouten bij de oorzaak, bij voorkeur op de gedeelde plek. Een kleine wijziging op de verkeerde plek is geen verbetering.
- Blijf zorgvuldig met invoercontrole op vertrouwensgrenzen, foutafhandeling die gegevensverlies voorkomt, beveiliging, toegankelijkheid en expliciete projecteisen. Noteer een bewuste vereenvoudiging met een echte grens als `ponytail:`-commentaar met die grens en een uitbreidingsroute.
- Laat bij niet-triviale logica één kleine uitvoerbare controle achter die bij regressie faalt. Voor een triviale wijziging is geen extra test nodig. Blijf strengere projectgebonden test- en publicatieafspraken volgen.
- Behoud de volledigheid en juistheid van leerstof, uitleg, oefenvragen en bronverwijzingen, plus toegankelijkheid en mobiele werking. Eenvoudiger code rechtvaardigt geen inhoudelijke inkorting. Bestaande projectafspraken, privacyregels en lopende wijzigingen blijven gelden.

Bron: https://github.com/DietrichGebert/ponytail/blob/main/AGENTS.md
