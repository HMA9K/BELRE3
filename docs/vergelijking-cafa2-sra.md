# BELRE3: vergelijking met CAFA2 en SRA

Onderzocht op 30 september 2026. Dit overzicht onderscheidt aanwezige functies, herstelde bediening en mogelijke uitbreidingen. De uitbreidingen hieronder zijn voorstellen, geen toezegging dat ze al zijn ingebouwd.

De vergelijking gebruikt de openbare hoofdbranches: CAFA2 `93d3a4de49fe0f53c72cc44847723cd7abde45cb`, SRA `1dac1710571bb92d30e402cf20480a240bc61414` en BELRE3 vanaf `9bd4d7740b7f8d3752396918a6d0e4972793c93d`, inclusief de hier beschreven UI-correcties. Lokale, niet-gepubliceerde wijzigingen in de referentieprojecten zijn niet als norm gebruikt.

## Herstelde bediening

| Onderdeel | BELRE3 na de correctie |
| --- | --- |
| Kop en navigatie | Cirrus-woordmerk met oranje vinkje; Home en het logo openen de oorspronkelijke BELRE3-hoofdpagina. |
| MC-scherm | Dezelfde basisindeling als CAFA2: casus links met instelbare breedte, vraag en compacte antwoordopties rechts, navigatie onderaan. |
| Vraagoverzicht | Cirrus-dialoog met resterende vragen, antwoordstatus, markeringen en pagina's voor lange reeksen. |
| PDF-bediening | Knoppen bij de vraagnavigatie; tentamen links, bronuitwerking rechts in een instelbaar paneel. Het antwoord blijft beschikbaar. Downloadlinks in het dashboard. |
| Eigen telling | De bestaande drie meetstanden zijn aangesloten op de nieuwe oefenomgeving: normaal, apart als eigen bezoek, of uitgesloten. De keuze geldt voor dezelfde browser en hetzelfde domein. |
| MC-indeling | Zes collegegroepen met de bestaande 19 onderwerpen, gefilterd op vraagtype en niveau. |

De collegegroepen volgen de bronbundels en de bestaande `topicOrder`: 1 en 2, 3, 4 en 5, 6 en 7, 8 en 9. Een indeling in negen losse colleges zou aanvullende inhoudelijke toewijzing vereisen. Een collegeknop oefent alle onderwerpen van die groep met het gekozen vraagtype en niveau; de selectieknop volgt ook het onderwerpfilter.

## Aanwezig en behouden

BELRE3 had al drie MC-vraagtypen, drie moeilijkheidsniveaus, uitleg per antwoordoptie, uitwerkingsstappen, herkenning, valkuilen, bronnen en wetsverwijzingen. Pogingen, eerste MC-scores en markeringen worden lokaal bewaard. Nieuwe reeksen bevatten 594 actieve vragen; eerdere pogingen blijven beschikbaar.

De volledige tentamens hebben al een klok, extra tijd, oefenen zonder tijdslimiet, pauzeren, hervatten, een teksteditor met tabellen, een casuspaneel, een zwevende casus, markeringen, een vraagoverzicht en zelfbeoordeling. Ook de rekenmachine en PDF-arceringen zijn aanwezig. Deze functies ontbreken dus niet in hun geheel.

De oorspronkelijke BELRE3-leeromgeving blijft bestaan. De inhoud van de vragenbank, 55 bron-PDF's en modelvrijgave is niet gewijzigd. De 49 uitwerkingen die nog op inhoudelijke controle wachten, blijven afgeschermd voor beoordeling.

## Uitbreidingen om te kiezen

| Nr. | Wat ontbreekt of beperkt is | CAFA2 | SRA | Mogelijke toepassing in BELRE3 |
| --- | --- | --- | --- | --- |
| 1 | Keuze tussen MC-oefenmodus en toetsmodus | Aanwezig; toetsmodus stelt feedback uit tot afronden. | De onderzochte MC-reeks werkt met oefenen en nakijken. | Expliciete keuze vooraf; bestaande eerste scores behouden. |
| 2 | Direct nakijken en feedback bij de gekozen optie | Aanwezig. | Aanwezig. | Optionele schakelaar; standaard blijft de knop Nakijken beschikbaar. |
| 3 | Zelf uitwerken naast de MC-opties | Aanwezig, met eigen antwoord en afzonderlijke zelfbeoordeling. | Wel een editor bij open tentamens, geen equivalente eigen-antwoordmodus in de onderzochte MC-reeks. | Eerst zelf rekenen of motiveren; daarna MC-keuze of vergelijking met de uitwerking. |
| 4 | Gedeelde voortgang tussen hoorcollege en onderwerp | Gedeelde vragen en voortgang. | Gedeelde vragen en voortgang. | Eén leerstatus per vraag, met afzonderlijke pogingen als historie. Nu begint een nieuwe reeks met eigen antwoorden. |
| 5 | Uitgebreide MC-resultaten | Per deel/onderwerp en per vraag. | Eerste en laatste antwoord, resultaten per deel/onderwerp en vraag. | Resultaten per college en onderwerp, met directe links naar fouten en markeringen. Nu toont BELRE3 hoofdzakelijk een pogingentabel. Een aparte herhaalreeks voor fouten is een aanvullende ontwerpkeuze. |
| 6 | MC-back-up terugzetten | Import en export. | Import en export. | Een gecontroleerde import met voorbeeld en bevestiging. BELRE3 kan al downloaden, maar nog niet via de interface terugzetten. Dit is geen automatische synchronisatie tussen apparaten. |
| 7 | Licht/donker/automatisch en schalen van de hele oefenomgeving | Aanwezig. | Aanwezig. | Een gezamenlijke instelling voor de nieuwe oefenschermen. De oorspronkelijke BELRE3-homepage heeft al een eigen licht/donkerbediening; de oefenomgeving heeft nu alleen lettergrootteknoppen. |
| 8 | Hulp vóór het beantwoorden en directe verbinding met de leerstof | Theorie, herkenningshulp, leerkoppelingen en wetsweergave. | Basisregels, leskoppelingen en formulehulp. | Brongebonden fiscale basisregels en links naar de juiste samenvatting en wetsartikelen. BELRE3 toont uitleg en wetsverwijzingen nu vooral na nakijken. |
| 9 | Tentamenfrequentie bij MC-onderwerpen | Aanwezig. | Aanwezig, met uitgelegde telwijze. | Per onderwerp vermelden in hoeveel unieke BELRE3-tentamens het voorkomt. Vereist een controleerbare bronmapping; het aantal MC-varianten is geen tentamenfrequentie. |
| 10 | Open vragen over meerdere tentamens per onderwerp oefenen | Opgaveoefening met selectie van tentamens. | Tentamenanalyse en inhoudelijke leerkoppelingen; geen identieke CAFA2-opgavemodule aangetroffen. | Selecteren op fiscaal onderwerp of college. De bestaande open tentamens blijven daarnaast integraal oefenbaar. |
| 11 | Studieassistent bij de vraag | Aanwezig. | Geen overeenkomstige assistentmodule aangetroffen in de onderzochte hoofdbranch. | Afzonderlijke uitbreiding met BELRE3-bronnen en eigen afspraken over gebruik. De overgenomen PDF-paneelindeling voegt geen assistent toe. |

## Voorgestelde volgorde

1. Dagelijks oefenen: 2, 4, 5, 6 en 7. Deze verbeteren nakijken, hervatten, inzicht, bewaren en leesbaarheid.
2. Toetsvoorbereiding: 1 en 3. Dit verandert de oefenwijze en verdient een bewuste keuze.
3. Inhoudelijke verbindingen: 8, 9 en 10. Eerst de bronmapping controleren, daarna de bediening toevoegen.
4. Assistent: 11 afzonderlijk besluiten en uitwerken.

## Bronnen

- [CAFA2: MC-status, oefenmodus, eigen antwoorden en import/export](https://github.com/HMA9K/CAFA2/blob/93d3a4de49fe0f53c72cc44847723cd7abde45cb/js/app.js).
- [CAFA2: feedback en direct nakijken](https://github.com/HMA9K/CAFA2/blob/93d3a4de49fe0f53c72cc44847723cd7abde45cb/js/answer-feedback.js).
- [CAFA2: PDF-bediening](https://github.com/HMA9K/CAFA2/blob/93d3a4de49fe0f53c72cc44847723cd7abde45cb/js/exam-original-pdfs.mjs).
- [CAFA2: opgaveoefening](https://github.com/HMA9K/CAFA2/blob/93d3a4de49fe0f53c72cc44847723cd7abde45cb/js/opgave-practice.js).
- [SRA: MC-indeling, resultaten, hulp en back-up](https://github.com/HMA9K/SRA/blob/1dac1710571bb92d30e402cf20480a240bc61414/js/mc.js).
- [SRA: gedeelde MC-status](https://github.com/HMA9K/SRA/blob/1dac1710571bb92d30e402cf20480a240bc61414/js/mc-state.js).
- [BELRE3: MC-bronindeling](https://github.com/HMA9K/BELRE3/blob/9bd4d7740b7f8d3752396918a6d0e4972793c93d/oefenen/content/mc.json).
