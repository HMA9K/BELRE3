# Leesstructuur van de leerstof

De leerstof bestaat uit 107 afzonderlijke onderdelen en 20 afrondingen. Elk onderdeel heeft dezelfde volgorde: leerdoel, uitleg met bijbehorende voorbeelden en waarschuwingen, grondslag met relevante wetsartikelen, oefenvraag met een gesloten antwoord, en bronnen. Kerntekst, voorwaarden en schema’s staan direct zichtbaar. Alleen antwoorden en oorspronkelijke bronstukken hoeven te worden geopend.

## Hoofdtekst en leerkaders

De hoofdtekst leest door zonder een kader om iedere alinea. Korte voorbeelden staan in een blauw kader bij de uitleg waarop zij betrekking hebben. Gele kaders benoemen een waarschuwing of uitzondering; zij kunnen nodig zijn voor de juiste conclusie. Hun kleur betekent geen bijzaak.

Bij voldoende inhoudsbreedte staan deze kaders rechts van de bijbehorende hoofdtekst. Op smalle schermen volgen zij direct na hun hoofdparagraaf, vóór het volgende inhoudelijke onderdeel. Lange rekenvoorbeelden en voorbeelden met tabellen gebruiken de volle breedte. Een lange stapel kaders wordt verdeeld over een volgende rij, waar twee korte kaders naast elkaar kunnen staan. Inhoud wordt niet ingeklapt om de pagina korter te maken.

Opeenvolgende hoofdparagrafen lopen op brede schermen door naast een hoger leerkader. Zodra het kader eindigt, gebruikt de tekst weer de volle breedte. Tabellen en opsommingen beginnen in een nieuw onderdeel, zodat zij een kader niet overlappen. Op mobiel blijft de oorspronkelijke volgorde van hoofdtekst, bijbehorend kader en volgende hoofdparagraaf behouden. Lopende tekst wordt uitgevuld; de laatste regel blijft links uitgelijnd en Nederlandse woordafbreking beperkt grote woordafstanden.

De oorspronkelijke alineatekst, tabellen, opsommingen, nadruk en bronverwijzingen blijven behouden. `js/summary-layout.mjs` legt de expliciete relaties en uitzonderingen op de bestaande toonindeling vast. Een kernregel blijft hoofdtekst wanneer de eerdere metadata haar als voorbeeld of waarschuwing indeelde. Een onderdeel dat volledig uit uitgewerkte berekeningen bestaat, toont die berekeningen als hoofdtekst.

## Koppen en nummering

De nummering begint per collegegroep bij onderwerp 1. Subonderwerp 1.3 is het derde onderdeel daarvan; 1.3.2 is de tweede hoofdparagraaf binnen dat subonderwerp. Alleen hoofdparagrafen hebben een doorlopend nummer. Een leerkader heeft één inhoudelijke kop en een verwijzing naar zijn hoofdparagraaf. Bestaande nummerprefixen in brontitels verdwijnen alleen uit de weergave. De oorspronkelijke tekst en vaste bron-IDs worden behouden.

De faseletters A tot en met E en de losse fase Toepassen vervallen. Voorbeelden staan bij hun uitleg. Binnen het geopende onderwerp toont de navigatiekolom alleen de genummerde leerstofonderdelen met hun titel en de afronding van het onderwerp. Leesfasen, tussenkoppen en verdere details staan uitsluitend in de pagina. Het geselecteerde leerstofonderdeel blijft gemarkeerd wanneer de gebruiker door de uitleg, kaders, wetsartikelen of oefenvraag bladert. Knoppen in de pagina en in de inhoudsopgave gebruiken dezelfde leespositie onder de vaste balken.

## Wetsartikelen en schema’s

De onderbouwing en artikelkaarten vormen één onderdeel. De onderbouwing geeft het verband met de regel; een artikelkaart benoemt de functie van de concrete bepaling en opent de relevante wettekst. Het eerdere afzonderlijke onderdeel Welke bepaling gebruik je waarvoor? is daarin opgenomen. Onderdelen met uitsluitend een collegekader krijgen de passende grondslagtitel.

De uitgewerkte oefenvraag verwijst naar de grondslag van haar eigen leerstofparagraaf. Binnen een paragraaf springt de knop naar de juiste kop; vanuit de afronding opent zij eerst het juiste leerstofonderdeel. De verwijzing verandert de leerstofroute niet in een losse, ongeldige ankerroute.

Een schema heeft één titel. Meerdere schema’s staan naast elkaar wanneer de beschikbare inhoudsbreedte dat toelaat; op mobiel staan zij onder elkaar. Een derde schema gebruikt zo nodig de hele rij. De geselecteerde uitleg en alle methodeknoppen blijven beschikbaar. De oorspronkelijke collegeslides en de gebruikte PDF-pagina’s staan in de bronnenbundel onderaan.

## Routes en voortgang

Elke paragraaf behoudt haar bestaande directe route met `/paragraaf/` en haar bron-ID. De afronding behoudt `/afronding` en toont artikelroutes, de verzamelde oefenvragen, herhaling en studiemarkering. Vorige en Volgende doorlopen alle onderdelen, ook over collegegrenzen heen. De laatste afronding verwijst naar de voortgang. Navigeren markeert niets automatisch als bestudeerd.

Onderwerp- en collegelinks openen hun eerste onderdeel; de algemene leerstoflink hervat de geselecteerde leesstap. Zoekresultaten, onthoudblokken en beslisbomen houden hun eigen bestemmingen. Herladen en browser-terug herstellen de route. Op mobiel sluit de navigatie na een keuze.

Bronnen: [presentatiecode](https://github.com/HMA9K/BELRE3/blob/main/js/summary-presentation.mjs), [leerstofgegevens](https://github.com/HMA9K/BELRE3/blob/main/js/summary-data.mjs) en de daarin vermelde aangeleverde collegeslides, wetstekst en tentamens. Controleomvang en bewijs staan in `docs/leesstructuur-audit.md`.
