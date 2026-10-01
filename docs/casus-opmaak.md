# Presentatie van oorspronkelijke tentamencasussen

De casussen in de 16 tentamens zijn afzonderlijk gelezen. De 336 vraagcontexten gebruiken 228 onderscheiden bronblokken. Een context kan meerdere casusdelen en eerdere deelvragen bevatten.

De opmaak staat in `content-authoring/case-presentation.json`. Koppen benoemen de gegeven situatie, bijvoorbeeld de groepsstructuur, financiering, overdracht en latere verkoop. Aangiftegegevens krijgen afzonderlijke tussenkoppen met behoud van de oorspronkelijke letters. Korte begripsvragen krijgen geen overbodige indeling. Bedragen, percentages en bepalende bronformuleringen krijgen beperkte nadruk. De tekst wordt niet vervangen door een opsomming of een antwoord op de vraag.

Afgebroken PDF-regels worden samengevoegd tot leesbare alinea’s. Zinnen die op een volgende PDF-pagina doorgaan, blijven één zin. Oorspronkelijke financiële tabellen worden als tabellen weergegeven. Dat levert 14 tabellen op in de verschillende vraagcontexten, inclusief herhaalde tabellen bij vervolgvragen. De tabellen blijven alleen leesbaar en schuiven horizontaal wanneer het casusvenster te smal is.

Bij vraag 19 van het tentamen van 11 juni 2024 waren de drie bronbalansen helemaal uit de tekstextractie weggevallen. Zij zijn teruggezet vanaf fysieke PDF-pagina 5. De review bevat de PDF-verwijzing en bestandscontrole voor iedere teruggezette tabel. Bij D2 BV blijft het fiscale vermogen van € 125.000 aan de debetzijde staan, zoals in de bron. Het wordt niet stilzwijgend naar de creditzijde verplaatst.

De oorspronkelijke `contentHtml`, vragen, oplossingen, casusafhankelijkheden en PDF-bestanden blijven behouden. `contentPresentationHtml` bevat uitsluitend de beoordeelde presentatie en afzonderlijk geregistreerde herstelde brongegevens. De import stopt bij onbekende bronblokken. Een controle vergelijkt ieder oorspronkelijk woord, getal en teken in zijn oorspronkelijke volgorde met de presentatie.

De renderer wordt gebruikt in het casuspaneel, het zwevende casusvenster en de casustab bij het nakijken. Bestaande pogingen en gemengde onderwerpentoetsen gebruiken de nieuwe opmaak wanneer hun oorspronkelijke casustekst overeenkomt. Hun opgeslagen antwoorden worden daarvoor niet herschreven.

## Controle

- Acht controles in `tests/test_case_presentation.py` slagen: volledige bronvolgorde, herbouw, gewijzigde bron, paginaovergangen, matrices, resultatenrekening, herstelde balansen en aantal tabelcellen.
- Drie controles in `tests/case-presentation.test.mjs` slagen voor bestaande pogingen, gemengde toetsen en gewijzigde casustekst.
- De bestaande controles voor antwoordmodellen en de complete publicatiebank slagen.
- Alle 336 casusweergaven zijn in de browser gecontroleerd op lege inhoud, afgebroken PDF-regels en horizontale overloop, op 1280 en 393 pixels schermbreedte. Er is geen overloop buiten de casuskaarten. Alle 14 tabellen hebben een eigen schuifgebied.
- Een bestaande poging uit 2014 toont de nieuwe koppen, nadruk en eerdere vraagtekst. Dezelfde presentatie verschijnt in het zwevende venster en bij het nakijken. De balansen uit 2025 hebben in de toetsomgeving geen invoervelden of dubbele schuifgebieden. Lettertype: Arial, met de bestaande sans-serif-terugval.
- De volledige Node-testreeks telt 81 controles: 78 slagen en dezelfde drie bestaande thematests falen. Deze wijziging betreft de casusweergave. Daarnaast meldde de volledige app bij het laden een fout bij het starten van een MutationObserver; de gewijzigde casusrenderer gebruikt geen MutationObserver. De afzonderlijke casuscontrolepagina meldt geen browserfouten.

Dit werk is onderdeel van de lokale wijzigingenbundel. Er is niets gepubliceerd of gepusht.
