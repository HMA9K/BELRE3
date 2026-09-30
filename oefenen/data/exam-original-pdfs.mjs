import {contentBase} from '../config.mjs';
const response = await fetch(new URL('sources.json', contentBase));
if (!response.ok) throw new Error('PDF-bronnen konden niet worden geladen.');
const sources = await response.json();
export const originalPdfs = Object.fromEntries(Object.values(sources).map(source => {
  const file = {...source, url: new URL(source.url, contentBase).href};
  return [source.id, {questions: file, solutions: file}];
}));
