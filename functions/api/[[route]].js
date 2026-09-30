import catalog from '../../assistant/server/catalog.generated.mjs';
import corpus from '../../assistant/sources/pages.json';
import {createSearch} from '../../assistant/server/retrieval.mjs';
import {handle} from '../../assistant/server/handler.mjs';
const search=createSearch(corpus);
export function onRequest(context){return handle(context,catalog,search);}
