# Verwerking van de 49 modelreviews

De aangeleverde review van 30 september 2026 sluit exact aan op de 49 eerder geblokkeerde open tentamenvragen. Het JSON-bestand is de importbron; het bijbehorende overzicht is de leesversie van dezelfde beoordeling. Er zijn geen nieuwe MC-vragen toegevoegd.

| Controle | Uitkomst |
| --- | --- |
| Unieke, verwachte vraag-IDs | 49 van 49 |
| Oordeel in de aangeleverde review | 44 definitief, 5 onder expliciete oefenaannames |
| Rekenkundige controles | 141 geslaagd |
| Bronverwijzingen | 333 verwijzingen naar bestaande bron-IDs en geldige fysieke PDF-pagina's |
| Modelbank na verwerking | 336 modellen voor handmatige vergelijking, waarvan 5 met aannames |
| Overige inhoud | 287 bestaande modellen, 594 MC-vragen, 55 bron-PDFs, casussen, punten en vraagvolgorde behouden |

## Modellen met expliciete aannames

| Vraag-ID | Aanvullend oefenuitgangspunt |
| --- | --- |
| `belre3-20200618-s3-q7` | De Italiaanse renteheffing voldoet aan art. 10a lid 3 onderdeel b Wet Vpb 1969; de inspecteursuitzondering aan het slot van dat onderdeel wordt in deze oefenvariant niet toegepast. Het model noemt ook de andere uitkomst wanneer die uitzondering wel geldt. |
| `belre3-20220613-s7-q19` | Brazilië wordt voor deze oefening niet behandeld als een aangewezen associatiestaat in de zin van art. 13d lid 2 onderdeel a onder 2° Wet Vpb 1969. |
| `belre3-20241024-s4-q17` | Dezelfde expliciete aanname over Brazilië. |
| `belre3-20250611-s4-q17` | Het kwalificerende belang bestaat onafgebroken gedurende ten minste vijf jaar, zoals bedoeld in art. 13d lid 2 onderdeel b Wet Vpb 1969. De opgave zegt alleen 'sinds jaren'. |
| `belre3-20250611-s4-q18` | Marokko wordt voor deze oefening niet behandeld als een aangewezen associatiestaat in de zin van art. 13d lid 2 onderdeel a onder 2° Wet Vpb 1969. |

Deze aannames staan bij de vraag en boven het bijbehorende oefenmodel. Ze worden niet aan de historische PDF of oorspronkelijke vraagtekst toegevoegd. De ontbrekende gegevens blijven als metadata bewaard. Buitenlandse tarieven uit de opgaven blijven rekengegevens van die casussen en zijn geen geverifieerde tarieven voor 2026.

## Onderbouwing en begrenzing

De inhoudelijke indeling komt uit de aangeleverde review. De verwerking controleert daarnaast de exacte koppeling met de bronvragen, alle rekenexpressies en bronpaginabereiken. De afwijkende renteaftrekroutes zijn vergeleken met de aangeleverde art. 10a-tekst. De balansconventie bij de bedrijfsfusie is vergeleken met de oorspronkelijke uitwerking van 11 juni 2025 en de VJ26-uitwerkingen van college 5, inclusief visuele controle van de tabellen. Er zijn geen externe fiscale bronnen toegevoegd.

De antwoorden volgen de afbakening van de onderwijsopgaven. Niet ieder niet-genoemd praktijkgegeven wordt als nieuwe casusvoorwaarde toegevoegd. Waar de review een beslissende aanname benoemt, blijft die zichtbaar. Geldige paginanummers en kloppende rekenexpressies bewijzen op zichzelf niet de juistheid van iedere fiscale conclusie.

## Reproduceerbare verwerking

`content-authoring/exam-model-review.json` bewaart het aangeleverde JSON-bestand. De afzonderlijke vrijgavelijst legt zowel de oorspronkelijke bestandshash als controlehashes van de JSON-inhoud en de oorspronkelijke tentamenbank vast. De inhoudelijke hash is onafhankelijk van Windows- of Unix-regeleinden. De bronaanlevering blijft ongewijzigd.

De import weigert dubbele of onbekende vraag-IDs, onverwachte wijzigingen in de basisbank, foutieve berekeningen, onjuiste bronpaginanummers, ontbrekende aannames bij een voorwaardelijk model en vrijgave van een onopgelost model. Alle controles gaan vooraf aan het schrijven van runtimebestanden. Open antwoorden worden nooit automatisch gescoord.

Nieuwe pogingen gebruiken de nieuwe modellen. Reeds opgeslagen pogingen bewaren hun eigen exemplaar van het tentamen en worden niet stilzwijgend aangepast; eigen antwoorden, scores en de oorspronkelijke modellen blijven daarin behouden.

Bronnen: [aangeleverde review](../content-authoring/exam-model-review.json), [vastgelegde vrijgave](../content-authoring/exam-model-review-release.json), [bronregister met de oorspronkelijke PDFs](../oefenen/content/sources.json) en [BELRE3-repository](https://github.com/HMA9K/BELRE3).
