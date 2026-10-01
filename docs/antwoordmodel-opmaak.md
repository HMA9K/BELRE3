# Weergave van antwoordmodellen

Alle 336 vrijgegeven open modellen hebben een presentatieplan in `content-authoring/model-presentation.json`. De ongewijzigde bron blijft in `solutionHtml`; de afzonderlijke weergave staat in `solutionPresentationHtml`. Vrijgave, voorwaarden, bronverwijzingen, puntentotalen, opgeslagen antwoorden en beoordelingen blijven behouden.

De gekozen weergave sluit aan bij het antwoord: journaalposten per maatschappij met debet en credit, balansen per maatschappij met afzonderlijke zijden, berekeningen en vermogensvergelijkingen in tabellen, voorwaarden en redeneringen als leesbare stappen, en korte kernantwoorden met een toelichting in alinea's. In totaal zijn 119 tabellen toegevoegd. Het antwoord op de structuurvraag heeft daarnaast een aandelenstructuur zonder verzonnen percentages.

`python tools/model_presentation.py` vernieuwt de presentatie vanuit de bestaande bank. De normale inhoudsimport past dezelfde weergave toe na de inhoudelijke modelreview. Een gewijzigd bronmodel vereist een bijgewerkt presentatieplan; de controle stopt bij een afwijkende bronhash of verloren woorden en getallen.

De centrale renderer gebruikt de presentatie ook voor bestaande pogingen wanneer de opgeslagen modeltekst overeenkomt met dezelfde bronvraag. Een afwijkend oud model wordt niet vervangen door een ander model. De weergave geldt in het nakijkvenster, de resultaten en oefenreeksen met vragen uit meerdere tentamens.

Normeringen staan rood. De herkenning ondersteunt onder meer `1p`, `2 punten`, `1 g/f`, `1 punt g/f`, breuken en losse scores in puntenkolommen of bij berekeningen. Genummerde voorwaarden en wetsleden blijven gewone tekst. Het maximum uit de bronvraag staat afzonderlijk boven het model. Ontbrekende deelpuntverdelingen worden niet aangevuld met verzonnen scores.

Controle: volledige broninhoud en getallen vergelijken voor alle 336 modellen, vaste debet- en creditkolommen controleren, volledige browsercontrole van alle modellen op inhoudsbehoud en overloop, en de echte nakijkweergave op desktop en mobiel bekijken. Controlebestanden blijven lokaal in `output/model-presentation-review/`.
