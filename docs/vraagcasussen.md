# Casusgegevens per vraag

De oefenomgeving toont de volledige feitelijke broncasus bij de actieve vraag. De eerdere inkortingen bij 58 vragen zijn verwijderd: gegevens over andere ondernemingen, leningen, transacties of jaren kunnen deel blijven uitmaken van dezelfde casus. Dat niet iedere passage nodig is voor de berekening van een deelvraag, vormt geen zelfstandige reden om die passage weg te laten. De 83 afzonderlijk beoordeelde zelfstandige theorievragen zonder benodigde casusgegevens blijven vastgelegd in `content-authoring/question-case-scope.json`.

Bij de stichtingvraag in het tentamen van 8 juni 2026 staat de volledige broncasus in beeld, inclusief de winst- en verliesgegevens van Duurzaam BV en de gegevens van Stichting Clothing. Deze gezamenlijke casus wordt niet ingekort.

De volledige oorspronkelijke casus en volledige brongetrouwe opmaak blijven in de vragenbank beschikbaar. De bestaande tentamen-PDF geeft toegang tot de oorspronkelijke opgave. Vragen, antwoordmodellen, bedragen en opgeslagen antwoorden worden niet gewijzigd.

Elke selectie is gebonden aan de hash van de oorspronkelijke casus. Geselecteerde passages moeten letterlijk, in dezelfde volgorde, in de bron staan. Een gewijzigde bron, onbekend blok of afwijkende passage blokkeert het opnieuw opbouwen. Expliciet gekoppelde eerdere deelvragen blijven bij de geselecteerde feiten staan.

Vervallen selecties worden bij een nieuwe import verwijderd. Opgeslagen pogingen krijgen de huidige weergave alleen als hun oorspronkelijke casustekst overeenkomt. Dit werkt eveneens bij gemengde onderwerp- en collegereeksen via het broncasus-ID. Als verschillende vragen dezelfde brontekst hebben maar verschillende selecties vereisen, wordt voor een onbekend ID geen selectie geraden.

Controle: regressietests voor volledige feitelijke casussen en het intrekken van oude selecties, een schone sitebuild en browsercontrole van alle 336 casusweergaven bij 1440 en 393 pixels. Opgeslagen tentamen- en gemengde pogingen behouden hun oorspronkelijke inhoud en antwoorden.

Bron: [BELRE3-tentamenbank en bronverwijzingen](https://github.com/HMA9K/BELRE3/blob/main/oefenen/content/exams.json).
