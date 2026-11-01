// Schema.org data for search engines, as a JSON-LD script. `<` is escaped so no text from the catalog can end the
// script early.
export default function StructuredData({ data }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
