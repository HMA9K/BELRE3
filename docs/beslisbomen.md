# Beslisbomen bij de leeruitleg

Bij 17 juridische onderwerpen in college 1 tot en met 8 staan 25 visuele beslisbomen met 184 knopen. Iedere boom beschrijft toegang, vervolgstappen, uitzonderingen en een gemotiveerde conclusie. De oorspronkelijke 107 uitlegonderdelen, voorbeelden, antwoordroutes en figuren blijven daarnaast beschikbaar.

## Gebruik

- Volg in de samenvatting de passende tak met **Ja**, **Nee** of **Verder**.
- Klik op een eerder gekozen stap om de keuze bij die stap opnieuw te maken. Alle keuzes daarna vervallen; eerdere keuzes blijven staan. De knop in de kop werkt ook met Enter en spatie. Artikelverwijzingen blijven de wettekst openen.
- **Stap terug** wijzigt de laatst gekozen stap; **Opnieuw** begint bij de eerste stap.
- **Hele beslisboom bekijken** toont de vertakkingen tegelijk, met verbindingslijnen en gelabelde takken.
- Neutrale kaarten bevatten voorwaarden en vervolgstappen; gele kaarten bevatten uitzonderingen; conclusies vermelden hun fiscale gevolg. Rood hoort bij de afzonderlijke tentamenoefening. De tekst geeft de betekenis ook zonder kleur.
- De route gebruikt kleinere binnenmarges, kortere verbindingslijnen en minder ruimte tussen kaarten. De bestaande tekstgrootte blijft behouden.
- Artikelverwijzingen openen het bestaande compacte wetsvenster met de betreffende passage en kernarcering. Bronlinks tonen de gebruikte slides, wet of uitwerking.
- Bij renteaftrek verwijst een conclusie rechtstreeks naar de volgende beslisboom: fiscale kwalificatie, art. 10a, art. 10b en art. 15b. Een toets doorstaan beëindigt de aftrekbeoordeling dus niet voortijdig.
- De routekeuze is een leerhulp en verandert geen studie-, vraag- of tentamenvoortgang.

## Inhoud

| College | Artikelroutes |
| --- | --- |
| 1 en 2 | Stichting/vereniging; directe en indirecte overheidsonderneming; kosten/uitdeling/gift; carry forward na belangenwijziging; afzonderlijke carry-backtoets; innovatiebox |
| 3 | Fiscale kwalificatie lening; art. 10a en beide tegenbewijsroutes; art. 10b; earningsstripping |
| 4 en 5 | Deelnemingsvrijstelling of verrekening; afgewaardeerde vordering; liquidatieverlies; bedrijfsfusie; juridische fusie/splitsing |
| 6 en 7 | FE-toegang; voegen; ontvoegen; art. 15ai-sanctie; horizontale saldering en oude verliezen |
| 8 | Verrekenprijzen en corresponderende heffing; primaire hybride regel; secundaire ontvangerregel; CFC; buitenlandse objectvrijstelling of verrekening |

College 9 bevat hoofdzakelijk toezicht, procesbeheersing, strategie en ethische afwegingen. Die worden niet ten onrechte als wettelijke ja/nee-uitkomsten gepresenteerd.

## Bronnen en grenzen

De inhoud volgt de aangeleverde officiële collegeslides en de studiekopie Wet Vpb van **24 mei 2026**. De bronnen staan per boom in de leeromgeving en als relatieve PDF-verwijzingen in de gegenereerde gegevens. Bij CFC komt de juridische route uit de aangeleverde wet; er is geen fictieve collegeverwijzing toegevoegd.

De wettelijke leden en de voorwaarden zijn afzonderlijk nagelezen. Zo blijven de alternatieve toetsen van art. 13 lid 11 apart, bevat art. 10a lid 3 onderdeel b de inspecteursuitzondering, worden de carry-forward- en carry-backvoorwaarden van art. 20a niet vermengd en wordt de driejaarstermijn van art. 15ai lid 3 onderdeel b niet als algemene termijn gepresenteerd.

De volledige teksten van de Wet IB, verdragen en het Besluit FE ontbreken. Waar een route daarnaar verwijst, blijft de verwijzing gekoppeld aan de beschikbare college-uitleg en is dit zichtbaar vermeld. De beslisbomen claimen geen nieuwe controle van actuele landenlijsten of volledige dekking tegenover het ontbrekende leerboek.

## Onderhoud en controle

Wijzig de inhoud in `content-authoring/summary/decision-trees.json`. De samenvattingsbouw controleert alle bestemmingen, bereikbaarheid, cirkelvrije routes, bronnen en genoemde Vpb-artikelnummers en leden. De renderer gebruikt dezelfde inhoud voor de gekozen route en het volledige schema.

`tests/summary-decision.test.mjs` controleert bronverwijzingen en uitkomsten van de wezenlijke uitzonderingsroutes. Browsercontrole volgt daarnaast de gekozen takken, terugzetten, de vervolgbomen, wetsvensters en de weergave van de volledige bomen op desktop en telefoon.

De gekozen route toont één actieve vraag, vervolgstap of conclusie. Een keuze noemt vooraf het soort bestemming en de titel. Eerdere keuzes staan in een uitklapbaar overzicht; klikken op een eerdere keuze verwijdert die keuze en de latere stappen. Het volledige schema is afzonderlijk aangeduid als overzicht van alle mogelijke routes.

Op `#pagina/beslisbomen` staan alle 25 bomen met titel, bestaande korte toelichting en onderwerp, gegroepeerd per hoorcollege. De links openen rechtstreeks de gekozen boom bij zijn leeruitleg. Ook op een verkleinde pagina blijft de titel onder de leesbalk zichtbaar.

Controle op 1 oktober 2026: alle 25 volledige bomen zijn eerder in de browser op 1280 en 393 pixels nagekeken, zonder horizontale uitloop. De huidige routeweergave is daarnaast gecontroleerd met de lening- en overheidsroutes, eerdere keuzes, toetsenbordbediening, wetsvensters en directe links op desktop en telefoon. Automatische controles doorlopen alle routes en controleren de 25 overzichtskoppelingen. De algemene testset heeft 94 geslaagde controles, zonder fouten.
