# Casusgegevens per vraag

De oefenomgeving toont een beoordeelde selectie van casuspassages bij de actieve vraag. De selectie is vastgelegd in `content-authoring/question-case-scope.json`: 58 vragen krijgen een kortere casus en 83 zelfstandige theorievragen hebben geen afzonderlijke casusgegevens nodig. De selecties bestrijken alle 16 tentamens.

Bij de stichtingvraag in het tentamen van 8 juni 2026 blijven bijvoorbeeld de activiteiten, kosten, het overschot en eerdere resultaten van Stichting Clothing zichtbaar. De afzonderlijke winst- en verliescasus van Duurzaam BV wordt bij deze vraag weggelaten.

De volledige oorspronkelijke casus en volledige brongetrouwe opmaak blijven in de vragenbank beschikbaar. De bestaande tentamen-PDF geeft toegang tot de oorspronkelijke opgave. Vragen, antwoordmodellen, bedragen en opgeslagen antwoorden worden niet gewijzigd.

Elke selectie is gebonden aan de hash van de oorspronkelijke casus. Geselecteerde passages moeten letterlijk, in dezelfde volgorde, in de bron staan. Een gewijzigde bron, onbekend blok of afwijkende passage blokkeert het opnieuw opbouwen. Expliciet gekoppelde eerdere deelvragen blijven bij de geselecteerde feiten staan.

Opgeslagen pogingen krijgen de huidige selectie alleen als hun oorspronkelijke casustekst overeenkomt. Dit werkt eveneens bij gemengde onderwerp- en collegereeksen via het broncasus-ID. Als verschillende vragen dezelfde brontekst hebben maar verschillende selecties vereisen, wordt voor een onbekend ID geen selectie geraden.

Controle: 125 Node-tests, 10 Python-tests voor casuspresentatie en selectie, een schone sitebuild en browsercontrole van alle 336 casusweergaven bij 1440 en 393 pixels. Opgeslagen tentamen- en gemengde pogingen behouden hun oorspronkelijke inhoud en antwoorden.

Bron: [BELRE3-tentamenbank en bronverwijzingen](https://github.com/HMA9K/BELRE3/blob/main/oefenen/content/exams.json).
