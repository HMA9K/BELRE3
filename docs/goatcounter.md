# GoatCounter: herkenbare pagina's en oefenactiviteit

Iedere weergegeven pagina krijgt bovenaan een naam. Diezelfde naam is de browserpaginatitel en het meetpad in GoatCounter. Bijvoorbeeld `CAFA2 / Tentamens / Tentamen 24-09-2025 / Opgave 1 / Vraag 1`. Onderwerpen, lessen, vragen, resultaten, samenvattingen en specifieke tentamens worden onderscheiden. Tijdstempels en persoonlijke pogingcodes komen niet in de meetnaam.

`js/page-names.js` volgt de gerenderde route. De oorspronkelijke `page-analytics.js` is vervangen als actieve adapter. `no_onload` voorkomt dubbele automatische metingen. Voorviews en lokale bestanden tellen niet mee. De losse leesversies hebben dezelfde naamgeving.

| Gebeurtenis | Betekenis |
| --- | --- |
| Onderdeel geopend / Vraag geopend | Bereik van het onderdeel of de vraag, met GoatCounters sessieontdubbeling |
| Oefenreeks gestart / Tentamen gestart | Een expliciete start via de leeromgeving |
| Vraag beantwoord / Vraag geoefend | Een geldig antwoord is gecontroleerd of het tentamen is ingeleverd |
| Antwoord nagekeken | Het antwoord is beoordeeld, ook bij direct nakijken |
| Uitwerking bekeken | Een antwoordmodel of uitgeklapt antwoord is geopend |
| Oefenreeks afgerond / Tentamen afgerond | De expliciete afsluitactie is uitgevoerd |

Oefenvolume wordt geteld met `event: true` en `no_session: true`, zodat verschillende echte pogingen op dezelfde dag blijven meetellen. Alleen typen, een antwoord kiezen zonder controle en het herstellen van bewaarde antwoorden tellen niet als oefenen. Een lokaal antwoordvingerafdrukregister voorkomt dubbel tellen bij opnieuw laden of opnieuw controleren van hetzelfde bewaarde antwoord. Antwoordtekst, scores, persoonsnamen en lokale pogingcodes worden niet naar GoatCounter verstuurd.

BELRE3 heeft leesbare opgaven met uitklapbare antwoorden, zonder antwoordinvoer of tentameninlevering. Daarom registreert deze omgeving opgave/vraag geopend en uitwerking bekeken; zij verzint geen ingediende antwoorden of afgeronde tentamens.

## Dashboard lezen

Gebruik `is:pageview` voor bereik. Gebruik `Vraag geoefend` voor oefenvolume, `Uitwerking bekeken` voor bekeken oplossingen en een tentamendatum zoals `Tentamen 24-09-2025` om alle activiteit van die toets te vinden. Tel de afzonderlijke gebeurtenissen niet op als personen: één gecontroleerd antwoord heeft meerdere stappen. Oude technische meetpaden blijven historische rijen; nieuwe gegevens staan onder de leesbare namen.

## Eigen browser uitsluiten

Open eenmalig de link van de betreffende omgeving en controleer de melding **DISABLED**:

- [CAFA2](https://cafa2.pages.dev/#toggle-goatcounter)
- [SRA](https://sra-2xt.pages.dev/#toggle-goatcounter)
- [BELRE3](https://belre3.pages.dev/#toggle-goatcounter)

Dit geldt per browser, apparaat en website. Dezelfde link schakelt de telling bij een volgend bezoek weer in. Wissen van websiteopslag verwijdert de instelling. Alle metingen blijven GoatCounters oorspronkelijke `filter()` respecteren, inclusief `skipgc`.

Het alternatief **Instellingen > Tracking > Negeer IPs** sluit ook andere bezoekers op hetzelfde openbare IP-adres uit. Gebruik dit alleen als dat gewenste gedrag is. Een wisselend IP-adres vereist onderhoud.

Bronnen: [JavaScript-API](https://www.goatcounter.com/help/js), [gebeurtenissen](https://www.goatcounter.com/help/events), [sessies](https://www.goatcounter.com/help/sessions), [eigen bezoeken uitsluiten](https://www.goatcounter.com/help/skip-dev).
