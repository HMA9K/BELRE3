# Controle van de leerstofindeling

De leerstof is onderzocht vanaf openbare commit `27f6cb0`. De publicatie is voorbereid op de actuele hoofdbranch, met behoud van de tussentijdse aanpassingen aan beslisbomen en oefenonderdelen. De controle omvat alle 107 leerstofonderdelen en 20 afrondingen uit de zes collegegroepen. Het ontwerp is voorbereid in een eigen werkboom.

| Bevinding | Aanpassing |
| --- | --- |
| 35 onderdelen zetten kerntekst, voorwaarden en uitzonderingen na de eerste alinea onder Verdere uitleg. | Alle hoofdtekst en noodzakelijke kaders staan direct zichtbaar. |
| Voorbeelden hebben een fasekop, een label en een inhoudelijke kop. | Eén inhoudelijke kop per voorbeeld, naast de bijbehorende uitleg. |
| Onderbouwen en de afzonderlijke artikelkaarten herhalen het doel van de grondslag. | Eén onderdeel met onderbouwing en relevante wetsartikelen. |
| Drie brontitels hebben een eigen nummer bovenop de automatisch gegenereerde nummering. | Alleen de nummering van hoofdparagrafen wordt weergegeven. |
| De bestaande toonindeling plaatst enkele kernregels in voorbeeld- of waarschuwingsblokken. | 20 van deze alinea’s worden expliciet als hoofdtekst getoond. Acht voorbeeldalinea’s op zelfstandige rekenpagina’s blijven eveneens hoofdtekst. |
| Aanvullende schema’s staan in losse uitklappers met een herhaalde titel. | Open schema’s met één titel; twee naast elkaar waar de inhoudsbreedte dit toelaat. |
| De grondslagverwijzing bij een uitgewerkte vraag gebruikt een losse ankerroute; op de afronding bestaat de bedoelde kop niet. | De knop opent de juiste leerstofparagraaf en springt vervolgens naar haar grondslag. |
| De navigatiekolom herhaalt de leesfasen, tussenkoppen en afrondingsdetails. | Binnen het geopende onderwerp staan alleen de genummerde leerstofonderdelen met hun titel en de afronding. Het geselecteerde onderdeel blijft gemarkeerd tijdens het lezen. |

De 547 bronalinea’s leveren 349 hoofdparagrafen en 198 bijbehorende kaders op. De vaste bron-IDs en directe routes blijven gelijk. Op brede schermen staan korte kaders rechts; op mobiel direct onder hun hoofdparagraaf. Tabellen en lange uitwerkingen gebruiken de volle breedte.

## Controlebewijs

- `npm test`: 117 tests geslaagd.
- Schone `npm run build:site`: geslaagd in een afzonderlijke uitvoermap.
- `tests/reading-layout-browser.cjs`: alle 127 routes gecontroleerd op 1440, 900 en 393 pixels.
- Alle 547 alinea’s, tabellen en opsommingen vergeleken met de broninhoud; geen gewijzigde of ontbrekende tekst vastgesteld.
- Alle 49 schema’s en 145 selecties gecontroleerd op desktop en mobiel; bijbehorende uitleg en selectiestatus behouden.
- Geen horizontale pagina-overloop of browserfouten vastgesteld. Oefenantwoorden blijven gesloten tot de gebruiker ze opent.
- Navigatie naar een leeronderdeel, artikelvenster, mobiele navigatiesluiting en herladen gecontroleerd.
- De grondslagknop vanuit de individuele oefenvraag en vanuit de afronding gecontroleerd: de juiste paragraaf blijft of wordt geopend.
- De bestaande navigatiecontrole bevestigt vorige/volgende, browser-terug, zoeken en alle 32 directe beslisboomroutes. De schemacontrole bevestigt ook de bereikbaarheid van de echte klikvlakken en behoud van Arial.
- De aanvullende samenvattingscontrole bevestigt alle 20 afrondingen op drie schermbreedtes, de ongewijzigde oefenvragen en uitwerkingen, en per college toetsenbordbediening van de wetsartikelen met bereikbare bron-PDF.
- De faseknoppen staan gecentreerd en gelijkmatig verspreid; op mobiel lopen zij over meerdere gecentreerde regels.
- Wetsartikelverwijzingen zijn groen en vetgedrukt. De artikelstijlcontrole omvat alle 127 leesroutes, 32 directe beslisbomen en 145 schemaselecties op desktop en mobiel. Het laagste gemeten tekstcontrast is 6,71:1; donkere tabelkoppen gebruiken lichtgroene verwijzingen. Onderstreping, toetsenbordfocus en het artikelvenster blijven beschikbaar.

De browsercontrole schrijft het volledige overzicht per pagina en vier schermafbeeldingen naar de instelbare lokale controlemap. De controlemap bevat alleen projectinhoud; zij valt buiten de sitebuild.

Bronnen: [bestaande leerstofgegevens](https://github.com/HMA9K/BELRE3/blob/27f6cb0/js/summary-data.mjs), [alineametadata](https://github.com/HMA9K/BELRE3/blob/27f6cb0/content-authoring/summary/reading-guide.json), [presentatiecode](https://github.com/HMA9K/BELRE3/blob/27f6cb0/js/summary-presentation.mjs) en [publicatieafspraken](https://github.com/HMA9K/BELRE3/blob/27f6cb0/docs/publiceren.md).
